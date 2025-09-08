package service

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"time"
)

const (
	NovelAIImageURL = "https://image.novelai.net/ai/generate-image"
)

// NovelAIService NovelAI API 服务
type NovelAIService struct {
	apiKey string
	client *http.Client
}

// NewNovelAIService 创建 NovelAI 服务实例
func NewNovelAIService(apiKey string) *NovelAIService {
	return &NovelAIService{
		apiKey: apiKey,
		client: &http.Client{
			Timeout: 120 * time.Second, // 2分钟超时
		},
	}
}

// GenerationRequest 生成请求参数
type GenerationRequest struct {
	Prompt         string `json:"prompt"`
	NegativePrompt string `json:"negative_prompt"`
	Seed           int64  `json:"seed"`
	Steps          int    `json:"steps"`
	Width          int    `json:"width"`
	Height         int    `json:"height"`
}

// NovelAIPayload NovelAI API 请求负载
type NovelAIPayload struct {
	Action     string            `json:"action"`
	Input      string            `json:"input"`
	Model      string            `json:"model"`
	Parameters NovelAIParameters `json:"parameters"`
}

// NovelAIParameters NovelAI API 参数
type NovelAIParameters struct {
	ParamsVersion                         int      `json:"params_version"`
	PreferBrownian                        bool     `json:"prefer_brownian"`
	NegativePrompt                        string   `json:"negative_prompt"`
	Height                                int      `json:"height"`
	Width                                 int      `json:"width"`
	Scale                                 int      `json:"scale"`
	Seed                                  int64    `json:"seed"`
	Sampler                               string   `json:"sampler"`
	NoiseSchedule                         string   `json:"noise_schedule"`
	Steps                                 int      `json:"steps"`
	NSamples                              int      `json:"n_samples"`
	UCPreset                              int      `json:"ucPreset"`
	QualityToggle                         bool     `json:"qualityToggle"`
	AddOriginalImage                      bool     `json:"add_original_image"`
	ControlnetStrength                    int      `json:"controlnet_strength"`
	DeliberateEulerAncestralBug           bool     `json:"deliberate_euler_ancestral_bug"`
	DynamicThresholding                   bool     `json:"dynamic_thresholding"`
	Legacy                                bool     `json:"legacy"`
	LegacyV3Extend                        bool     `json:"legacy_v3_extend"`
	SM                                    bool     `json:"sm"`
	SMDyn                                 bool     `json:"sm_dyn"`
	UncondScale                           int      `json:"uncond_scale"`
	SkipCfgAboveSigma                     *float64 `json:"skip_cfg_above_sigma"`
	UseCoords                             bool     `json:"use_coords"`
	CharacterPrompts                      []any    `json:"characterPrompts"`
	ReferenceImageMultiple                []any    `json:"reference_image_multiple"`
	ReferenceInformationExtractedMultiple []any    `json:"reference_information_extracted_multiple"`
	ReferenceStrengthMultiple             []any    `json:"reference_strength_multiple"`
	V4NegativePrompt                      V4Prompt `json:"v4_negative_prompt"`
	V4Prompt                              V4Prompt `json:"v4_prompt"`
}

// V4Prompt V4 提示词格式
type V4Prompt struct {
	Caption   V4Caption `json:"caption"`
	UseCoords bool      `json:"use_coords"`
	UseOrder  bool      `json:"use_order"`
}

// V4Caption V4 标题格式
type V4Caption struct {
	BaseCaption  string `json:"base_caption"`
	CharCaptions []any  `json:"char_captions"`
}

// GenerateImage 生成图像
func (s *NovelAIService) GenerateImage(req *GenerationRequest) ([]byte, string, error) {
	// 处理随机种子
	seed := req.Seed
	if seed == -1 {
		seed = rand.Int63n(9999999999)
	}

	// 构建请求负载，使用默认参数
	payload := NovelAIPayload{
		Action: "generate",
		Input:  req.Prompt,
		Model:  "nai-diffusion-4-5-full", // 默认模型
		Parameters: NovelAIParameters{
			ParamsVersion:                         3,
			PreferBrownian:                        true,
			NegativePrompt:                        req.NegativePrompt,
			Height:                                req.Height,
			Width:                                 req.Width,
			Scale:                                 5, // 默认值
			Seed:                                  seed,
			Sampler:                               "k_euler_ancestral", // 默认值
			NoiseSchedule:                         "karras",            // 默认值
			Steps:                                 req.Steps,
			NSamples:                              1,
			UCPreset:                              0,
			QualityToggle:                         false,
			AddOriginalImage:                      false,
			ControlnetStrength:                    1,
			DeliberateEulerAncestralBug:           false,
			DynamicThresholding:                   true, // 默认 decrisper: true
			Legacy:                                false,
			LegacyV3Extend:                        false,
			SM:                                    false, // 默认值
			SMDyn:                                 false, // 默认值
			UncondScale:                           1,
			SkipCfgAboveSigma:                     nil, // 默认 variety_boost: false
			UseCoords:                             false,
			CharacterPrompts:                      []any{},
			ReferenceImageMultiple:                []any{},
			ReferenceInformationExtractedMultiple: []any{},
			ReferenceStrengthMultiple:             []any{},
			V4NegativePrompt: V4Prompt{
				Caption: V4Caption{
					BaseCaption:  req.NegativePrompt,
					CharCaptions: []any{},
				},
			},
			V4Prompt: V4Prompt{
				Caption: V4Caption{
					BaseCaption:  req.Prompt,
					CharCaptions: []any{},
				},
				UseCoords: false,
				UseOrder:  true,
			},
		},
	}

	// 序列化请求负载
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, "", fmt.Errorf("failed to marshal payload: %w", err)
	}

	// 创建 HTTP 请求
	req2, err := http.NewRequest("POST", NovelAIImageURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, "", fmt.Errorf("failed to create request: %w", err)
	}

	// 设置请求头
	req2.Header.Set("Authorization", "Bearer "+s.apiKey)
	req2.Header.Set("Content-Type", "application/json")

	// 发送请求
	resp, err := s.client.Do(req2)
	if err != nil {
		return nil, "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// 检查响应状态
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, "", fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	// 读取响应数据
	archiveData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read response: %w", err)
	}

	// 从 ZIP 文件中提取 PNG 图像
	imageData, err := extractPNGFromZip(archiveData)
	if err != nil {
		return nil, "", fmt.Errorf("failed to extract image: %w", err)
	}

	return imageData, string(payloadBytes), nil
}

// extractPNGFromZip 从 ZIP 文件中提取 PNG 图像
func extractPNGFromZip(zipData []byte) ([]byte, error) {
	reader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		return nil, fmt.Errorf("failed to read zip: %w", err)
	}

	for _, file := range reader.File {
		if file.Name[len(file.Name)-4:] == ".png" {
			rc, err := file.Open()
			if err != nil {
				return nil, fmt.Errorf("failed to open file in zip: %w", err)
			}
			defer rc.Close()

			data, err := io.ReadAll(rc)
			if err != nil {
				return nil, fmt.Errorf("failed to read file in zip: %w", err)
			}

			return data, nil
		}
	}

	return nil, fmt.Errorf("no PNG file found in zip")
}
