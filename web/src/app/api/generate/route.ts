import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 构建转发的 headers
    const forwardHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // 转发特权密钥
    const privilegeKey = request.headers.get("X-Privilege-Key");
    if (privilegeKey) {
      forwardHeaders["X-Privilege-Key"] = privilegeKey;
    }

    // 转发 Turnstile token
    const turnstileToken = request.headers.get("X-Turnstile-Token");
    if (turnstileToken) {
      forwardHeaders["X-Turnstile-Token"] = turnstileToken;
    }

    // 转发客户端 IP
    const clientIP =
      request.headers.get("X-Forwarded-For") ||
      request.headers.get("X-Real-IP") ||
      "127.0.0.1"; // NextRequest 没有 ip 属性，使用默认值
    if (clientIP) {
      forwardHeaders["X-Forwarded-For"] = clientIP;
    }

    // 转发请求到 Go 后端
    const response = await fetch(`${BACKEND_URL}/api/generate`, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("API proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
