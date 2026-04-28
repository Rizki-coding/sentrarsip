package handlers

import (
	"net/http"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// Letter Type Handler
type LetterTypeHandler struct{}

func NewLetterTypeHandler() *LetterTypeHandler {
	return &LetterTypeHandler{}
}

func (h *LetterTypeHandler) List(c *gin.Context) {
	var types []models.LetterType
	database.DB.Find(&types)
	c.JSON(http.StatusOK, types)
}

func (h *LetterTypeHandler) Create(c *gin.Context) {
	var lt models.LetterType
	if err := c.ShouldBindJSON(&lt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&lt)
	c.JSON(http.StatusCreated, lt)
}

func (h *LetterTypeHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var lt models.LetterType
	if err := database.DB.First(&lt, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}
	c.ShouldBindJSON(&lt)
	database.DB.Save(&lt)
	c.JSON(http.StatusOK, lt)
}

func (h *LetterTypeHandler) Delete(c *gin.Context) {
	database.DB.Delete(&models.LetterType{}, c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

// Urgency Handler
type UrgencyHandler struct{}

func NewUrgencyHandler() *UrgencyHandler { return &UrgencyHandler{} }

func (h *UrgencyHandler) List(c *gin.Context) {
	var items []models.Urgency
	database.DB.Find(&items)
	c.JSON(http.StatusOK, items)
}

// Security Level Handler
type SecurityLevelHandler struct{}

func NewSecurityLevelHandler() *SecurityLevelHandler { return &SecurityLevelHandler{} }

func (h *SecurityLevelHandler) List(c *gin.Context) {
	var items []models.SecurityLevel
	database.DB.Find(&items)
	c.JSON(http.StatusOK, items)
}

// Document Location Handler
type DocLocationHandler struct{}

func NewDocLocationHandler() *DocLocationHandler { return &DocLocationHandler{} }

func (h *DocLocationHandler) List(c *gin.Context) {
	var items []models.DocumentLocation
	database.DB.Find(&items)
	c.JSON(http.StatusOK, items)
}

func (h *DocLocationHandler) Create(c *gin.Context) {
	var item models.DocumentLocation
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&item)
	c.JSON(http.StatusCreated, item)
}

func (h *DocLocationHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var item models.DocumentLocation
	if err := database.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}
	c.ShouldBindJSON(&item)
	database.DB.Save(&item)
	c.JSON(http.StatusOK, item)
}

func (h *DocLocationHandler) Delete(c *gin.Context) {
	database.DB.Delete(&models.DocumentLocation{}, c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

// Group Handler
type GroupHandler struct{}

func NewGroupHandler() *GroupHandler { return &GroupHandler{} }

func (h *GroupHandler) List(c *gin.Context) {
	var groups []models.Group
	database.DB.Preload("Members.User").Find(&groups)
	c.JSON(http.StatusOK, groups)
}

func (h *GroupHandler) Create(c *gin.Context) {
	var group models.Group
	if err := c.ShouldBindJSON(&group); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	database.DB.Create(&group)
	c.JSON(http.StatusCreated, group)
}

func (h *GroupHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var group models.Group
	if err := database.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}
	c.ShouldBindJSON(&group)
	database.DB.Save(&group)
	c.JSON(http.StatusOK, group)
}

func (h *GroupHandler) Delete(c *gin.Context) {
	database.DB.Delete(&models.Group{}, c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

func (h *GroupHandler) AddMember(c *gin.Context) {
	groupID := c.Param("id")
	var req struct {
		UserID uint `json:"user_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// db.Exec("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", groupID, req.UserID)
	database.DB.Exec("INSERT INTO group_members (group_id, user_id, created_at) VALUES (?, ?, NOW())", groupID, req.UserID)
	c.JSON(http.StatusCreated, gin.H{"message": "Member added"})
}

func (h *GroupHandler) RemoveMember(c *gin.Context) {
	groupID := c.Param("id")
	userID := c.Param("user_id")
	database.DB.Where("group_id = ? AND user_id = ?", groupID, userID).Delete(&models.GroupMember{})
	c.JSON(http.StatusOK, gin.H{"message": "Member removed"})
}
