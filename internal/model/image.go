package model

import (
	"time"

	"gorm.io/gorm"
)

// ImageGeneration 图像生成记录
type ImageGeneration struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// 用户输入参数
	Prompt         string `json:"prompt" gorm:"type:text;not null"`
	NegativePrompt string `json:"negative_prompt" gorm:"type:text"`
	Seed           int64  `json:"seed"`
	Steps          int    `json:"steps" gorm:"default:28"`
	Width          int    `json:"width" gorm:"default:832"`
	Height         int    `json:"height" gorm:"default:1216"`

	// 预设画风 ID（预留字段）
	StylePresetID *uint `json:"style_preset_id" gorm:"index"`

	// 原始请求 payload（JSON 格式存储）
	OriginalPayload string `json:"original_payload" gorm:"type:text"`

	// 文件信息
	FilePath string `json:"file_path" gorm:"not null"` // 相对路径
	FileName string `json:"file_name" gorm:"not null"`
	FileSize int64  `json:"file_size"`

	// 生成状态
	Status       string `json:"status" gorm:"default:'pending'"` // pending, success, failed
	ErrorMessage string `json:"error_message" gorm:"type:text"`

	// NovelAI 响应信息
	GenerationTime int `json:"generation_time"` // 生成耗时（毫秒）
}

// TableName 指定表名
func (ImageGeneration) TableName() string {
	return "image_generations"
}

// StylePreset 画风预设（预留）
type StylePreset struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Name        string `json:"name" gorm:"not null;uniqueIndex"`
	Description string `json:"description" gorm:"type:text"`

	// 预设参数（JSON 格式存储）
	Parameters string `json:"parameters" gorm:"type:text"`

	// 是否启用
	Enabled bool `json:"enabled" gorm:"default:true"`
}

// TableName 指定表名
func (StylePreset) TableName() string {
	return "style_presets"
}
