package models

import "time"

type Classification struct {
	ID                     uint             `gorm:"primaryKey" json:"id"`
	ParentID               *uint            `json:"parent_id"`
	Parent                 *Classification  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children               []Classification `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Code                   string           `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name                   string           `gorm:"size:255;not null" json:"name"`
	RetentionActiveYears   int              `gorm:"default:0" json:"retention_active_years"`
	RetentionInactiveYears int              `gorm:"default:0" json:"retention_inactive_years"`
	Description            string           `gorm:"size:500" json:"description"`
	CreatedAt              time.Time        `json:"created_at"`
	UpdatedAt              time.Time        `json:"updated_at"`
}
