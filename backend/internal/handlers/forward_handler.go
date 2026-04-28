package handlers

import (
	"fmt"
	"net/http"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type ForwardHandler struct{}

func NewForwardHandler() *ForwardHandler { return &ForwardHandler{} }

func (h *ForwardHandler) Forward(c *gin.Context) {
	id := c.Param("id")
	var letter models.Letter
	if err := database.DB.First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter not found"})
		return
	}

	var req struct {
		ToUserID uint   `json:"to_user_id" binding:"required"`
		Notes    string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userID")

	// Validate same org
	var fromUser, toUser models.User
	database.DB.First(&fromUser, userID)
	database.DB.First(&toUser, req.ToUserID)

	fromRootOrg := GetRootOrgID(fromUser.OrganizationID)
	toRootOrg := GetRootOrgID(toUser.OrganizationID)
	if fromRootOrg != toRootOrg {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Hanya bisa forward ke user di organisasi yang sama"})
		return
	}

	fwd := models.LetterForward{
		LetterID:   letter.ID,
		FromUserID: userID.(uint),
		ToUserID:   req.ToUserID,
		Notes:      req.Notes,
	}
	database.DB.Create(&fwd)

	// Notify target
	database.DB.Create(&models.Notification{
		UserID:  req.ToUserID,
		Title:   "Surat Diteruskan",
		Message: fmt.Sprintf("%s meneruskan surat '%s' kepada Anda", fromUser.FullName, letter.Subject),
		Link:    fmt.Sprintf("/letters/%d", letter.ID),
	})

	database.DB.Preload("FromUser").Preload("ToUser").First(&fwd, fwd.ID)
	c.JSON(http.StatusCreated, fwd)
}

func (h *ForwardHandler) ListByLetter(c *gin.Context) {
	id := c.Param("id")
	var forwards []models.LetterForward
	database.DB.Preload("FromUser").Preload("ToUser").Where("letter_id = ?", id).Order("created_at DESC").Find(&forwards)
	c.JSON(http.StatusOK, forwards)
}

// GetRootOrgID traverses up the org tree to find the level-1 root org
func GetRootOrgID(orgID uint) uint {
	if orgID == 0 {
		return 0
	}
	visited := make(map[uint]bool)
	currentID := orgID
	for {
		if visited[currentID] {
			return currentID
		}
		visited[currentID] = true
		var org models.Organization
		if err := database.DB.First(&org, currentID).Error; err != nil {
			return currentID
		}
		if org.ParentID == nil || *org.ParentID == 0 {
			return org.ID
		}
		currentID = *org.ParentID
	}
}
