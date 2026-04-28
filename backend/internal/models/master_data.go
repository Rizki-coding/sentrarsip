package models

import "time"

type Role struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Code        string    `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Description string    `gorm:"size:500" json:"description"`
	Permissions string    `gorm:"type:text" json:"permissions"` // Stores JSON string of permissions like {"menu_id": ["create", "read"]}
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type LetterCategory struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Code        string    `gorm:"size:50;uniqueIndex" json:"code"`
	Description string    `gorm:"size:500" json:"description"`
	Icon        string    `gorm:"size:50" json:"icon"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type LetterType struct {
	ID               uint            `gorm:"primaryKey" json:"id"`
	Name             string          `gorm:"size:255;not null" json:"name"`
	Code             string          `gorm:"size:50;uniqueIndex" json:"code"`
	Description      string          `gorm:"size:500" json:"description"`
	LetterCategoryID *uint           `json:"letter_category_id"`
	LetterCategory   *LetterCategory `gorm:"foreignKey:LetterCategoryID" json:"letter_category,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type Urgency struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"size:100;not null" json:"name"`
	Code string `gorm:"size:50;uniqueIndex" json:"code"`
}

type SecurityLevel struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Name string `gorm:"size:100;not null" json:"name"`
	Code string `gorm:"size:50;uniqueIndex" json:"code"`
}

type DocumentLocation struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:255;not null" json:"name"`
	Code        string    `gorm:"size:50;uniqueIndex" json:"code"`
	Description string    `gorm:"size:500" json:"description"`
	Room        string    `gorm:"size:100" json:"room"`
	Shelf       string    `gorm:"size:100" json:"shelf"`
	Box         string    `gorm:"size:100" json:"box"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Group struct {
	ID          uint          `gorm:"primaryKey" json:"id"`
	Name        string        `gorm:"size:255;not null" json:"name"`
	Description string        `gorm:"size:500" json:"description"`
	Members     []GroupMember `gorm:"foreignKey:GroupID" json:"members,omitempty"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

type GroupMember struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	GroupID   uint      `json:"group_id"`
	Group     Group     `gorm:"foreignKey:GroupID" json:"-"`
	UserID    uint      `json:"user_id"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}
