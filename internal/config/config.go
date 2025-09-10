package config

import (
	"os"
	"path/filepath"
)

type Config struct {
	NovelAIAPIKey   string
	DatabasePath    string
	ImagesDir       string
	Environment     string
	PrivilegeKey    string
	TurnstileSecret string
}

func New() *Config {
	cfg := &Config{
		NovelAIAPIKey:   getEnv("NOVELAI_API_KEY", ""),
		DatabasePath:    getEnv("DATABASE_PATH", "./data/novelai.db"),
		ImagesDir:       getEnv("IMAGES_DIR", "./data/images"),
		Environment:     getEnv("ENVIRONMENT", "development"),
		PrivilegeKey:    getEnv("PRIVILEGE_KEY", ""),
		TurnstileSecret: getEnv("TURNSTILE_SECRET", ""),
	}

	// 确保目录存在
	ensureDir(filepath.Dir(cfg.DatabasePath))
	ensureDir(cfg.ImagesDir)

	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func ensureDir(dir string) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		panic(err)
	}
}
