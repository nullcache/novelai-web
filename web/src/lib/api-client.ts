// API 客户端工具，处理限流和 Turnstile 验证

interface ApiErrorResponse {
  error: string;
  code?: string;
}

interface ApiClientOptions {
  privilegeKey?: string;
  turnstileToken?: string;
}

class ApiClient {
  private turnstileToken: string | null = null;

  constructor() {
    // 不再在构造函数中加载密钥，而是在每次请求时动态获取
  }

  // 设置 Turnstile token
  setTurnstileToken(token: string) {
    this.turnstileToken = token;
  }

  // 清除 Turnstile token
  clearTurnstileToken() {
    this.turnstileToken = null;
  }

  // 构建请求头
  private buildHeaders(options?: ApiClientOptions): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // 动态从 localStorage 获取特权密钥
    let privilegeKey = options?.privilegeKey;
    if (!privilegeKey && typeof window !== "undefined") {
      privilegeKey = localStorage.getItem("X-Privilege-Key") || undefined;
    }
    if (privilegeKey) {
      headers["X-Privilege-Key"] = privilegeKey;
    }

    // 添加 Turnstile token
    const turnstileToken = options?.turnstileToken || this.turnstileToken;
    if (turnstileToken) {
      headers["X-Turnstile-Token"] = turnstileToken;
    }

    return headers;
  }

  // 通用请求方法
  async request<T = unknown>(
    url: string,
    options: RequestInit & ApiClientOptions = {}
  ): Promise<T> {
    const { privilegeKey, turnstileToken, ...fetchOptions } = options;

    const headers = {
      ...this.buildHeaders({ privilegeKey, turnstileToken }),
      ...fetchOptions.headers,
    };

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorData: ApiErrorResponse = await response.json().catch(() => ({
        error: `HTTP error! status: ${response.status}`,
      }));

      // 处理特定的错误代码
      if (errorData.code === "TURNSTILE_REQUIRED") {
        this.clearTurnstileToken();
        throw new TurnstileRequiredError(errorData.error);
      } else if (errorData.code === "GLOBAL_RATE_LIMIT") {
        throw new RateLimitError(errorData.error, "global");
      } else if (errorData.code === "IP_RATE_LIMIT") {
        throw new RateLimitError(errorData.error, "ip");
      } else if (errorData.code === "INVALID_TURNSTILE") {
        this.clearTurnstileToken();
        throw new InvalidTurnstileError(errorData.error);
      }

      throw new ApiError(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    const result = await response.json();

    // 请求成功后清除 Turnstile token，确保下次需要重新验证
    if (this.turnstileToken) {
      this.clearTurnstileToken();
    }

    return result;
  }

  // GET 请求
  async get<T = unknown>(url: string, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  // POST 请求
  async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT 请求
  async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE 请求
  async delete<T = unknown>(
    url: string,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}

// 自定义错误类
class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

class RateLimitError extends Error {
  public type: "global" | "ip";

  constructor(message: string, type: "global" | "ip") {
    super(message);
    this.name = "RateLimitError";
    this.type = type;
  }
}

class TurnstileRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurnstileRequiredError";
  }
}

class InvalidTurnstileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTurnstileError";
  }
}

// 导出单例实例
const apiClient = new ApiClient();

export {
  apiClient,
  ApiClient,
  ApiError,
  RateLimitError,
  TurnstileRequiredError,
  InvalidTurnstileError,
};
export type { ApiClientOptions };
