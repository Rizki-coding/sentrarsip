package models

import "time"

type User struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	Username       string         `gorm:"size:100;uniqueIndex;not null" json:"username"`
	Email          string         `gorm:"size:255;uniqueIndex;not null" json:"email"`
	Password       string         `gorm:"size:255;not null" json:"-"`
	FullName       string         `gorm:"size:255;not null" json:"full_name"`
	NIP            string         `gorm:"size:50" json:"nip"`
	Role           string         `gorm:"size:50;default:'pegawai'" json:"role"` // Maps to Role.Code
	RoleDetail     Role           `gorm:"foreignKey:Role;references:Code" json:"role_detail,omitempty"`
	OrganizationID uint           `json:"organization_id"`
	Organization   Organization   `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	PositionID     uint           `json:"position_id"`
	Position       Position       `gorm:"foreignKey:PositionID" json:"position,omitempty"`
	Positions      []UserPosition `gorm:"foreignKey:UserID" json:"positions,omitempty"`
	SignaturePath  string         `gorm:"size:500" json:"signature_path"`
	AvatarPath     string         `gorm:"size:500" json:"avatar_path"`
	IsActive       bool           `gorm:"default:true" json:"is_active"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

type UserSession struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	UserID       uint      `json:"user_id"`
	User         User      `gorm:"foreignKey:UserID" json:"-"`
	RefreshToken string    `gorm:"size:500;not null" json:"-"`
	DeviceInfo   string    `gorm:"size:500" json:"device_info"`
	IPAddress    string    `gorm:"size:50" json:"ip_address"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
}

type UserPosition struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	UserID     uint       `json:"user_id"`
	User       User       `gorm:"foreignKey:UserID" json:"-"`
	PositionID uint       `json:"position_id"`
	Position   Position   `gorm:"foreignKey:PositionID" json:"position,omitempty"`
	IsPrimary  bool       `gorm:"default:false" json:"is_primary"`
	StartDate  time.Time  `json:"start_date"`
	EndDate    *time.Time `json:"end_date"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}
