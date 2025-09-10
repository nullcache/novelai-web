package model

import (
	"time"
)

// StylePreset 画风预设（预留）
type StylePreset struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Name        string `json:"name" gorm:"not null;uniqueIndex"`
	Description string `json:"description" gorm:"type:text"`

	PrefixPrompt         string `json:"prefix_prompt" gorm:"type:text"`
	SuffixPrompt         string `json:"suffix_prompt" gorm:"type:text"`
	PrefixNegativePrompt string `json:"prefix_negative_prompt" gorm:"type:text"`
	SuffixNegativePrompt string `json:"suffix_negative_prompt" gorm:"type:text"`

	// 是否启用
	Enabled bool `json:"enabled" gorm:"default:true"`
}

// TableName 指定表名
func (StylePreset) TableName() string {
	return "style_presets"
}
