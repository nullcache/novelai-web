"use client";

import { useEffect, useRef, useState } from "react";

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact";
  className?: string;
}

declare global {
  interface Window {
    turnstile: {
      render: (
        element: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: (error: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

export function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = "auto",
  size = "normal",
  className = "",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // 加载 Turnstile 脚本
  useEffect(() => {
    if (typeof window !== "undefined" && !window.turnstile) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsScriptLoaded(true);
      };
      script.onerror = () => {
        console.error("Failed to load Turnstile script");
        onError?.("Failed to load Turnstile script");
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      setIsScriptLoaded(true);
    }
  }, [onError]);

  // 渲染 Turnstile 组件
  useEffect(() => {
    if (isScriptLoaded && containerRef.current && !isLoaded && siteKey) {
      try {
        const widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          "error-callback": onError,
          "expired-callback": onExpire,
          theme,
          size,
        });
        widgetIdRef.current = widgetId;
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to render Turnstile:", error);
        onError?.("Failed to render Turnstile");
      }
    }
  }, [isScriptLoaded, siteKey, onVerify, onError, onExpire, theme, size, isLoaded]);

  // 清理
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          console.error("Failed to remove Turnstile widget:", error);
        }
      }
    };
  }, []);

  // 重置方法
  const reset = () => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch (error) {
        console.error("Failed to reset Turnstile:", error);
      }
    }
  };

  // 获取响应方法
  const getResponse = () => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        return window.turnstile.getResponse(widgetIdRef.current);
      } catch (error) {
        console.error("Failed to get Turnstile response:", error);
        return "";
      }
    }
    return "";
  };

  return (
    <div className={className}>
      <div ref={containerRef} />
      {!isScriptLoaded && (
        <div className="text-sm text-muted-foreground">
          Loading verification...
        </div>
      )}
    </div>
  );
}

// 导出重置和获取响应的方法
export { Turnstile as default };
