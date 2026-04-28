package handlers

import (
	"net/http"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type TemplateHandler struct{}

func NewTemplateHandler() *TemplateHandler {
	return &TemplateHandler{}
}

func (h *TemplateHandler) List(c *gin.Context) {
	var templates []models.Template
	query := database.DB.Preload("LetterType")
	if ltID := c.Query("letter_type_id"); ltID != "" {
		query = query.Where("letter_type_id = ?", ltID)
	}
	if active := c.Query("is_active"); active != "" {
		query = query.Where("is_active = ?", active == "true")
	}
	query.Find(&templates)
	c.JSON(http.StatusOK, templates)
}

func (h *TemplateHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var tpl models.Template
	if err := database.DB.Preload("LetterType").First(&tpl, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}
	c.JSON(http.StatusOK, tpl)
}

func (h *TemplateHandler) Create(c *gin.Context) {
	var tpl models.Template
	if err := c.ShouldBindJSON(&tpl); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Create(&tpl).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, tpl)
}

func (h *TemplateHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var tpl models.Template
	if err := database.DB.First(&tpl, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Model(&tpl).Updates(req)
	c.JSON(http.StatusOK, tpl)
}

func (h *TemplateHandler) Delete(c *gin.Context) {
	database.DB.Delete(&models.Template{}, c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"message": "Template deleted"})
}

func (h *TemplateHandler) GetDefault(c *gin.Context) {
	letterTypeID := c.Param("letter_type_id")
	var tpl models.Template
	if err := database.DB.Where("letter_type_id = ? AND is_default = ? AND is_active = ?",
		letterTypeID, true, true).First(&tpl).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No default template found"})
		return
	}
	c.JSON(http.StatusOK, tpl)
}
