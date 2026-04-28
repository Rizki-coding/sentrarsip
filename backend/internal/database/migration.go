package database

import (
	"log"

	"earsip-backend/internal/models"

	"gorm.io/gorm"
)

func Migrate(db *gorm.DB) {
	log.Println("Running database migrations...")
	err := db.AutoMigrate(
		&models.Role{},
		&models.Organization{},
		&models.Position{},
		&models.User{},
		&models.UserPosition{},
		&models.UserSession{},
		&models.Classification{},
		&models.LetterCategory{},
		&models.LetterType{},
		&models.Urgency{},
		&models.SecurityLevel{},
		&models.DocumentLocation{},
		&models.Group{},
		&models.GroupMember{},
		&models.Template{},
		&models.Archive{},
		&models.Letter{},
		&models.LetterRecipient{},
		&models.WorkflowLog{},
		&models.Disposition{},
		&models.Notification{},
		&models.LetterForward{},
	)
	if err != nil {
		log.Fatal("Migration failed:", err)
	}
	log.Println("Database migration completed")
}
