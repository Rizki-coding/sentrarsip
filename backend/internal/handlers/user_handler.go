package handlers

import (
	"net/http"
	"strconv"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

func (h *UserHandler) List(c *gin.Context) {
	var users []models.User
	query := database.DB.Preload("Organization").Preload("Position")

	if role := c.Query("role"); role != "" {
		query = query.Where("role = ?", role)
	}
	if orgID := c.Query("organization_id"); orgID != "" {
		query = query.Where("organization_id = ?", orgID)
	}
	if search := c.Query("search"); search != "" {
		query = query.Where("full_name LIKE ? OR username LIKE ? OR nip LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.User{}).Count(&total)
	query.Limit(limit).Offset(offset).Find(&users)

	c.JSON(http.StatusOK, gin.H{
		"data":  users,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *UserHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := database.DB.Preload("Organization").Preload("Position").Preload("Positions.Position").First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

type CreateUserRequest struct {
	Username       string `json:"username" binding:"required"`
	Email          string `json:"email" binding:"required"`
	Password       string `json:"password" binding:"required,min=6"`
	FullName       string `json:"full_name" binding:"required"`
	NIP            string `json:"nip"`
	Role           string `json:"role" binding:"required"`
	OrganizationID uint   `json:"organization_id" binding:"required"`
	PositionID     uint   `json:"position_id" binding:"required"`
}

func (h *UserHandler) Create(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	user := models.User{
		Username:       req.Username,
		Email:          req.Email,
		Password:       string(hashedPwd),
		FullName:       req.FullName,
		NIP:            req.NIP,
		Role:           req.Role,
		OrganizationID: req.OrganizationID,
		PositionID:     req.PositionID,
		IsActive:       true,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user: " + err.Error()})
		return
	}

	// Record initial position history
	now := time.Now()
	database.DB.Create(&models.UserPosition{
		UserID:     user.ID,
		PositionID: user.PositionID,
		IsPrimary:  true,
		StartDate:  now,
	})

	database.DB.Preload("Organization").Preload("Position").Preload("Positions.Position").First(&user, user.ID)
	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req struct {
		Username       string `json:"username"`
		Email          string `json:"email"`
		Password       string `json:"password"`
		FullName       string `json:"full_name"`
		NIP            string `json:"nip"`
		Role           string `json:"role"`
		OrganizationID uint   `json:"organization_id"`
		PositionID     uint   `json:"position_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	oldPositionID := user.PositionID

	if req.Password != "" {
		hashedPwd, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		req.Password = string(hashedPwd)
		database.DB.Model(&user).Update("password", req.Password)
	}

	database.DB.Model(&user).Updates(models.User{
		Username:       req.Username,
		Email:          req.Email,
		FullName:       req.FullName,
		NIP:            req.NIP,
		Role:           req.Role,
		OrganizationID: req.OrganizationID,
		PositionID:     req.PositionID,
	})

	// Check if position was changed
	var updatedUser models.User
	database.DB.First(&updatedUser, user.ID)

	if oldPositionID != updatedUser.PositionID {
		now := time.Now()
		// End old positions
		database.DB.Model(&models.UserPosition{}).
			Where("user_id = ? AND end_date IS NULL", user.ID).
			Update("end_date", now)

		// Create new position record
		database.DB.Create(&models.UserPosition{
			UserID:     user.ID,
			PositionID: updatedUser.PositionID,
			IsPrimary:  true,
			StartDate:  now,
		})
	}

	database.DB.Preload("Organization").Preload("Position").Preload("Positions.Position").First(&user, user.ID)
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	database.DB.Model(&models.User{}).Where("id = ?", id).Update("is_active", false)
	c.JSON(http.StatusOK, gin.H{"message": "User deactivated"})
}

// Subordinates returns users with lower position (higher level number) in the same root org
func (h *UserHandler) Subordinates(c *gin.Context) {
	userID, _ := c.Get("userID")
	var currentUser models.User
	database.DB.Preload("Position").First(&currentUser, userID)

	rootOrgID := GetRootOrgID(currentUser.OrganizationID)

	// Get all org IDs under the same root
	orgIDs := getAllChildOrgIDs(rootOrgID)

	var users []models.User
	database.DB.Preload("Organization").Preload("Position").
		Where("id != ? AND organization_id IN ? AND is_active = ?", userID, orgIDs, true).
		Joins("JOIN positions ON positions.id = users.position_id").
		Where("positions.level > ?", currentUser.Position.Level).
		Find(&users)
	c.JSON(http.StatusOK, users)
}

// SameOrgUsers returns all users in the same root organization (for forward)
func (h *UserHandler) SameOrgUsers(c *gin.Context) {
	userID, _ := c.Get("userID")
	var currentUser models.User
	database.DB.First(&currentUser, userID)

	rootOrgID := GetRootOrgID(currentUser.OrganizationID)
	orgIDs := getAllChildOrgIDs(rootOrgID)

	var users []models.User
	database.DB.Preload("Organization").Preload("Position").
		Where("id != ? AND organization_id IN ? AND is_active = ?", userID, orgIDs, true).
		Find(&users)
	c.JSON(http.StatusOK, users)
}

// PositionHistory returns position history records, optionally filtered by user_id query param
func (h *UserHandler) PositionHistory(c *gin.Context) {
	query := database.DB.Preload("User").Preload("Position")
	if uid := c.Query("user_id"); uid != "" {
		query = query.Where("user_id = ?", uid)
	}
	var records []models.UserPosition
	query.Order("start_date DESC").Find(&records)
	c.JSON(http.StatusOK, records)
}

func getAllChildOrgIDs(rootID uint) []uint {
	ids := []uint{rootID}
	var children []models.Organization
	database.DB.Where("parent_id = ?", rootID).Find(&children)
	for _, child := range children {
		ids = append(ids, getAllChildOrgIDs(child.ID)...)
	}
	return ids
}
