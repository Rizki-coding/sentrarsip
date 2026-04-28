package services

import (
	"earsip-backend/internal/database"

	"gorm.io/gorm"
)

func GetDB() *gorm.DB {
	return database.DB
}
