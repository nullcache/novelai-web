# NovelAI 图像生成器

基于 Go 后端 + Next.js 前端的 NovelAI 图像生成工具。

## 项目结构

```
.
├── go.mod                          # Go 模块文件
├── main.go                         # Go 后端入口
├── internal/                       # Go 后端代码
│   ├── config/                     # 配置
│   ├── database/                   # 数据库
│   ├── handlers/                   # HTTP 处理器
│   ├── models/                     # 数据模型
│   └── services/                   # 业务服务
├── data/                           # 数据目录（自动创建）
│   ├── novelai.db                  # SQLite 数据库
│   └── images/                     # 生成的图片存储
└── novelai-image-generator/        # Next.js 前端
    └── src/
        ├── app/
        ├── components/
        └── lib/
```

## 功能特性

### 后端 (Go)
- 🚀 **Gin Web 框架** - 高性能 HTTP 服务
- 🗄️ **GORM + SQLite** - 轻量级数据库存储
- 🎨 **NovelAI API 集成** - 调用官方 API 生成图像
- 📁 **文件服务** - 静态文件服务，支持图片访问
- 📊 **数据记录** - 完整记录生成请求和结果

### 前端 (Next.js)
- 🎯 **简化参数** - 只暴露必要参数：seed、提示词、步数、尺寸
- 💾 **本地存储** - IndexedDB 存储生成历史
- 📱 **响应式设计** - 适配桌面和移动设备
- 🔍 **历史管理** - 查看和管理生成历史

## 快速开始

### 1. 环境准备

- Go 1.21+
- Node.js 18+
- NovelAI API Key

### 2. 配置环境变量

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
NOVELAI_API_KEY=your_novelai_api_key_here
DATABASE_PATH=./data/novelai.db
IMAGES_DIR=./data/images
ENVIRONMENT=development
PORT=8080
```

### 3. 启动后端

```bash
# 安装依赖
go mod tidy

# 启动后端服务
go run main.go
```

后端将在 `http://localhost:8080` 启动。

### 4. 启动前端

```bash
cd novelai-image-generator

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端将在 `http://localhost:3000` 启动。

## API 接口

### 生成图像
```http
POST /api/generate
Content-Type: application/json

{
  "prompt": "a beautiful landscape",
  "negative_prompt": "bad quality, blurry",
  "seed": -1,
  "steps": 28,
  "width": 832,
  "height": 1216,
  "style_preset_id": null
}
```

### 获取图像信息
```http
GET /api/images/{id}
```

### 列出图像
```http
GET /api/images?page=1&limit=20
```

### 访问图片文件
```http
GET /files/{year}/{month}/{filename}
```

## 数据库表结构

### image_generations
- 存储图像生成记录
- 包含用户参数、生成状态、文件路径等信息

### style_presets (预留)
- 存储画风预设
- 用于未来扩展功能

## 默认参数

系统使用以下默认参数（用户不可修改）：
```json
{
  "model": "nai-diffusion-4-5-full",
  "scale": 5,
  "sampler": "k_euler_ancestral",
  "scheduler": "karras",
  "decrisper": true,
  "upscale_ratio": 1,
  "variety_boost": false,
  "sm": false,
  "sm_dyn": false
}
```

## 注意事项

1. **API Key 安全**：请妥善保管 NovelAI API Key，不要提交到版本控制
2. **存储空间**：生成的图片会占用磁盘空间，请定期清理
3. **网络要求**：需要稳定的网络连接访问 NovelAI API
4. **费用控制**：每次生成都会消耗 NovelAI 的 Anlas 点数

## 开发说明

### 添加新功能
1. 后端：在 `internal/` 目录下添加相应的服务和处理器
2. 前端：在 `novelai-image-generator/src/` 目录下修改组件

### 数据库迁移
GORM 会自动处理数据库表的创建和更新。

### 日志查看
后端日志会输出到控制台，包含请求信息和错误详情。
