package handler

import (
	"net/http"
	"strconv"
	"time"

	"novelai-backend/internal/service"

	"github.com/gin-gonic/gin"
)

// ImageHandler 图像处理器
type ImageHandler struct {
	novelaiService *service.NovelAIService
	imageService   *service.ImageService
}

// NewImageHandler 创建图像处理器实例
func NewImageHandler(novelaiService *service.NovelAIService, imageService *service.ImageService) *ImageHandler {
	return &ImageHandler{
		novelaiService: novelaiService,
		imageService:   imageService,
	}
}

// GenerateImageRequest 生成图像请求
type GenerateImageRequest struct {
	Prompt         string `json:"prompt" binding:"required"`
	NegativePrompt string `json:"negative_prompt"`
	Seed           int64  `json:"seed"`            // -1 表示随机
	Steps          int    `json:"steps"`           // 默认 28
	Width          int    `json:"width"`           // 默认 832
	Height         int    `json:"height"`          // 默认 1216
	StylePresetID  *uint  `json:"style_preset_id"` // 预设画风 ID，可为空
}

// GenerateImageResponse 生成图像响应
type GenerateImageResponse struct {
	ID       uint   `json:"id"`
	ImageURL string `json:"image_url"`
	Seed     int64  `json:"seed"`
	Message  string `json:"message"`
}

// GenerateImage 生成图像
func (h *ImageHandler) GenerateImage(c *gin.Context) {
	var req GenerateImageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 设置默认值
	if req.Steps <= 0 {
		req.Steps = 28
	}
	if req.Width <= 0 {
		req.Width = 832
	}
	if req.Height <= 0 {
		req.Height = 1216
	}
	if req.NegativePrompt == "" {
		req.NegativePrompt = "bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry"
	}

	// 记录开始时间
	startTime := time.Now()

	// 调用 NovelAI API
	novelaiReq := &service.GenerationRequest{
		Prompt:         req.Prompt,
		NegativePrompt: req.NegativePrompt,
		Seed:           req.Seed,
		Steps:          req.Steps,
		Width:          req.Width,
		Height:         req.Height,
	}

	imageData, originalPayload, err := h.novelaiService.GenerateImage(novelaiReq)
	if err != nil {
		// 保存失败记录
		generation, _ := h.imageService.SaveFailedGeneration(
			req.Prompt,
			req.NegativePrompt,
			req.Seed,
			req.Steps,
			req.Width,
			req.Height,
			req.StylePresetID,
			originalPayload,
			err.Error(),
		)

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate image",
			"details": err.Error(),
			"id":      generation.ID,
		})
		return
	}

	// 计算生成时间
	generationTime := int(time.Since(startTime).Milliseconds())

	// 保存成功记录
	generation, err := h.imageService.SaveImageGeneration(
		req.Prompt,
		req.NegativePrompt,
		novelaiReq.Seed, // 使用实际的种子值（可能是随机生成的）
		req.Steps,
		req.Width,
		req.Height,
		req.StylePresetID,
		originalPayload,
		imageData,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to save image",
			"details": err.Error(),
		})
		return
	}

	// 更新生成时间
	generation.GenerationTime = generationTime
	h.imageService.UpdateGenerationTime(generation.ID, generationTime)

	// 构建图像 URL
	imageURL := "/files/" + generation.FilePath

	c.JSON(http.StatusOK, GenerateImageResponse{
		ID:       generation.ID,
		ImageURL: imageURL,
		Seed:     generation.Seed,
		Message:  "Image generated successfully",
	})
}

// GetImage 获取图像信息
func (h *ImageHandler) GetImage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	generation, err := h.imageService.GetImageGeneration(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image not found"})
		return
	}

	// 构建图像 URL
	imageURL := "/files/" + generation.FilePath

	c.JSON(http.StatusOK, gin.H{
		"id":              generation.ID,
		"prompt":          generation.Prompt,
		"negative_prompt": generation.NegativePrompt,
		"seed":            generation.Seed,
		"steps":           generation.Steps,
		"width":           generation.Width,
		"height":          generation.Height,
		"style_preset_id": generation.StylePresetID,
		"image_url":       imageURL,
		"status":          generation.Status,
		"error_message":   generation.ErrorMessage,
		"generation_time": generation.GenerationTime,
		"created_at":      generation.CreatedAt,
	})
}

// ListImagesRequest 列出图像请求
type ListImagesRequest struct {
	Page  int `form:"page" binding:"min=1"`
	Limit int `form:"limit" binding:"min=1,max=100"`
}

// GetImagesByIDsRequest 根据 IDs 批量获取图像请求
type GetImagesByIDsRequest struct {
	IDs []uint `json:"ids" binding:"required"`
}

// GetImagesByIDs 根据 IDs 批量获取图像
func (h *ImageHandler) GetImagesByIDs(c *gin.Context) {
	var req GetImagesByIDsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IDs cannot be empty"})
		return
	}

	if len(req.IDs) > 50 { // 限制一次最多获取 50 个
		c.JSON(http.StatusBadRequest, gin.H{"error": "Too many IDs, maximum 50"})
		return
	}

	generations, err := h.imageService.GetImageGenerationsByIDs(req.IDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get images"})
		return
	}

	// 构建响应数据
	images := make([]gin.H, len(generations))
	for i, generation := range generations {
		imageURL := "/files/" + generation.FilePath
		images[i] = gin.H{
			"id":              generation.ID,
			"prompt":          generation.Prompt,
			"negative_prompt": generation.NegativePrompt,
			"seed":            generation.Seed,
			"steps":           generation.Steps,
			"width":           generation.Width,
			"height":          generation.Height,
			"style_preset_id": generation.StylePresetID,
			"image_url":       imageURL,
			"status":          generation.Status,
			"error_message":   generation.ErrorMessage,
			"generation_time": generation.GenerationTime,
			"created_at":      generation.CreatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"images": images,
	})
}
