package models

import "time"

type Archive struct {
	ID                 uint              `gorm:"primaryKey" json:"id"`
	AgendaNumber       string            `gorm:"size:100;uniqueIndex" json:"agenda_number"`
	DocumentNumber     string            `gorm:"size:100" json:"document_number"`
	LetterID           *uint             `json:"letter_id"`
	Letter             *Letter           `gorm:"foreignKey:LetterID" json:"letter,omitempty"`
	ClassificationID   uint              `json:"classification_id"`
	Classification     Classification    `gorm:"foreignKey:ClassificationID" json:"classification,omitempty"`
	LetterTypeID       uint              `json:"letter_type_id"`
	LetterType         LetterType        `gorm:"foreignKey:LetterTypeID" json:"letter_type,omitempty"`
	UrgencyID          *uint             `json:"urgency_id"`
	Urgency            *Urgency          `gorm:"foreignKey:UrgencyID" json:"urgency,omitempty"`
	SecurityLevelID    *uint             `json:"security_level_id"`
	SecurityLevel      *SecurityLevel    `gorm:"foreignKey:SecurityLevelID" json:"security_level,omitempty"`
	DocumentLocationID *uint             `json:"document_location_id"`
	DocumentLocation   *DocumentLocation `gorm:"foreignKey:DocumentLocationID" json:"document_location,omitempty"`
	Origin             string            `gorm:"size:255" json:"origin"`
	Subject            string            `gorm:"size:500;not null" json:"subject"`
	LetterDate         *time.Time        `json:"letter_date"`
	ReceivedDate       *time.Time        `json:"received_date"`
	FilePath           string            `gorm:"size:500" json:"file_path"`
	Description        string            `gorm:"type:text" json:"description"`
	CreatedBy          uint              `json:"created_by"`
	Creator            User              `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	RetentionDueAt     *time.Time        `json:"retention_due_at"`
	Status             string            `gorm:"size:20;default:'aktif'" json:"status"`
	CreatedAt          time.Time         `json:"created_at"`
	UpdatedAt          time.Time         `json:"updated_at"`
}
