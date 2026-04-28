package main

import (
	"fmt"
	"log"

	"earsip-backend/internal/config"
	"earsip-backend/internal/database"
)

func main() {
	// Initialize configuration
	config.Load()

	// Connect to database
	database.Connect()

	// Verify connection
	if database.DB != nil {
		fmt.Println("--- SQL Connection Test ---")
		fmt.Printf("Connected to DB: %s\n", config.AppConfig.DBName)
		fmt.Println("Successfully connected and initialized GORM.")
		fmt.Println("---------------------------")
	} else {
		log.Fatal("Database object is nil after connection attempt.")
	}
}
