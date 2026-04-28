package models

import "time"

type Template struct {
	ID              uint          `gorm:"primaryKey" json:"id"`
	Name            string        `gorm:"size:255;not null" json:"name"`
	LetterTypeID    uint          `json:"letter_type_id"`
	LetterType      LetterType    `gorm:"foreignKey:LetterTypeID" json:"letter_type,omitempty"`
	OrganizationID  *uint         `json:"organization_id"`
	Organization    *Organization `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	HTMLContent     string        `gorm:"type:longtext" json:"html_content"`
	VariablesJSON   string        `gorm:"type:text" json:"variables_json"`
	NumberingFormat string        `gorm:"size:255" json:"numbering_format"`
	IsDefault       bool          `gorm:"default:false" json:"is_default"`
	IsActive        bool          `gorm:"default:true" json:"is_active"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
}
