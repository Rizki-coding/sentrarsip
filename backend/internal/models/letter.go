package models

import "time"

type Letter struct {
	ID                   uint              `gorm:"primaryKey" json:"id"`
	LetterNumber         string            `gorm:"size:100" json:"letter_number"`
	LetterTypeID         uint              `json:"letter_type_id"`
	LetterType           LetterType        `gorm:"foreignKey:LetterTypeID" json:"letter_type,omitempty"`
	TemplateID           *uint             `json:"template_id"`
	Template             *Template         `gorm:"foreignKey:TemplateID" json:"template,omitempty"`
	UrgencyID            *uint             `json:"urgency_id"`
	Urgency              *Urgency          `gorm:"foreignKey:UrgencyID" json:"urgency,omitempty"`
	SecurityLevelID      *uint             `json:"security_level_id"`
	SecurityLevel        *SecurityLevel    `gorm:"foreignKey:SecurityLevelID" json:"security_level,omitempty"`
	Direction            string            `gorm:"size:10;not null" json:"direction"`
	Subject              string            `gorm:"size:500;not null" json:"subject"`
	ContentHTML          string            `gorm:"type:longtext" json:"content_html"`
	LetterDate           *time.Time        `json:"letter_date"`
	Status               string            `gorm:"size:30;default:'draft'" json:"status"`
	CreatedBy            uint              `json:"created_by"`
	Creator              User              `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Checkers             []User            `gorm:"many2many:letter_checkers;" json:"checkers,omitempty"`
	Approvers            []User            `gorm:"many2many:letter_approvers;" json:"approvers,omitempty"`
	PublisherID          *uint             `json:"publisher_id"`
	Publisher            *User             `gorm:"foreignKey:PublisherID" json:"publisher,omitempty"`
	CurrentCheckerIndex  int               `gorm:"default:0" json:"current_checker_index"`
	CurrentApproverIndex int               `gorm:"default:0" json:"current_approver_index"`
	QRCodePath           string            `gorm:"size:500" json:"qr_code_path"`
	PDFPath              string            `gorm:"size:500" json:"pdf_path"`
	Recipients           []LetterRecipient `gorm:"foreignKey:LetterID" json:"recipients,omitempty"`
	WorkflowLogs         []WorkflowLog     `gorm:"foreignKey:LetterID" json:"workflow_logs,omitempty"`
	CreatedAt            time.Time         `json:"created_at"`
	UpdatedAt            time.Time         `json:"updated_at"`
}

type LetterRecipient struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	LetterID      uint      `json:"letter_id"`
	RecipientType string    `gorm:"size:20;not null" json:"recipient_type"`
	RecipientID   uint      `json:"recipient_id"`
	RecipientName string    `gorm:"size:255" json:"recipient_name"`
	CreatedAt     time.Time `json:"created_at"`
}

type WorkflowLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	LetterID   uint      `json:"letter_id"`
	UserID     uint      `json:"user_id"`
	User       User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action     string    `gorm:"size:30;not null" json:"action"`
	FromStatus string    `gorm:"size:30" json:"from_status"`
	ToStatus   string    `gorm:"size:30" json:"to_status"`
	Comments   string    `gorm:"type:text" json:"comments"`
	CreatedAt  time.Time `json:"created_at"`
}

type Disposition struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	LetterID    uint       `json:"letter_id"`
	Letter      Letter     `gorm:"foreignKey:LetterID" json:"letter,omitempty"`
	FromUserID  uint       `json:"from_user_id"`
	FromUser    User       `gorm:"foreignKey:FromUserID" json:"from_user,omitempty"`
	ToUserID    uint       `json:"to_user_id"`
	ToUser      User       `gorm:"foreignKey:ToUserID" json:"to_user,omitempty"`
	Instruction string     `gorm:"type:text" json:"instruction"`
	Priority    string     `gorm:"size:20;default:'biasa'" json:"priority"`
	Deadline    *time.Time `json:"deadline"`
	Status      string     `gorm:"size:20;default:'pending'" json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Notification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"-"`
	Title     string    `gorm:"size:255;not null" json:"title"`
	Message   string    `gorm:"type:text" json:"message"`
	Link      string    `gorm:"size:500" json:"link"`
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

type LetterForward struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	LetterID   uint      `json:"letter_id"`
	Letter     Letter    `gorm:"foreignKey:LetterID" json:"letter,omitempty"`
	FromUserID uint      `json:"from_user_id"`
	FromUser   User      `gorm:"foreignKey:FromUserID" json:"from_user,omitempty"`
	ToUserID   uint      `json:"to_user_id"`
	ToUser     User      `gorm:"foreignKey:ToUserID" json:"to_user,omitempty"`
	Notes      string    `gorm:"type:text" json:"notes"`
	CreatedAt  time.Time `json:"created_at"`
}
