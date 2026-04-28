package models

import "time"

type Organization struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	ParentID    *uint           `json:"parent_id"`
	Parent      *Organization   `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children    []Organization  `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Name        string          `gorm:"size:255;not null" json:"name"`
	Code        string          `gorm:"size:50;uniqueIndex" json:"code"`
	Description string          `gorm:"size:500" json:"description"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}
