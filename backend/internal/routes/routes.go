package routes

import (
	"earsip-backend/internal/handlers"
	"earsip-backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	// Public routes
	auth := handlers.NewAuthHandler()
	r.POST("/api/auth/login", auth.Login)
	r.POST("/api/auth/refresh", auth.Refresh)

	// Protected routes
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// Auth
		api.POST("/auth/logout", auth.Logout)
		api.GET("/auth/me", auth.Me)
		api.GET("/auth/sessions", auth.GetSessions)
		api.DELETE("/auth/sessions/:id", auth.DeleteSession)
		api.PUT("/auth/change-password", auth.ChangePassword)

		// Users (Admin only for CUD)
		users := handlers.NewUserHandler()
		api.GET("/users", users.List)
		api.GET("/users/:id", users.Get)
		api.GET("/users/subordinates", users.Subordinates)
		api.GET("/users/same-org", users.SameOrgUsers)
		api.GET("/users/position-history", users.PositionHistory)
		api.POST("/users", middleware.RoleMiddleware("superadmin"), users.Create)
		api.PUT("/users/:id", middleware.RoleMiddleware("superadmin"), users.Update)
		api.DELETE("/users/:id", middleware.RoleMiddleware("superadmin"), users.Delete)

		// Roles
		roles := handlers.NewRoleHandler()
		api.GET("/roles", roles.List)
		api.POST("/roles", middleware.RoleMiddleware("superadmin"), roles.Create)
		api.PUT("/roles/:id", middleware.RoleMiddleware("superadmin"), roles.Update)
		api.DELETE("/roles/:id", middleware.RoleMiddleware("superadmin"), roles.Delete)

		// Organizations
		orgs := handlers.NewOrgHandler()
		api.GET("/organizations", orgs.List)
		api.GET("/organizations/flat", orgs.ListFlat)
		api.GET("/organizations/:id", orgs.Get)
		api.POST("/organizations", middleware.RoleMiddleware("superadmin"), orgs.Create)
		api.PUT("/organizations/:id", middleware.RoleMiddleware("superadmin"), orgs.Update)
		api.DELETE("/organizations/:id", middleware.RoleMiddleware("superadmin"), orgs.Delete)

		// Positions
		positions := handlers.NewPositionHandler()
		api.GET("/positions", positions.List)
		api.GET("/positions/:id", positions.Get)
		api.POST("/positions", middleware.RoleMiddleware("superadmin"), positions.Create)
		api.PUT("/positions/:id", middleware.RoleMiddleware("superadmin"), positions.Update)
		api.DELETE("/positions/:id", middleware.RoleMiddleware("superadmin"), positions.Delete)

		// Classifications
		classifications := handlers.NewClassificationHandler()
		api.GET("/classifications", classifications.ListTree)
		api.GET("/classifications/flat", classifications.ListFlat)
		api.GET("/classifications/:id", classifications.Get)
		api.POST("/classifications", middleware.RoleMiddleware("superadmin", "admin"), classifications.Create)
		api.PUT("/classifications/:id", middleware.RoleMiddleware("superadmin", "admin"), classifications.Update)
		api.DELETE("/classifications/:id", middleware.RoleMiddleware("superadmin", "admin"), classifications.Delete)

		// Letter Categories
		letterCategories := handlers.NewLetterCategoryHandler()
		api.GET("/letter-categories", letterCategories.List)
		api.POST("/letter-categories", middleware.RoleMiddleware("superadmin", "admin"), letterCategories.Create)
		api.PUT("/letter-categories/:id", middleware.RoleMiddleware("superadmin", "admin"), letterCategories.Update)
		api.DELETE("/letter-categories/:id", middleware.RoleMiddleware("superadmin", "admin"), letterCategories.Delete)

		// Letter Types
		letterTypes := handlers.NewLetterTypeHandler()
		api.GET("/letter-types", letterTypes.List)
		api.POST("/letter-types", middleware.RoleMiddleware("superadmin", "admin"), letterTypes.Create)
		api.PUT("/letter-types/:id", middleware.RoleMiddleware("superadmin", "admin"), letterTypes.Update)
		api.DELETE("/letter-types/:id", middleware.RoleMiddleware("superadmin", "admin"), letterTypes.Delete)

		// Urgencies & Security Levels (read-only, seeded)
		urgencies := handlers.NewUrgencyHandler()
		api.GET("/urgencies", urgencies.List)

		securityLevels := handlers.NewSecurityLevelHandler()
		api.GET("/security-levels", securityLevels.List)

		// Document Locations
		docLocations := handlers.NewDocLocationHandler()
		api.GET("/document-locations", docLocations.List)
		api.POST("/document-locations", middleware.RoleMiddleware("superadmin", "admin"), docLocations.Create)
		api.PUT("/document-locations/:id", middleware.RoleMiddleware("superadmin", "admin"), docLocations.Update)
		api.DELETE("/document-locations/:id", middleware.RoleMiddleware("superadmin", "admin"), docLocations.Delete)

		// Groups
		groups := handlers.NewGroupHandler()
		api.GET("/groups", groups.List)
		api.POST("/groups", middleware.RoleMiddleware("superadmin", "admin"), groups.Create)
		api.PUT("/groups/:id", middleware.RoleMiddleware("superadmin", "admin"), groups.Update)
		api.DELETE("/groups/:id", middleware.RoleMiddleware("superadmin", "admin"), groups.Delete)
		api.POST("/groups/:id/members", middleware.RoleMiddleware("superadmin", "admin"), groups.AddMember)
		api.DELETE("/groups/:id/members/:user_id", middleware.RoleMiddleware("superadmin", "admin"), groups.RemoveMember)

		// Templates
		templates := handlers.NewTemplateHandler()
		api.GET("/templates", templates.List)
		api.GET("/templates/default/:letter_type_id", templates.GetDefault) // Must be before /:id
		api.GET("/templates/:id", templates.Get)
		api.POST("/templates", middleware.RoleMiddleware("superadmin", "admin"), templates.Create)
		api.PUT("/templates/:id", middleware.RoleMiddleware("superadmin", "admin"), templates.Update)
		api.DELETE("/templates/:id", middleware.RoleMiddleware("superadmin", "admin"), templates.Delete)

		// Archives
		archives := handlers.NewArchiveHandler()
		api.GET("/archives", archives.List)
		api.GET("/archives/:id", archives.Get)
		api.POST("/archives", archives.Create)
		api.PUT("/archives/:id", archives.Update)
		api.DELETE("/archives/:id", middleware.RoleMiddleware("superadmin", "admin"), archives.Delete)
		api.GET("/archives/:id/preview", archives.Preview)

		// Dashboard
		letters := handlers.NewLetterHandler()
		api.GET("/dashboard/stats", letters.DashboardStats)

		// Letters & Workflow
		api.GET("/letters", letters.List)
		api.GET("/letters/received", letters.ReceivedLetters)
		api.GET("/letters/action-count", letters.ActionCount)
		api.GET("/letters/:id", letters.Get)
		api.GET("/letters/:id/workflow-steps", letters.WorkflowSteps)
		api.POST("/letters", letters.Create)
		api.PUT("/letters/:id", letters.Update)
		api.POST("/letters/:id/submit", letters.Submit)
		api.POST("/letters/:id/review", letters.Review)
		api.POST("/letters/:id/sign", letters.Sign)
		api.POST("/letters/:id/revise", letters.Revise)
		api.POST("/letters/:id/publish", letters.Publish)
		api.GET("/letters/:id/history", letters.History)
		api.GET("/letters/:id/preview", letters.Preview)

		// Letter Dispositions (inline)
		dispositions := handlers.NewDispositionHandler()
		api.GET("/dispositions", dispositions.List)
		api.GET("/letters/:id/dispositions", dispositions.ListByLetter)
		api.POST("/dispositions", dispositions.Create)
		api.PUT("/dispositions/:id", dispositions.UpdateStatus)

		// Letter Forwards
		forwards := handlers.NewForwardHandler()
		api.POST("/letters/:id/forward", forwards.Forward)
		api.GET("/letters/:id/forwards", forwards.ListByLetter)

		// Notifications
		notifications := handlers.NewNotificationHandler()
		api.GET("/notifications", notifications.List)
		api.GET("/notifications/unread-count", notifications.UnreadCount)
		api.PUT("/notifications/:id/read", notifications.MarkRead)
		api.PUT("/notifications/read-all", notifications.MarkAllRead)
	}

	// Serve uploaded files
	r.Static("/uploads", "./uploads")
}
