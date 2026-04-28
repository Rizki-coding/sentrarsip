package handlers

import (
	"net/http"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type LetterCategoryHandler struct{}

func NewLetterCategoryHandler() *LetterCategoryHandler { return &LetterCategoryHandler{} }

func (h *LetterCategoryHandler) List(c *gin.Context) {
	var categories []models.LetterCategory
	database.DB.Order("name ASC").Find(&categories)
	c.JSON(http.StatusOK, categories)
}

func (h *LetterCategoryHandler) Create(c *gin.Context) {
	var cat models.LetterCategory
	if err := c.ShouldBindJSON(&cat); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Create(&cat).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, cat)
}

func (h *LetterCategoryHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var cat models.LetterCategory
	if err := database.DB.First(&cat, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}
	var req map[string]interface{}
	c.ShouldBindJSON(&req)
	database.DB.Model(&cat).Updates(req)
	c.JSON(http.StatusOK, cat)
}

func (h *LetterCategoryHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.LetterCategory{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
