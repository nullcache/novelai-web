package main

import (
	"log"
	"os"

	"novelai-backend/internal/config"
	"novelai-backend/internal/database"
	"novelai-backend/internal/handler"
	"novelai-backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// 初始化配置
	cfg := config.New()

	// 初始化数据库
	db, err := database.Initialize(cfg.DatabasePath)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// 初始化服务
	novelaiService := service.NewNovelAIService(cfg.NovelAIAPIKey)
	imageService := service.NewImageService(db, cfg.ImagesDir)

	// 初始化处理器
	imageHandler := handler.NewImageHandler(novelaiService, imageService)

	// 设置 Gin 模式
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建路由
	r := gin.Default()

	// 添加 CORS 中间件
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// API 路由
	api := r.Group("/api")
	{
		api.POST("/generate", imageHandler.GenerateImage)
		api.GET("/images/:id", imageHandler.GetImage)
		api.POST("/images/batch", imageHandler.GetImagesByIDs)
	}

	// 静态文件服务
	r.Static("/files", cfg.ImagesDir)

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
