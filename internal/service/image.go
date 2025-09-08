package service

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"novelai-backend/internal/model"

	"gorm.io/gorm"
)

// ImageService 图像服务
type ImageService struct {
	db        *gorm.DB
	imagesDir string
}

// NewImageService 创建图像服务实例
func NewImageService(db *gorm.DB, imagesDir string) *ImageService {
	return &ImageService{
		db:        db,
		imagesDir: imagesDir,
	}
}

// SaveImageGeneration 保存图像生成记录
func (s *ImageService) SaveImageGeneration(
	prompt, negativePrompt string,
	seed int64,
	steps, width, height int,
	stylePresetID *uint,
	originalPayload string,
	imageData []byte,
) (*model.ImageGeneration, error) {
	// 生成文件名
	timestamp := time.Now().Format("20060102_150405")
	fileName := fmt.Sprintf("novelai_%s_%d.png", timestamp, seed)

	// 创建年月目录
	yearMonth := time.Now().Format("2006/01")
	dirPath := filepath.Join(s.imagesDir, yearMonth)
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create directory: %w", err)
	}

	// 完整文件路径
	fullPath := filepath.Join(dirPath, fileName)
	relativePath := filepath.Join(yearMonth, fileName)

	// 保存文件
	if err := os.WriteFile(fullPath, imageData, 0644); err != nil {
		return nil, fmt.Errorf("failed to save image file: %w", err)
	}

	// 创建数据库记录
	generation := &model.ImageGeneration{
		Prompt:          prompt,
		NegativePrompt:  negativePrompt,
		Seed:            seed,
		Steps:           steps,
		Width:           width,
		Height:          height,
		StylePresetID:   stylePresetID,
		OriginalPayload: originalPayload,
		FilePath:        relativePath,
		FileName:        fileName,
		FileSize:        int64(len(imageData)),
		Status:          "success",
	}

	// 保存到数据库
	if err := s.db.Create(generation).Error; err != nil {
		// 如果数据库保存失败，删除已保存的文件
		os.Remove(fullPath)
		return nil, fmt.Errorf("failed to save to database: %w", err)
	}

	return generation, nil
}

// SaveFailedGeneration 保存失败的生成记录
func (s *ImageService) SaveFailedGeneration(
	prompt, negativePrompt string,
	seed int64,
	steps, width, height int,
	stylePresetID *uint,
	originalPayload string,
	errorMessage string,
) (*model.ImageGeneration, error) {
	generation := &model.ImageGeneration{
		Prompt:          prompt,
		NegativePrompt:  negativePrompt,
		Seed:            seed,
		Steps:           steps,
		Width:           width,
		Height:          height,
		StylePresetID:   stylePresetID,
		OriginalPayload: originalPayload,
		Status:          "failed",
		ErrorMessage:    errorMessage,
	}

	if err := s.db.Create(generation).Error; err != nil {
		return nil, fmt.Errorf("failed to save failed generation: %w", err)
	}

	return generation, nil
}

// GetImageGeneration 获取图像生成记录
func (s *ImageService) GetImageGeneration(id uint) (*model.ImageGeneration, error) {
	var generation model.ImageGeneration
	if err := s.db.First(&generation, id).Error; err != nil {
		return nil, err
	}
	return &generation, nil
}

// ListImageGenerations 列出图像生成记录
func (s *ImageService) ListImageGenerations(limit, offset int) ([]model.ImageGeneration, int64, error) {
	var generations []model.ImageGeneration
	var total int64

	// 获取总数
	if err := s.db.Model(&model.ImageGeneration{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 获取分页数据
	if err := s.db.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&generations).Error; err != nil {
		return nil, 0, err
	}

	return generations, total, nil
}

// GetImageFilePath 获取图像文件的完整路径
func (s *ImageService) GetImageFilePath(generation *model.ImageGeneration) string {
	return filepath.Join(s.imagesDir, generation.FilePath)
}

// UpdateGenerationTime 更新生成时间
func (s *ImageService) UpdateGenerationTime(id uint, generationTime int) error {
	return s.db.Model(&model.ImageGeneration{}).
		Where("id = ?", id).
		Update("generation_time", generationTime).Error
}

// GetImageGenerationsByIDs 根据 IDs 批量获取图像生成记录
func (s *ImageService) GetImageGenerationsByIDs(ids []uint) ([]model.ImageGeneration, error) {
	var generations []model.ImageGeneration

	if err := s.db.Where("id IN ?", ids).
		Order("created_at DESC").
		Find(&generations).Error; err != nil {
		return nil, err
	}

	return generations, nil
}
