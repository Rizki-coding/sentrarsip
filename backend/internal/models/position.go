package models

import "time"

type Position struct {
	ID             uint         `gorm:"primaryKey" json:"id"`
	OrganizationID uint         `json:"organization_id"`
	Organization   Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	Name           string       `gorm:"size:255;not null" json:"name"`
	ParentID       *uint        `json:"parent_id"`
	Parent         *Position    `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Level          int          `gorm:"default:0" json:"level"`
	Description    string       `gorm:"size:500" json:"description"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}
