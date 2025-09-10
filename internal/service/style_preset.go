package service

import (
	"novelai-backend/internal/model"

	"gorm.io/gorm"
)

// StylePresetService 画风预设服务
type StylePresetService struct {
	db *gorm.DB
}

// NewStylePresetService 创建画风预设服务
func NewStylePresetService(db *gorm.DB) *StylePresetService {
	return &StylePresetService{
		db: db,
	}
}

// GetAllStylePresets 获取所有启用的画风预设
func (s *StylePresetService) GetAllStylePresets() ([]model.StylePreset, error) {
	var presets []model.StylePreset
	err := s.db.Where("enabled = ?", true).Order("created_at ASC").Find(&presets).Error
	return presets, err
}

// GetStylePresetByID 根据ID获取画风预设
func (s *StylePresetService) GetStylePresetByID(id uint) (*model.StylePreset, error) {
	var preset model.StylePreset
	err := s.db.Where("id = ? AND enabled = ?", id, true).First(&preset).Error
	if err != nil {
		return nil, err
	}
	return &preset, nil
}
