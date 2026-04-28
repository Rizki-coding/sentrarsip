package handlers

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"
	"earsip-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type LetterHandler struct{}

func NewLetterHandler() *LetterHandler {
	return &LetterHandler{}
}

type CreateLetterRequest struct {
	LetterTypeID    uint             `json:"letter_type_id" binding:"required"`
	TemplateID      *uint            `json:"template_id"`
	UrgencyID       *uint            `json:"urgency_id"`
	SecurityLevelID *uint            `json:"security_level_id"`
	Direction       string           `json:"direction" binding:"required"`
	Subject         string           `json:"subject" binding:"required"`
	ContentHTML     string           `json:"content_html"`
	LetterDate      string           `json:"letter_date"`
	CheckerIDs      []uint           `json:"checker_ids"`
	ApproverIDs     []uint           `json:"approver_ids"`
	PublisherID     uint             `json:"publisher_id"`
	Recipients      []RecipientInput `json:"recipients"`
}

type RecipientInput struct {
	RecipientType string `json:"recipient_type"`
	RecipientID   uint   `json:"recipient_id"`
	RecipientName string `json:"recipient_name"`
}

func (h *LetterHandler) List(c *gin.Context) {
	var letters []models.Letter
	query := database.DB.Preload("LetterType").Preload("Creator").Preload("Recipients").Preload("Checkers").Preload("Approvers")

	if direction := c.Query("direction"); direction != "" {
		query = query.Where("direction = ?", direction)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if ltIDs := c.Query("letter_type_ids"); ltIDs != "" {
		importStrings := strings.Split(ltIDs, ",")
		query = query.Where("letter_type_id IN ?", importStrings)
	} else if ltID := c.Query("letter_type_id"); ltID != "" {
		query = query.Where("letter_type_id = ?", ltID)
	}

	if search := c.Query("search"); search != "" {
		query = query.Where("subject LIKE ? OR letter_number LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Scope data by Level 1 Organization
	userID, _ := c.Get("userID")
	var currentUser models.User
	database.DB.First(&currentUser, userID)

	// Role and explicit list types
	role, _ := c.Get("role")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit
	var total int64

	if inbox := c.Query("inbox"); inbox == "true" {
		// Fetch letters where user is ANY checker/approver/publisher for relevant statuses
		query = query.Where(`
			(status = 'pending_review' AND letters.id IN (SELECT letter_id FROM letter_checkers WHERE user_id = ?)) OR
			(status = 'pending_sign' AND letters.id IN (SELECT letter_id FROM letter_approvers WHERE user_id = ?)) OR
			(status = 'signed' AND publisher_id = ?)
		`, userID, userID, userID)

		// Fetch all to apply Go-level exact index filtering (since many2many doesn't strictly order by ID in SQL)
		query.Order("letters.created_at DESC").Find(&letters)

		var filtered []models.Letter
		for _, l := range letters {
			isMyTurn := false
			if l.Status == "pending_review" && l.CurrentCheckerIndex < len(l.Checkers) {
				if l.Checkers[l.CurrentCheckerIndex].ID == userID.(uint) {
					isMyTurn = true
				}
			} else if l.Status == "pending_sign" && l.CurrentApproverIndex < len(l.Approvers) {
				if l.Approvers[l.CurrentApproverIndex].ID == userID.(uint) {
					isMyTurn = true
				}
			} else if l.Status == "signed" && l.PublisherID != nil && *l.PublisherID == userID.(uint) {
				isMyTurn = true
			}

			if isMyTurn || role.(string) == "superadmin" {
				filtered = append(filtered, l)
			}
		}

		total = int64(len(filtered))
		start := offset
		end := offset + limit
		if start > len(filtered) {
			start = len(filtered)
		}
		if end > len(filtered) {
			end = len(filtered)
		}
		letters = filtered[start:end]

	} else if tracking := c.Query("tracking"); tracking == "true" {
		// Letters created by this user that are currently in workflow
		query = query.Where("created_by = ? AND status NOT IN ('draft', 'published', 'musnah')", userID)
		query.Model(&models.Letter{}).Count(&total)
		query.Order("letters.created_at DESC").Limit(limit).Offset(offset).Find(&letters)

	} else {
		// Standard list: show ALL letters the user is involved in (historical data)
		if role.(string) != "superadmin" {
			whereClause := `(
				letters.created_by = ?
				OR letters.publisher_id = ?
				OR letters.id IN (SELECT letter_id FROM letter_checkers WHERE user_id = ?)
				OR letters.id IN (SELECT letter_id FROM letter_approvers WHERE user_id = ?)
				OR letters.id IN (SELECT letter_id FROM letter_recipients WHERE (recipient_type = 'personal' AND recipient_id = ?) OR (recipient_type = 'organization' AND recipient_id = ?))
			)`
			args := []interface{}{userID, userID, userID, userID, userID, currentUser.OrganizationID}
			query = query.Where(whereClause, args...)
		}
		query.Model(&models.Letter{}).Count(&total)
		query.Order("letters.created_at DESC").Limit(limit).Offset(offset).Find(&letters)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": letters, "total": total, "page": page, "limit": limit,
	})
}

func (h *LetterHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var letter models.Letter
	if err := database.DB.Preload("LetterType.LetterCategory").Preload("Creator").Preload("Recipients").
		Preload("WorkflowLogs.User").Preload("Template").Preload("Checkers").Preload("Approvers").
		Preload("Urgency").Preload("SecurityLevel").First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter not found"})
		return
	}
	c.JSON(http.StatusOK, letter)
}

func (h *LetterHandler) Create(c *gin.Context) {
	var req CreateLetterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")
	var letterDate *time.Time
	if req.LetterDate != "" {
		t, _ := time.Parse("2006-01-02", req.LetterDate)
		letterDate = &t
	}

	// Letter number will be generated on Sign (Approve)
	letterNumber := "-"

	letter := models.Letter{
		LetterNumber:    letterNumber,
		LetterTypeID:    req.LetterTypeID,
		TemplateID:      req.TemplateID,
		UrgencyID:       req.UrgencyID,
		SecurityLevelID: req.SecurityLevelID,
		Direction:       req.Direction,
		Subject:         req.Subject,
		ContentHTML:     req.ContentHTML,
		LetterDate:      letterDate,
		Status:          "draft",
		CreatedBy:       userID.(uint),
	}

	if req.PublisherID > 0 {
		letter.PublisherID = &req.PublisherID
	}
	if len(req.CheckerIDs) > 0 {
		database.DB.Find(&letter.Checkers, req.CheckerIDs)
	}
	if len(req.ApproverIDs) > 0 {
		database.DB.Find(&letter.Approvers, req.ApproverIDs)
	}

	if err := database.DB.Create(&letter).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Save recipients
	for _, r := range req.Recipients {
		recipient := models.LetterRecipient{
			LetterID:      letter.ID,
			RecipientType: r.RecipientType,
			RecipientID:   r.RecipientID,
			RecipientName: r.RecipientName,
		}
		database.DB.Create(&recipient)
	}

	// Log workflow
	database.DB.Create(&models.WorkflowLog{
		LetterID:   letter.ID,
		UserID:     userID.(uint),
		Action:     "create",
		FromStatus: "",
		ToStatus:   "draft",
		Comments:   "Surat dibuat",
	})

	database.DB.Preload("LetterType").Preload("Creator").Preload("Recipients").Preload("Checkers").Preload("Approvers").First(&letter, letter.ID)
	c.JSON(http.StatusCreated, letter)
}

func (h *LetterHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var letter models.Letter
	if err := database.DB.Preload("Checkers").Preload("Approvers").Preload("Recipients").First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter not found"})
		return
	}

	userID, _ := c.Get("userID")
	role, _ := c.Get("role")
	if letter.CreatedBy != userID.(uint) && role.(string) != "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya pembuat yang bisa mengedit surat"})
		return
	}

	if letter.Status != "draft" && letter.Status != "revision" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only edit draft or revision letters"})
		return
	}

	var req CreateLetterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var letterDate *time.Time
	if req.LetterDate != "" {
		t, _ := time.Parse("2006-01-02", req.LetterDate)
		letterDate = &t
	}

	updates := map[string]interface{}{
		"letter_type_id":    req.LetterTypeID,
		"urgency_id":       req.UrgencyID,
		"security_level_id": req.SecurityLevelID,
		"subject":          req.Subject,
		"content_html":     req.ContentHTML,
		"letter_date":      letterDate,
	}
	if req.PublisherID > 0 {
		updates["publisher_id"] = req.PublisherID
	} else {
		updates["publisher_id"] = nil
	}

	database.DB.Model(&letter).Updates(updates)

	// Update checkers
	if len(req.CheckerIDs) > 0 {
		var checkers []models.User
		database.DB.Find(&checkers, req.CheckerIDs)
		database.DB.Model(&letter).Association("Checkers").Replace(checkers)
	} else {
		database.DB.Model(&letter).Association("Checkers").Clear()
	}

	// Update approvers
	if len(req.ApproverIDs) > 0 {
		var approvers []models.User
		database.DB.Find(&approvers, req.ApproverIDs)
		database.DB.Model(&letter).Association("Approvers").Replace(approvers)
	} else {
		database.DB.Model(&letter).Association("Approvers").Clear()
	}

	// Update recipients
	if req.Recipients != nil {
		database.DB.Where("letter_id = ?", letter.ID).Delete(&models.LetterRecipient{})
		for _, r := range req.Recipients {
			recipient := models.LetterRecipient{
				LetterID:      letter.ID,
				RecipientType: r.RecipientType,
				RecipientID:   r.RecipientID,
				RecipientName: r.RecipientName,
			}
			database.DB.Create(&recipient)
		}
	}

	database.DB.Preload("LetterType").Preload("Creator").Preload("Recipients").Preload("Checkers").Preload("Approvers").First(&letter, letter.ID)
	c.JSON(http.StatusOK, letter)
}

// Submit: DRAFT/REVISION -> PENDING_REVIEW (first checker) or PENDING_SIGN (if no checkers)
func (h *LetterHandler) Submit(c *gin.Context) {
	id := c.Param("id")
	var letter models.Letter
	if err := database.DB.Preload("Checkers").Preload("Approvers").First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter not found"})
		return
	}
	if letter.Status != "draft" && letter.Status != "revision" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only submit draft or revision letters"})
		return
	}
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")
	if letter.CreatedBy != userID.(uint) && role.(string) != "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya pembuat yang bisa submit surat"})
		return
	}
	if len(letter.Approvers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Minimal 1 approver wajib ada sebelum submit"})
		return
	}
	oldStatus := letter.Status
	var toStatus string
	if len(letter.Checkers) > 0 {
		toStatus = "pending_review"
		database.DB.Model(&letter).Updates(map[string]interface{}{
			"status":                toStatus,
			"current_checker_index": 0,
		})
		services.CreateNotification(letter.Checkers[0].ID, "Surat Baru Perlu Direview",
			fmt.Sprintf("Surat '%s' menunggu review Anda (Checker #1)", letter.Subject),
			fmt.Sprintf("/letters/%d", letter.ID))
	} else {
		toStatus = "pending_sign"
		database.DB.Model(&letter).Updates(map[string]interface{}{
			"status":                 toStatus,
			"current_approver_index": 0,
		})
		services.CreateNotification(letter.Approvers[0].ID, "Surat Perlu Ditandatangani",
			fmt.Sprintf("Surat '%s' menunggu tanda tangan Anda", letter.Subject),
			fmt.Sprintf("/letters/%d", letter.ID))
	}
	database.DB.Create(&models.WorkflowLog{
		LetterID: letter.ID, UserID: userID.(uint), Action: "submit",
		FromStatus: oldStatus, ToStatus: toStatus, Comments: "Surat disubmit",
	})
	c.JSON(http.StatusOK, gin.H{"message": "submit successful", "new_status": toStatus})
}

// Review: PENDING_REVIEW -> move to next checker, or PENDING_SIGN, or REVISION (reject)
func (h *LetterHandler) Review(c *gin.Context) {
	var req struct {
		Action   string `json:"action" binding:"required"` // approve or reject
		Comments string `json:"comments"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := c.Param("id")
	var letter models.Letter
	if err := database.DB.Preload("Checkers").Preload("Approvers").First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter not found"})
		return
	}

	if letter.Status != "pending_review" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Letter is not pending review"})
		return
	}

	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// Verify this is the CURRENT checker (by index)
	currentIdx := letter.CurrentCheckerIndex
	if currentIdx >= len(letter.Checkers) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active checker for this letter"})
		return
	}
	currentChecker := letter.Checkers[currentIdx]
	if currentChecker.ID != userID.(uint) && role.(string) != "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": fmt.Sprintf("Sekarang giliran Checker #%d yang harus mereview surat ini", currentIdx+1)})
		return
	}

	if req.Action == "reject" {
		// Return to draft for revision
		database.DB.Model(&letter).Updates(map[string]interface{}{
			"status":                "revision",
			"current_checker_index": 0,
		})
		database.DB.Create(&models.WorkflowLog{
			LetterID:   letter.ID,
			UserID:     userID.(uint),
			Action:     "reject",
			FromStatus: "pending_review",
			ToStatus:   "revision",
			Comments:   req.Comments,
		})
		services.CreateNotification(letter.CreatedBy, "Surat Ditolak",
			fmt.Sprintf("Surat '%s' ditolak oleh checker. Catatan: %s", letter.Subject, req.Comments),
			fmt.Sprintf("/letters/%d", letter.ID))
		c.JSON(http.StatusOK, gin.H{"message": "Surat dikembalikan untuk revisi", "new_status": "revision"})
		return
	}

	// Approve: move to next checker or to pending_sign
	nextIdx := currentIdx + 1
	if nextIdx < len(letter.Checkers) {
		// Still more checkers remain
		database.DB.Model(&letter).Update("current_checker_index", nextIdx)
		database.DB.Create(&models.WorkflowLog{
			LetterID:   letter.ID,
			UserID:     userID.(uint),
			Action:     "approve",
			FromStatus: "pending_review",
			ToStatus:   "pending_review",
			Comments:   req.Comments,
		})
		// Notify next checker
		nextChecker := letter.Checkers[nextIdx]
		services.CreateNotification(nextChecker.ID, "Surat Perlu Direview",
			fmt.Sprintf("Surat '%s' menunggu review Anda (Checker #%d)", letter.Subject, nextIdx+1),
			fmt.Sprintf("/letters/%d", letter.ID))
		c.JSON(http.StatusOK, gin.H{"message": "Review disetujui, dilanjutkan ke checker berikutnya", "new_status": "pending_review"})
	} else {
		// All checkers done → go to first approver
		database.DB.Model(&letter).Updates(map[string]interface{}{
			"status":                 "pending_sign",
			"current_approver_index": 0,
		})
		database.DB.Create(&models.WorkflowLog{
			LetterID:   letter.ID,
			UserID:     userID.(uint),
			Action:     "approve",
			FromStatus: "pending_review",
			ToStatus:   "pending_sign",
			Comments:   req.Comments,
		})
		// Notify first approver
		if len(letter.Approvers) > 0 {
			services.CreateNotification(letter.Approvers[0].ID, "Surat Perlu Ditandatangani",
				fmt.Sprintf("Surat '%s' menunggu tanda tangan Anda", letter.Subject),
				fmt.Sprintf("/letters/%d", letter.ID))
		}
		c.JSON(http.StatusOK, gin.H{"message": "Semua checker selesai, diteruskan ke approver", "new_status": "pending_sign"})
	}
}

// Sign: PENDING_SIGN -> next approver or SIGNED (last approver, generates QR)
func (h *LetterHandler) Sign(c *gin.Context) {
	id := c.Param("id")
	var letter models.Letter
	if err := database.DB.Preload("Approvers").First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter not found"})
		return
	}
	if letter.Status != "pending_sign" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Letter is not pending signature"})
		return
	}
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")
	currentIdx := letter.CurrentApproverIndex
	if currentIdx >= len(letter.Approvers) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active approver for this letter"})
		return
	}
	currentApprover := letter.Approvers[currentIdx]
	if currentApprover.ID != userID.(uint) && role.(string) != "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": fmt.Sprintf("Sekarang giliran Approver #%d yang harus menandatangani", currentIdx+1)})
		return
	}
	var signer models.User
	database.DB.Preload("Position").First(&signer, userID)
	nextIdx := currentIdx + 1
	if nextIdx < len(letter.Approvers) {
		database.DB.Model(&letter).Update("current_approver_index", nextIdx)
		database.DB.Create(&models.WorkflowLog{
			LetterID: letter.ID, UserID: signer.ID, Action: "sign",
			FromStatus: "pending_sign", ToStatus: "pending_sign",
			Comments: fmt.Sprintf("Ditandatangani oleh Approver #%d", currentIdx+1),
		})
		services.CreateNotification(letter.Approvers[nextIdx].ID, "Surat Perlu Ditandatangani",
			fmt.Sprintf("Surat '%s' menunggu tanda tangan Anda (Approver #%d)", letter.Subject, nextIdx+1),
			fmt.Sprintf("/letters/%d", letter.ID))
		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Signed by approver #%d", currentIdx+1), "new_status": "pending_sign"})
		return
	}
	if letter.LetterNumber == "-" || letter.LetterNumber == "" {
		var count int64
		database.DB.Model(&models.Letter{}).Where("YEAR(created_at) = ? AND letter_number != '-' AND letter_number != ''", time.Now().Year()).Count(&count)
		var lt models.LetterType
		database.DB.First(&lt, letter.LetterTypeID)
		letter.LetterNumber = fmt.Sprintf("%03d/%s/%s/%d", count+1, lt.Code, "DISKOMINFO", time.Now().Year())
		now := time.Now()
		letter.LetterDate = &now
	}
	qrPath, err := services.GenerateQRCode(&letter, &signer, signer.Position.Name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate QR code: " + err.Error()})
		return
	}
	qrData, _ := os.ReadFile(qrPath)
	qrBase64 := base64.StdEncoding.EncodeToString(qrData)
	qrImgTag := fmt.Sprintf(`<img src="data:image/png;base64,%s" width="150" height="150" alt="QR Code Tanda Tangan Digital"/>`, qrBase64)
	contentHTML := services.RenderTemplate(letter.ContentHTML, map[string]string{"qrcode": qrImgTag})
	database.DB.Model(&letter).Updates(map[string]interface{}{
		"status": "signed", "qr_code_path": qrPath, "content_html": contentHTML,
		"letter_number": letter.LetterNumber, "letter_date": letter.LetterDate,
	})
	database.DB.Create(&models.WorkflowLog{
		LetterID: letter.ID, UserID: signer.ID, Action: "sign",
		FromStatus: "pending_sign", ToStatus: "signed",
		Comments: "Surat ditandatangani secara digital",
	})
	if letter.PublisherID != nil {
		services.CreateNotification(*letter.PublisherID, "Surat Siap Dipublikasi",
			fmt.Sprintf("Surat '%s' telah ditandatangani dan siap dipublikasi", letter.Subject),
			fmt.Sprintf("/letters/%d", letter.ID))
		c.JSON(http.StatusOK, gin.H{"message": "Letter signed successfully", "qr_code_path": qrPath})
	} else {
		// No publisher set — auto-publish the letter
		database.DB.Model(&letter).Update("status", "published")
		database.DB.Create(&models.WorkflowLog{
			LetterID: letter.ID, UserID: signer.ID, Action: "publish",
			FromStatus: "signed", ToStatus: "published",
			Comments: "Diterbitkan otomatis (tanpa publisher)",
		})
		// Notify creator
		services.CreateNotification(letter.CreatedBy, "Surat Telah Dipublikasi",
			fmt.Sprintf("Surat '%s' telah berhasil dipublikasi", letter.Subject),
			fmt.Sprintf("/letters/%d", letter.ID))
		// Notify recipients
		var recipients []models.LetterRecipient
		database.DB.Where("letter_id = ?", letter.ID).Find(&recipients)
		for _, r := range recipients {
			if r.RecipientType == "personal" {
				services.CreateNotification(r.RecipientID, "Surat Baru Diterima",
					fmt.Sprintf("Surat '%s' telah diterbitkan dan ditujukan kepada Anda", letter.Subject),
					fmt.Sprintf("/letters/%d", letter.ID))
			}
		}
		// Auto-archive
		letterIDVal := letter.ID
		var existingArchive models.Archive
		if database.DB.Where("letter_id = ?", letterIDVal).First(&existingArchive).Error != nil {
			var archiveCount int64
			database.DB.Model(&models.Archive{}).Where("YEAR(created_at) = ?", time.Now().Year()).Count(&archiveCount)
			agendaNumber := fmt.Sprintf("AGD-%d-%04d", time.Now().Year(), archiveCount+1)
			var defaultClassification models.Classification
			database.DB.First(&defaultClassification)
			now := time.Now()
			archive := models.Archive{
				AgendaNumber: agendaNumber, DocumentNumber: letter.LetterNumber,
				LetterID: &letterIDVal, ClassificationID: defaultClassification.ID,
				LetterTypeID: letter.LetterTypeID, UrgencyID: letter.UrgencyID,
				SecurityLevelID: letter.SecurityLevelID, Origin: "Internal",
				Subject: letter.Subject, LetterDate: letter.LetterDate, ReceivedDate: &now,
				Description: fmt.Sprintf("Arsip otomatis dari surat %s yang diterbitkan pada %s", letter.LetterNumber, now.Format("02-01-2006 15:04")),
				CreatedBy: signer.ID, Status: "aktif",
			}
			database.DB.Create(&archive)
		}
		c.JSON(http.StatusOK, gin.H{"message": "Letter signed and auto-published", "qr_code_path": qrPath, "new_status": "published"})
	}
}

// Publish: SIGNED -> PUBLISHED
func (h *LetterHandler) Publish(c *gin.Context) {
	h.transitionStatus(c, []string{"signed"}, "published", "publish", "Surat dipublikasikan")
}

// Revise: PENDING_SIGN -> REVISION (approver sends back to maker for revision)
func (h *LetterHandler) Revise(c *gin.Context) {
	var req struct {
		Comments string `json:"comments" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Catatan revisi wajib diisi"})
		return
	}

	id := c.Param("id")
	var letter models.Letter
	if err := database.DB.Preload("Approvers").First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter not found"})
		return
	}
	if letter.Status != "pending_sign" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Revisi hanya bisa dilakukan saat status pending_sign"})
		return
	}

	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	// Only the current approver (last approver) can revise
	currentIdx := letter.CurrentApproverIndex
	if currentIdx >= len(letter.Approvers) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active approver"})
		return
	}
	currentApprover := letter.Approvers[currentIdx]
	if currentApprover.ID != userID.(uint) && role.(string) != "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": fmt.Sprintf("Hanya Approver #%d yang bisa merevisi", currentIdx+1)})
		return
	}

	database.DB.Model(&letter).Updates(map[string]interface{}{
		"status":                 "revision",
		"current_checker_index":  0,
		"current_approver_index": 0,
	})
	database.DB.Create(&models.WorkflowLog{
		LetterID:   letter.ID,
		UserID:     userID.(uint),
		Action:     "revise",
		FromStatus: "pending_sign",
		ToStatus:   "revision",
		Comments:   req.Comments,
	})
	services.CreateNotification(letter.CreatedBy, "Surat Perlu Direvisi",
		fmt.Sprintf("Surat '%s' perlu direvisi. Catatan: %s", letter.Subject, req.Comments),
		fmt.Sprintf("/letters/%d", letter.ID))
	c.JSON(http.StatusOK, gin.H{"message": "Surat dikembalikan untuk revisi", "new_status": "revision"})
}

// ReceivedLetters: get letters where current user is a recipient
func (h *LetterHandler) ReceivedLetters(c *gin.Context) {
	userID, _ := c.Get("userID")
	var currentUser models.User
	database.DB.First(&currentUser, userID)

	var letters []models.Letter
	query := database.DB.
		Preload("LetterType.LetterCategory").Preload("Creator").Preload("Creator.Position").
		Preload("Publisher").Preload("Recipients").
		Preload("Checkers").Preload("Approvers").
		Joins("JOIN letter_recipients lr ON lr.letter_id = letters.id").
		Where("lr.recipient_type = 'personal' AND lr.recipient_id = ? AND letters.status = 'published'", userID)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Letter{}).Count(&total)
	query.Order("letters.created_at DESC").Limit(limit).Offset(offset).Find(&letters)

	c.JSON(http.StatusOK, gin.H{"data": letters, "total": total, "page": page, "limit": limit})
}

func (h *LetterHandler) transitionStatus(c *gin.Context, fromStatuses []string, toStatus, action, comment string) {
	id := c.Param("id")
	var letter models.Letter
	if err := database.DB.Preload("Checkers").Preload("Approvers").Preload("LetterType").First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter not found"})
		return
	}

	validFrom := false
	for _, s := range fromStatuses {
		if letter.Status == s {
			validFrom = true
			break
		}
	}
	if !validFrom {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Cannot %s from status: %s", action, letter.Status)})
		return
	}

	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	if action == "submit" && letter.CreatedBy != userID.(uint) {
		if role.(string) != "superadmin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya pembuat yang bisa submit surat"})
			return
		}
	}
	if action == "publish" && (letter.PublisherID == nil || *letter.PublisherID != userID.(uint)) {
		if role.(string) != "superadmin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya publisher yang ditunjuk yang bisa mempublikasi"})
			return
		}
	}

	oldStatus := letter.Status
	database.DB.Model(&letter).Update("status", toStatus)

	database.DB.Create(&models.WorkflowLog{
		LetterID:   letter.ID,
		UserID:     userID.(uint),
		Action:     action,
		FromStatus: oldStatus,
		ToStatus:   toStatus,
		Comments:   comment,
	})

	// Notifications based on action
	switch action {
	case "submit":
		if toStatus == "pending_review" {
			for _, checker := range letter.Checkers {
				services.CreateNotification(checker.ID, "Surat Baru Perlu Direview",
					fmt.Sprintf("Surat '%s' menunggu review Anda", letter.Subject),
					fmt.Sprintf("/letters/%d", letter.ID))
			}
		} else if toStatus == "pending_sign" {
			for _, approver := range letter.Approvers {
				services.CreateNotification(approver.ID, "Surat Perlu Ditandatangani",
					fmt.Sprintf("Surat '%s' menunggu tanda tangan Anda", letter.Subject),
					fmt.Sprintf("/letters/%d", letter.ID))
			}
		}
	case "publish":
		services.CreateNotification(letter.CreatedBy, "Surat Telah Dipublikasi",
			fmt.Sprintf("Surat '%s' telah berhasil dipublikasi", letter.Subject),
			fmt.Sprintf("/letters/%d", letter.ID))
		// Notify all recipients
		var recipients []models.LetterRecipient
		database.DB.Where("letter_id = ?", letter.ID).Find(&recipients)
		for _, r := range recipients {
			if r.RecipientType == "personal" {
				services.CreateNotification(r.RecipientID, "Surat Baru Diterima",
					fmt.Sprintf("Surat '%s' telah diterbitkan dan ditujukan kepada Anda", letter.Subject),
					fmt.Sprintf("/letters/%d", letter.ID))
			}
		}

		// Auto-archive: create archive record from published letter
		var existingArchive models.Archive
		letterIDVal := letter.ID
		if database.DB.Where("letter_id = ?", letterIDVal).First(&existingArchive).Error != nil {
			// Generate agenda number
			var archiveCount int64
			database.DB.Model(&models.Archive{}).Where("YEAR(created_at) = ?", time.Now().Year()).Count(&archiveCount)
			agendaNumber := fmt.Sprintf("AGD-%d-%04d", time.Now().Year(), archiveCount+1)

			// Get first classification if available
			var defaultClassification models.Classification
			database.DB.First(&defaultClassification)

			now := time.Now()
			archive := models.Archive{
				AgendaNumber:     agendaNumber,
				DocumentNumber:   letter.LetterNumber,
				LetterID:         &letterIDVal,
				ClassificationID: defaultClassification.ID,
				LetterTypeID:     letter.LetterTypeID,
				UrgencyID:        letter.UrgencyID,
				SecurityLevelID:  letter.SecurityLevelID,
				Origin:           "Internal",
				Subject:          letter.Subject,
				LetterDate:       letter.LetterDate,
				ReceivedDate:     &now,
				Description:      fmt.Sprintf("Arsip otomatis dari surat %s yang diterbitkan pada %s", letter.LetterNumber, now.Format("02-01-2006 15:04")),
				CreatedBy:        userID.(uint),
				Status:           "aktif",
			}
			database.DB.Create(&archive)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": action + " successful", "new_status": toStatus})
}

func (h *LetterHandler) History(c *gin.Context) {
	id := c.Param("id")
	var logs []models.WorkflowLog
	database.DB.Preload("User").Where("letter_id = ?", id).Order("created_at ASC").Find(&logs)
	c.JSON(http.StatusOK, logs)
}

// WorkflowSteps returns the full workflow pipeline with status for each step
type WorkflowStep struct {
	Order      int        `json:"order"`
	Role       string     `json:"role"`       // maker, checker, approver, publisher
	UserID     uint       `json:"user_id"`
	UserName   string     `json:"user_name"`
	Status     string     `json:"status"`     // done, current, waiting
	Action     string     `json:"action"`     // create, approve, sign, publish, reject, revise
	Comments   string     `json:"comments"`
	ActionAt   *time.Time `json:"action_at"`
}

func (h *LetterHandler) WorkflowSteps(c *gin.Context) {
	id := c.Param("id")
	var letter models.Letter
	if err := database.DB.Preload("Creator").Preload("Checkers").Preload("Approvers").Preload("Publisher").First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter not found"})
		return
	}

	// Get all workflow logs
	var allLogs []models.WorkflowLog
	database.DB.Preload("User").Where("letter_id = ?", id).Order("created_at ASC").Find(&allLogs)

	// Find the last submit log to determine the current cycle
	// Only logs AFTER the last submit count for step completion
	var cycleStartIdx int
	for i, log := range allLogs {
		if log.Action == "submit" {
			cycleStartIdx = i
		}
	}

	// Current cycle logs = logs from last submit onward
	var cycleLogs []models.WorkflowLog
	if len(allLogs) > 0 {
		cycleLogs = allLogs[cycleStartIdx:]
	}

	var steps []WorkflowStep
	order := 1

	// Step 1: Maker (creator)
	makerStep := WorkflowStep{
		Order:    order,
		Role:     "maker",
		UserID:   letter.CreatedBy,
		UserName: letter.Creator.FullName,
		Status:   "waiting",
		Action:   "create",
	}

	// If letter has been submitted (current cycle), maker is done
	// If letter is in revision/draft, maker needs to act again
	if letter.Status == "draft" {
		// Check if letter was ever submitted (has submit logs)
		hasBeenSubmitted := false
		for _, log := range allLogs {
			if log.Action == "submit" {
				hasBeenSubmitted = true
				break
			}
		}
		if hasBeenSubmitted {
			makerStep.Status = "current"
			makerStep.Action = "revision"
			makerStep.Comments = "Surat dikembalikan untuk diperbaiki"
		} else {
			makerStep.Status = "current"
		}
		// Find creation time
		for _, log := range allLogs {
			if log.Action == "create" {
				t := log.CreatedAt
				makerStep.ActionAt = &t
			}
		}
	} else if letter.Status == "revision" {
		makerStep.Status = "current"
		makerStep.Action = "revision"
		// Find the revise/reject log that caused the revision
		for i := len(allLogs) - 1; i >= 0; i-- {
			if allLogs[i].Action == "revise" || allLogs[i].Action == "reject" {
				makerStep.Comments = fmt.Sprintf("Direvisi oleh %s: %s", allLogs[i].User.FullName, allLogs[i].Comments)
				break
			}
		}
		for _, log := range allLogs {
			if log.Action == "create" {
				t := log.CreatedAt
				makerStep.ActionAt = &t
			}
		}
	} else {
		// Letter has been submitted in current cycle
		makerStep.Status = "done"
		for _, log := range cycleLogs {
			if log.Action == "submit" {
				t := log.CreatedAt
				makerStep.ActionAt = &t
				makerStep.Action = "submit"
				makerStep.Comments = log.Comments
			}
		}
	}
	steps = append(steps, makerStep)
	order++

	// Steps: Checkers
	for i, checker := range letter.Checkers {
		step := WorkflowStep{
			Order:    order,
			Role:     "checker",
			UserID:   checker.ID,
			UserName: checker.FullName,
			Status:   "waiting",
		}

		// Only check current cycle logs (skip if letter is in revision/draft)
		if letter.Status != "draft" && letter.Status != "revision" {
			for _, log := range cycleLogs {
				if log.UserID == checker.ID && (log.Action == "approve" || log.Action == "reject") && log.FromStatus == "pending_review" {
					t := log.CreatedAt
					step.Status = "done"
					step.Action = log.Action
					step.Comments = log.Comments
					step.ActionAt = &t
					break
				}
			}

			// If not done, check if it's the current step
			if step.Status == "waiting" && letter.Status == "pending_review" && i == letter.CurrentCheckerIndex {
				step.Status = "current"
			}
		}

		steps = append(steps, step)
		order++
	}

	// Steps: Approvers
	for i, approver := range letter.Approvers {
		step := WorkflowStep{
			Order:    order,
			Role:     "approver",
			UserID:   approver.ID,
			UserName: approver.FullName,
			Status:   "waiting",
		}

		// Only check current cycle logs
		if letter.Status != "draft" && letter.Status != "revision" {
			for _, log := range cycleLogs {
				if log.UserID == approver.ID && (log.Action == "sign" || log.Action == "revise") && log.FromStatus == "pending_sign" {
					t := log.CreatedAt
					step.Status = "done"
					step.Action = log.Action
					step.Comments = log.Comments
					step.ActionAt = &t
					break
				}
			}

			// If not done, check if it's the current step
			if step.Status == "waiting" && letter.Status == "pending_sign" && i == letter.CurrentApproverIndex {
				step.Status = "current"
			}
		}

		steps = append(steps, step)
		order++
	}

	// Step: Publisher
	if letter.PublisherID != nil && letter.Publisher != nil {
		step := WorkflowStep{
			Order:    order,
			Role:     "publisher",
			UserID:   *letter.PublisherID,
			UserName: letter.Publisher.FullName,
			Status:   "waiting",
		}

		if letter.Status != "draft" && letter.Status != "revision" {
			for _, log := range cycleLogs {
				if log.Action == "publish" {
					t := log.CreatedAt
					step.Status = "done"
					step.Action = "publish"
					step.Comments = log.Comments
					step.ActionAt = &t
					break
				}
			}

			if step.Status == "waiting" && letter.Status == "signed" {
				step.Status = "current"
			}
		}

		steps = append(steps, step)
	}

	// Count revision cycles
	revisionCount := 0
	for _, log := range allLogs {
		if log.Action == "revise" || (log.Action == "reject" && log.ToStatus == "revision") {
			revisionCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"steps":           steps,
		"current_status":  letter.Status,
		"revision_count":  revisionCount,
		"logs":            allLogs,
	})
}

// ActionCount returns the count of letters needing action by the current user
func (h *LetterHandler) ActionCount(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("role")

	var letters []models.Letter
	database.DB.Preload("Checkers").Preload("Approvers").
		Where(`
			(status = 'pending_review' AND letters.id IN (SELECT letter_id FROM letter_checkers WHERE user_id = ?)) OR
			(status = 'pending_sign' AND letters.id IN (SELECT letter_id FROM letter_approvers WHERE user_id = ?)) OR
			(status = 'signed' AND publisher_id = ?)
		`, userID, userID, userID).
		Find(&letters)

	count := 0
	for _, l := range letters {
		isMyTurn := false
		if l.Status == "pending_review" && l.CurrentCheckerIndex < len(l.Checkers) {
			if l.Checkers[l.CurrentCheckerIndex].ID == userID.(uint) {
				isMyTurn = true
			}
		} else if l.Status == "pending_sign" && l.CurrentApproverIndex < len(l.Approvers) {
			if l.Approvers[l.CurrentApproverIndex].ID == userID.(uint) {
				isMyTurn = true
			}
		} else if l.Status == "signed" && l.PublisherID != nil && *l.PublisherID == userID.(uint) {
			isMyTurn = true
		}
		if isMyTurn || role.(string) == "superadmin" {
			count++
		}
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *LetterHandler) Preview(c *gin.Context) {
	id := c.Param("id")
	var letter models.Letter
	if err := database.DB.Preload("LetterType").Preload("Template").Preload("Creator.Position").Preload("Checkers").Preload("Approvers").First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter not found"})
		return
	}

	content := letter.ContentHTML

	// Handle Date
	dateStr := "-"
	if letter.LetterDate != nil {
		dateStr = letter.LetterDate.Format("02 January 2006")
	}

	// Build variables map
	vars := map[string]string{
		"nomor_surat":      letter.LetterNumber,
		"tanggal":          dateStr,
		"perihal":          letter.Subject,
		"pengirim":         letter.Creator.FullName,
		"jabatan_pengirim": letter.Creator.Position.Name,
		// default empty qrcode for preview
		"qrcode": "",
	}

	// Apply string replacements
	for k, v := range vars {
		placeholder := fmt.Sprintf("${%s}", k)
		content = strings.ReplaceAll(content, placeholder, v)
	}

	// Return rendered HTML wrapped in a basic document
	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Preview Surat</title>
	<style>
		body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.5; color: #000; background: #fff; max-width: 800px; margin: 0 auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
	</style>
</head>
<body>
	%s
</body>
</html>`, content)

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}

// DashboardStats returns statistics for the dashboard charts
func (h *LetterHandler) DashboardStats(c *gin.Context) {
	// 1. Count by status
	type StatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	var statusCounts []StatusCount
	database.DB.Model(&models.Letter{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&statusCounts)

	// 2. Monthly trend (last 6 months)
	type MonthCount struct {
		Month string `json:"month"`
		Count int64  `json:"count"`
	}
	var monthlyCounts []MonthCount
	sixMonthsAgo := time.Now().AddDate(0, -6, 0)
	database.DB.Model(&models.Letter{}).
		Select("DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count").
		Where("created_at >= ?", sixMonthsAgo).
		Group("month").
		Order("month ASC").
		Scan(&monthlyCounts)

	// 3. Count by organization
	type OrgCount struct {
		OrgName string `json:"org_name"`
		Count   int64  `json:"count"`
	}
	var orgCounts []OrgCount
	database.DB.Model(&models.Letter{}).
		Select("COALESCE(organizations.name, 'Tanpa Organisasi') as org_name, COUNT(*) as count").
		Joins("LEFT JOIN users ON users.id = letters.created_by").
		Joins("LEFT JOIN organizations ON organizations.id = users.organization_id").
		Group("org_name").
		Order("count DESC").
		Scan(&orgCounts)

	c.JSON(http.StatusOK, gin.H{
		"by_status":       statusCounts,
		"by_month":        monthlyCounts,
		"by_organization": orgCounts,
	})
}
