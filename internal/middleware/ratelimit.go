package middleware

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"novelai-backend/internal/service"

	"github.com/gin-gonic/gin"
)

// RateLimitMiddleware 限流中间件（包含Turnstile验证）
func RateLimitMiddleware(rateLimitService *service.RateLimitService, turnstileSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取客户端IP
		clientIP := getClientIP(c)

		// 检查特权密钥
		privilegeKey := c.GetHeader("X-Privilege-Key")
		if rateLimitService.CheckPrivilegeKey(privilegeKey) {
			// 特权用户跳过所有限制
			rateLimitService.UpdateGlobalRequest()
			rateLimitService.UpdateIPRequest(clientIP)
			c.Next()
			return
		}

		// 检查全局限流
		if !rateLimitService.CheckGlobalRateLimit() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Global rate limit exceeded. Please wait 10 seconds between requests.",
				"code":  "GLOBAL_RATE_LIMIT",
			})
			c.Abort()
			return
		}

		// 检查IP限流
		if !rateLimitService.CheckIPRateLimit(clientIP) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "IP rate limit exceeded. Please wait 30 seconds between requests.",
				"code":  "IP_RATE_LIMIT",
			})
			c.Abort()
			return
		}

		// 检查是否需要Turnstile验证
		if rateLimitService.CheckTurnstileRequired(clientIP) {
			// 检查是否提供了Turnstile token
			turnstileToken := c.GetHeader("X-Turnstile-Token")
			if turnstileToken == "" {
				turnstileToken = c.Query("turnstile_token")
			}

			if turnstileToken != "" {
				// 验证Turnstile token
				if verifyTurnstileToken(turnstileToken, clientIP, turnstileSecret) {
					// 验证成功，更新验证时间
					rateLimitService.UpdateTurnstileVerification(clientIP)
				} else {
					c.JSON(http.StatusUnauthorized, gin.H{
						"error": "Invalid Turnstile token.",
						"code":  "INVALID_TURNSTILE",
					})
					c.Abort()
					return
				}
			} else {
				// 没有提供token，要求验证
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Turnstile verification required.",
					"code":  "TURNSTILE_REQUIRED",
				})
				c.Abort()
				return
			}
		}

		// 更新请求时间
		rateLimitService.UpdateGlobalRequest()
		rateLimitService.UpdateIPRequest(clientIP)

		c.Next()
	}
}

// getClientIP 获取客户端真实IP
func getClientIP(c *gin.Context) string {
	// 优先从 X-Forwarded-For 获取
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// 从 X-Real-IP 获取
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		return xri
	}

	// 从 RemoteAddr 获取
	ip := c.ClientIP()
	return ip
}

// TurnstileResponse Turnstile API响应结构
type TurnstileResponse struct {
	Success     bool     `json:"success"`
	ErrorCodes  []string `json:"error-codes,omitempty"`
	ChallengeTS string   `json:"challenge_ts,omitempty"`
	Hostname    string   `json:"hostname,omitempty"`
}

// verifyTurnstileToken 验证Turnstile token
func verifyTurnstileToken(token, clientIP, secret string) bool {
	if secret == "" {
		// 如果没有配置secret，跳过验证
		return true
	}

	// 准备请求数据
	data := url.Values{}
	data.Set("secret", secret)
	data.Set("response", token)
	data.Set("remoteip", clientIP)

	// 创建HTTP请求
	req, err := http.NewRequest("POST", "https://challenges.cloudflare.com/turnstile/v0/siteverify",
		bytes.NewBufferString(data.Encode()))
	if err != nil {
		return false
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// 发送请求
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	// 解析响应
	var turnstileResp TurnstileResponse
	if err := json.NewDecoder(resp.Body).Decode(&turnstileResp); err != nil {
		return false
	}

	return turnstileResp.Success
}
