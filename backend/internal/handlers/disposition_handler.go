package handlers

import (
	"net/http"
	"strconv"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type DispositionHandler struct{}

func NewDispositionHandler() *DispositionHandler { return &DispositionHandler{} }

func (h *DispositionHandler) List(c *gin.Context) {
	var dispositions []models.Disposition
	query := database.DB.Preload("Letter.LetterType").Preload("FromUser").Preload("ToUser")

	userID, _ := c.Get("userID")
	if direction := c.Query("direction"); direction == "sent" {
		query = query.Where("from_user_id = ?", userID)
	} else {
		query = query.Where("to_user_id = ?", userID)
	}

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Disposition{}).Count(&total)
	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&dispositions)

	c.JSON(http.StatusOK, gin.H{"data": dispositions, "total": total, "page": page, "limit": limit})
}

func (h *DispositionHandler) ListByLetter(c *gin.Context) {
	letterID := c.Param("id")
	var dispositions []models.Disposition
	database.DB.Preload("FromUser").Preload("ToUser").
		Where("letter_id = ?", letterID).Order("created_at DESC").Find(&dispositions)
	c.JSON(http.StatusOK, dispositions)
}

func (h *DispositionHandler) Create(c *gin.Context) {
	var disp models.Disposition
	if err := c.ShouldBindJSON(&disp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")
	disp.FromUserID = userID.(uint)
	disp.Status = "pending"

	if err := database.DB.Create(&disp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Notify target user
	var fromUser models.User
	database.DB.First(&fromUser, disp.FromUserID)
	var letter models.Letter
	database.DB.First(&letter, disp.LetterID)

	notification := models.Notification{
		UserID:  disp.ToUserID,
		Title:   "Disposisi Baru",
		Message: fromUser.FullName + " mendisposisikan surat: " + letter.Subject,
		Link:    "/dispositions",
	}
	database.DB.Create(&notification)

	database.DB.Preload("Letter").Preload("FromUser").Preload("ToUser").First(&disp, disp.ID)
	c.JSON(http.StatusCreated, disp)
}

func (h *DispositionHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var disp models.Disposition
	if err := database.DB.First(&disp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Disposition not found"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Model(&disp).Update("status", req.Status)
	c.JSON(http.StatusOK, gin.H{"message": "Disposition updated"})
}
