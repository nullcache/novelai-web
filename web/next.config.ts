import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 在构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在构建时忽略 TypeScript 错误（仅警告）
    ignoreBuildErrors: false,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:8080/api/:path*",
      },
    ];
  },
};

export default nextConfig;
