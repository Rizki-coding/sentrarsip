package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"earsip-backend/internal/config"
	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ArchiveHandler struct{}

func NewArchiveHandler() *ArchiveHandler {
	return &ArchiveHandler{}
}

func (h *ArchiveHandler) List(c *gin.Context) {
	var archives []models.Archive
	query := database.DB.Preload("Classification").Preload("LetterType").
		Preload("Creator").Preload("DocumentLocation").
		Preload("Urgency").Preload("SecurityLevel")

	if year := c.Query("year"); year != "" {
		query = query.Where("YEAR(letter_date) = ?", year)
	}
	if classID := c.Query("classification_id"); classID != "" {
		query = query.Where("classification_id = ?", classID)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if search := c.Query("search"); search != "" {
		query = query.Where("subject LIKE ? OR agenda_number LIKE ? OR origin LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Archive{}).Count(&total)
	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&archives)

	c.JSON(http.StatusOK, gin.H{
		"data": archives, "total": total, "page": page, "limit": limit,
	})
}

func (h *ArchiveHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var archive models.Archive
	if err := database.DB.Preload("Classification").Preload("LetterType").
		Preload("Creator").Preload("DocumentLocation").
		Preload("Urgency").Preload("SecurityLevel").First(&archive, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Archive not found"})
		return
	}
	c.JSON(http.StatusOK, archive)
}

func (h *ArchiveHandler) Create(c *gin.Context) {
	var archive models.Archive

	archive.AgendaNumber = c.PostForm("agenda_number")
	archive.Subject = c.PostForm("subject")
	archive.Origin = c.PostForm("origin")
	archive.Description = c.PostForm("description")
	archive.Status = "aktif"

	if classID, _ := strconv.ParseUint(c.PostForm("classification_id"), 10, 32); classID > 0 {
		archive.ClassificationID = uint(classID)
	}
	if ltID, _ := strconv.ParseUint(c.PostForm("letter_type_id"), 10, 32); ltID > 0 {
		archive.LetterTypeID = uint(ltID)
	}
	if urgID, _ := strconv.ParseUint(c.PostForm("urgency_id"), 10, 32); urgID > 0 {
		uid := uint(urgID)
		archive.UrgencyID = &uid
	}
	if slID, _ := strconv.ParseUint(c.PostForm("security_level_id"), 10, 32); slID > 0 {
		sid := uint(slID)
		archive.SecurityLevelID = &sid
	}
	if dlID, _ := strconv.ParseUint(c.PostForm("document_location_id"), 10, 32); dlID > 0 {
		did := uint(dlID)
		archive.DocumentLocationID = &did
	}

	if ld := c.PostForm("letter_date"); ld != "" {
		t, _ := time.Parse("2006-01-02", ld)
		archive.LetterDate = &t
	}
	if rd := c.PostForm("received_date"); rd != "" {
		t, _ := time.Parse("2006-01-02", rd)
		archive.ReceivedDate = &t
	}

	userID, _ := c.Get("userID")
	archive.CreatedBy = userID.(uint)

	// Handle file upload
	file, err := c.FormFile("file")
	if err == nil {
		ext := filepath.Ext(file.Filename)
		fileName := fmt.Sprintf("archive_%d_%s%s", time.Now().Unix(), uuid.New().String()[:8], ext)
		filePath := filepath.Join(config.AppConfig.UploadDir, "archives", fileName)
		if err := c.SaveUploadedFile(file, filePath); err == nil {
			archive.FilePath = filePath
		}
	}

	if err := database.DB.Create(&archive).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	database.DB.Preload("Classification").Preload("LetterType").Preload("Creator").First(&archive, archive.ID)
	c.JSON(http.StatusCreated, archive)
}

func (h *ArchiveHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var archive models.Archive
	if err := database.DB.First(&archive, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Archive not found"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Model(&archive).Updates(req)
	c.JSON(http.StatusOK, archive)
}

func (h *ArchiveHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.Archive{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Archive deleted"})
}

func (h *ArchiveHandler) Preview(c *gin.Context) {
	id := c.Param("id")
	var archive models.Archive
	if err := database.DB.First(&archive, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Archive not found"})
		return
	}
	if archive.FilePath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "No file attached"})
		return
	}
	c.Header("Content-Disposition", "inline")
	c.Header("Content-Type", "application/pdf")
	c.File(archive.FilePath)
}
