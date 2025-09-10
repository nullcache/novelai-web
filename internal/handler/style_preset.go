package handler

import (
	"net/http"

	"novelai-backend/internal/service"

	"github.com/gin-gonic/gin"
)

// StylePresetHandler 画风预设处理器
type StylePresetHandler struct {
	stylePresetService *service.StylePresetService
}

// NewStylePresetHandler 创建画风预设处理器
func NewStylePresetHandler(stylePresetService *service.StylePresetService) *StylePresetHandler {
	return &StylePresetHandler{
		stylePresetService: stylePresetService,
	}
}

// GetStylePresets 获取所有画风预设
func (h *StylePresetHandler) GetStylePresets(c *gin.Context) {
	presets, err := h.stylePresetService.GetAllStylePresets()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get style presets",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"presets": presets,
	})
}
