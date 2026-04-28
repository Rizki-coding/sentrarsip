package main

import (
	"fmt"

	"earsip-backend/internal/config"
	"earsip-backend/internal/database"
	"earsip-backend/internal/models"
)

func main() {
	config.Load()
	database.Connect()

	var count int64
	database.DB.Model(&models.User{}).Count(&count)
	fmt.Printf("Total users: %d\n", count)

	var users []models.User
	database.DB.Find(&users)
	for _, u := range users {
		fmt.Printf("User: %s (Active: %v) - Role: %s\n", u.Username, u.IsActive, u.Role)
	}
}
