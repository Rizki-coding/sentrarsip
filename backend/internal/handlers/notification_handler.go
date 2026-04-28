package handlers

import (
	"net/http"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct{}

func NewNotificationHandler() *NotificationHandler { return &NotificationHandler{} }

func (h *NotificationHandler) List(c *gin.Context) {
	userID, _ := c.Get("userID")
	var notifications []models.Notification
	database.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&notifications)
	c.JSON(http.StatusOK, notifications)
}

func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	userID, _ := c.Get("userID")
	var count int64
	database.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&count)
	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	id := c.Param("id")
	database.DB.Model(&models.Notification{}).Where("id = ?", id).Update("is_read", true)
	c.JSON(http.StatusOK, gin.H{"message": "Marked as read"})
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID, _ := c.Get("userID")
	database.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Update("is_read", true)
	c.JSON(http.StatusOK, gin.H{"message": "All marked as read"})
}
