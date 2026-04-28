package main

import (
	"log"

	"earsip-backend/internal/config"
	"earsip-backend/internal/database"
	"earsip-backend/internal/middleware"
	"earsip-backend/internal/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	config.Load()

	// Connect to database
	database.Connect()

	// Run migrations
	database.Migrate(database.DB)

	// Seed data
	database.Seed(database.DB)

	// Setup Gin
	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	// Set max upload size (10MB)
	r.MaxMultipartMemory = 10 << 20

	// Register routes
	routes.RegisterRoutes(r)

	// Start server
	port := config.AppConfig.AppPort
	log.Printf("Server starting on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
