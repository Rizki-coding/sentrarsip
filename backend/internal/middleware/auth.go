package middleware

import (
	"encoding/json"
	"net/http"
	"strings"

	"earsip-backend/internal/config"
	"earsip-backend/internal/database"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	OrgID    uint   `json:"org_id"`
	jwt.RegisteredClaims
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token required"})
			c.Abort()
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(config.AppConfig.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Set("orgID", claims.OrgID)
		c.Next()
	}
}

func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}

		userRole := role.(string)
		for _, r := range allowedRoles {
			if userRole == r {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		c.Abort()
	}
}

// PermissionMiddleware checks if the user's role has permission for a specific menu+action
// by reading the Role.Permissions JSON from the database.
func PermissionMiddleware(menuID, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}

		userRole := role.(string)
		// Superadmin always has access
		if userRole == "superadmin" {
			c.Next()
			return
		}

		// Query the role permissions from DB
		var roleRecord struct {
			Permissions string
		}
		if err := database.DB.Table("roles").Where("code = ?", userRole).Select("permissions").First(&roleRecord).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Role tidak ditemukan"})
			c.Abort()
			return
		}

		if roleRecord.Permissions == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak memiliki akses ke fitur ini"})
			c.Abort()
			return
		}

		// Parse permissions JSON: { "menuID": { "view": true, "create": false, ... } }
		var perms map[string]map[string]bool
		if err := json.Unmarshal([]byte(roleRecord.Permissions), &perms); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission data invalid"})
			c.Abort()
			return
		}

		menuPerms, ok := perms[menuID]
		if !ok || !menuPerms[action] {
			c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak memiliki akses ke fitur ini"})
			c.Abort()
			return
		}

		c.Next()
	}
}
