package handlers

import (
	"net/http"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type OrgHandler struct{}

func NewOrgHandler() *OrgHandler {
	return &OrgHandler{}
}

func (h *OrgHandler) List(c *gin.Context) {
	var orgs []models.Organization
	database.DB.Where("parent_id IS NULL").Preload("Children.Children").Find(&orgs)
	c.JSON(http.StatusOK, orgs)
}

func (h *OrgHandler) ListFlat(c *gin.Context) {
	var orgs []models.Organization
	database.DB.Find(&orgs)
	c.JSON(http.StatusOK, orgs)
}

func (h *OrgHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var org models.Organization
	if err := database.DB.Preload("Children").Preload("Parent").First(&org, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}
	c.JSON(http.StatusOK, org)
}

func (h *OrgHandler) Create(c *gin.Context) {
	var org models.Organization
	if err := c.ShouldBindJSON(&org); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Create(&org).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, org)
}

func (h *OrgHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var org models.Organization
	if err := database.DB.First(&org, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}
	var req models.Organization
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Model(&org).Updates(map[string]interface{}{
		"name":        req.Name,
		"code":        req.Code,
		"parent_id":   req.ParentID,
		"description": req.Description,
	})
	c.JSON(http.StatusOK, org)
}

func (h *OrgHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.Organization{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Organization deleted"})
}

// Position Handler
type PositionHandler struct{}

func NewPositionHandler() *PositionHandler {
	return &PositionHandler{}
}

func (h *PositionHandler) List(c *gin.Context) {
	var positions []models.Position
	query := database.DB.Preload("Organization").Preload("Parent")
	if orgID := c.Query("organization_id"); orgID != "" {
		query = query.Where("organization_id = ?", orgID)
	}
	query.Find(&positions)
	c.JSON(http.StatusOK, positions)
}

func (h *PositionHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var pos models.Position
	if err := database.DB.Preload("Organization").First(&pos, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Position not found"})
		return
	}
	c.JSON(http.StatusOK, pos)
}

func (h *PositionHandler) Create(c *gin.Context) {
	var pos models.Position
	if err := c.ShouldBindJSON(&pos); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := database.DB.Create(&pos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, pos)
}

func (h *PositionHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var pos models.Position
	if err := database.DB.First(&pos, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Position not found"})
		return
	}
	if err := c.ShouldBindJSON(&pos); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Save(&pos)
	c.JSON(http.StatusOK, pos)
}

func (h *PositionHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	database.DB.Delete(&models.Position{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Position deleted"})
}
