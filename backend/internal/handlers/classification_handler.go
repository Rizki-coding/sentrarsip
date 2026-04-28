package handlers

import (
	"net/http"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type ClassificationHandler struct{}

func NewClassificationHandler() *ClassificationHandler {
	return &ClassificationHandler{}
}

func (h *ClassificationHandler) ListTree(c *gin.Context) {
	var classes []models.Classification
	database.DB.Where("parent_id IS NULL").Preload("Children.Children").Find(&classes)
	c.JSON(http.StatusOK, classes)
}

func (h *ClassificationHandler) ListFlat(c *gin.Context) {
	var classes []models.Classification
	database.DB.Find(&classes)
	c.JSON(http.StatusOK, classes)
}

func (h *ClassificationHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var class models.Classification
	if err := database.DB.Preload("Children").First(&class, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Classification not found"})
		return
	}
	c.JSON(http.StatusOK, class)
}

func (h *ClassificationHandler) Create(c *gin.Context) {
	var class models.Classification
	if err := c.ShouldBindJSON(&class); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Create(&class).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, class)
}

func (h *ClassificationHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var class models.Classification
	if err := database.DB.First(&class, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Classification not found"})
		return
	}
	if err := c.ShouldBindJSON(&class); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&class)
	c.JSON(http.StatusOK, class)
}

func (h *ClassificationHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.Classification{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Classification deleted"})
}
