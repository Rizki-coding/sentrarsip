package handlers

import (
	"net/http"
	"strconv"

	"earsip-backend/internal/models"
	"earsip-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req services.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	deviceInfo := c.GetHeader("User-Agent")
	ipAddress := c.ClientIP()

	resp, err := services.Login(req, deviceInfo, ipAddress)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.SetCookie("refresh_token", resp.RefreshToken, 7*24*3600, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{
		"access_token": resp.AccessToken,
		"user":         resp.User,
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No refresh token"})
		return
	}

	accessToken, err := services.RefreshAccessToken(refreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"access_token": accessToken})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	refreshToken, _ := c.Cookie("refresh_token")
	if refreshToken != "" {
		services.Logout(refreshToken)
	}
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, _ := c.Get("userID")

	var dbUser models.User
	if err := services.GetDB().Preload("Organization").Preload("Position").First(&dbUser, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get role permissions
	var roleRecord models.Role
	services.GetDB().Where("code = ?", dbUser.Role).First(&roleRecord)

	c.JSON(http.StatusOK, gin.H{
		"id":              dbUser.ID,
		"username":        dbUser.Username,
		"email":           dbUser.Email,
		"full_name":       dbUser.FullName,
		"nip":             dbUser.NIP,
		"role":            dbUser.Role,
		"organization_id": dbUser.OrganizationID,
		"organization":    dbUser.Organization,
		"position_id":     dbUser.PositionID,
		"position":        dbUser.Position,
		"signature_path":  dbUser.SignaturePath,
		"avatar_path":     dbUser.AvatarPath,
		"permissions":     roleRecord.Permissions,
	})
}

func (h *AuthHandler) GetSessions(c *gin.Context) {
	userID := c.GetUint("userID")
	sessions, err := services.GetUserSessions(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, sessions)
}

func (h *AuthHandler) DeleteSession(c *gin.Context) {
	userID := c.GetUint("userID")
	sessionID, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := services.DeleteSession(uint(sessionID), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Session deleted"})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := services.ChangePassword(userID.(uint), req.OldPassword, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diubah"})
}
