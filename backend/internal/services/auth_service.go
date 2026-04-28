package services

import (
	"errors"
	"time"

	"earsip-backend/internal/config"
	"earsip-backend/internal/database"
	"earsip-backend/internal/middleware"
	"earsip-backend/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         models.User `json:"user"`
}

func Login(req LoginRequest, deviceInfo, ipAddress string) (*LoginResponse, error) {
	var user models.User
	result := database.DB.Preload("Organization").Preload("Position").
		Where("username = ? AND is_active = ?", req.Username, true).First(&user)
	if result.Error != nil {
		return nil, errors.New("Username tidak ditemukan atau akun tidak aktif")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("Password yang Anda masukkan salah")
	}

	accessToken, err := generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken := uuid.New().String()
	session := models.UserSession{
		UserID:       user.ID,
		RefreshToken: refreshToken,
		DeviceInfo:   deviceInfo,
		IPAddress:    ipAddress,
		ExpiresAt:    time.Now().Add(config.AppConfig.RefreshExpiry),
	}
	database.DB.Create(&session)

	return &LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, nil
}

func RefreshAccessToken(refreshToken string) (string, error) {
	var session models.UserSession
	result := database.DB.Where("refresh_token = ? AND expires_at > ?", refreshToken, time.Now()).First(&session)
	if result.Error != nil {
		return "", errors.New("invalid or expired refresh token")
	}

	var user models.User
	database.DB.Preload("Organization").Preload("Position").First(&user, session.UserID)

	return generateAccessToken(user)
}

func Logout(refreshToken string) error {
	return database.DB.Where("refresh_token = ?", refreshToken).Delete(&models.UserSession{}).Error
}

func GetUserSessions(userID uint) ([]models.UserSession, error) {
	var sessions []models.UserSession
	err := database.DB.Where("user_id = ? AND expires_at > ?", userID, time.Now()).Find(&sessions).Error
	return sessions, err
}

func DeleteSession(sessionID, userID uint) error {
	return database.DB.Where("id = ? AND user_id = ?", sessionID, userID).Delete(&models.UserSession{}).Error
}

func generateAccessToken(user models.User) (string, error) {
	claims := &middleware.Claims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		OrgID:    user.OrganizationID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(config.AppConfig.JWTExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.AppConfig.JWTSecret))
}

func ChangePassword(userID uint, oldPassword, newPassword string) error {
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(oldPassword)); err != nil {
		return errors.New("password lama salah")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return database.DB.Model(&user).Update("password", string(hashed)).Error
}
