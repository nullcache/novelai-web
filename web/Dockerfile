# 使用官方 Node.js 镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 复制根目录的 .env 文件到前端目录（构建时需要）
COPY ../.env .env

# 构建应用（不使用 turbopack）
RUN npm run build:prod

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# 运行应用
CMD ["npm", "start"]
