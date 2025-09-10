package service

import (
	"sync"
	"time"
)

// IPRecord 记录IP的访问信息
type IPRecord struct {
	LastRequest       time.Time
	TurnstileVerified time.Time
}

// RateLimitService 限流服务
type RateLimitService struct {
	mu                sync.RWMutex
	globalLastRequest time.Time
	ipRecords         map[string]*IPRecord
	privilegeKey      string

	// 限流配置
	globalInterval    time.Duration // 全局限流间隔 (5秒)
	ipInterval        time.Duration // IP限流间隔 (10秒)
	turnstileInterval time.Duration // Turnstile验证间隔 (1分钟)
}

// NewRateLimitService 创建新的限流服务
func NewRateLimitService(privilegeKey string) *RateLimitService {
	return &RateLimitService{
		ipRecords:         make(map[string]*IPRecord),
		privilegeKey:      privilegeKey,
		globalInterval:    10 * time.Second,
		ipInterval:        30 * time.Second,
		turnstileInterval: 1 * 60 * time.Second, // 1分钟
	}
}

// CheckGlobalRateLimit 检查全局限流
func (r *RateLimitService) CheckGlobalRateLimit() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	now := time.Now()
	return now.Sub(r.globalLastRequest) >= r.globalInterval
}

// CheckIPRateLimit 检查IP限流
func (r *RateLimitService) CheckIPRateLimit(ip string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	record, exists := r.ipRecords[ip]
	if !exists {
		return true
	}

	now := time.Now()
	return now.Sub(record.LastRequest) >= r.ipInterval
}

// CheckTurnstileRequired 检查是否需要Turnstile验证
func (r *RateLimitService) CheckTurnstileRequired(ip string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	record, exists := r.ipRecords[ip]
	if !exists {
		return true
	}

	// 如果从未验证过，需要验证
	if record.TurnstileVerified.IsZero() {
		return true
	}

	// 检查是否超过验证间隔时间
	now := time.Now()
	return now.Sub(record.TurnstileVerified) >= r.turnstileInterval
}

// UpdateGlobalRequest 更新全局请求时间
func (r *RateLimitService) UpdateGlobalRequest() {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.globalLastRequest = time.Now()
}

// UpdateIPRequest 更新IP请求时间
func (r *RateLimitService) UpdateIPRequest(ip string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.ipRecords[ip] == nil {
		r.ipRecords[ip] = &IPRecord{}
	}
	r.ipRecords[ip].LastRequest = time.Now()
}

// UpdateTurnstileVerification 更新Turnstile验证时间
func (r *RateLimitService) UpdateTurnstileVerification(ip string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.ipRecords[ip] == nil {
		r.ipRecords[ip] = &IPRecord{}
	}
	r.ipRecords[ip].TurnstileVerified = time.Now()
}

// CheckPrivilegeKey 检查特权密钥
func (r *RateLimitService) CheckPrivilegeKey(key string) bool {
	return r.privilegeKey != "" && key == r.privilegeKey
}

// CleanupOldRecords 清理过期记录（可选的后台任务）
func (r *RateLimitService) CleanupOldRecords() {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-24 * time.Hour) // 清理24小时前的记录

	for ip, record := range r.ipRecords {
		if record.LastRequest.Before(cutoff) && record.TurnstileVerified.Before(cutoff) {
			delete(r.ipRecords, ip)
		}
	}
}
