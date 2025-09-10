"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Turnstile } from "./turnstile";
import { apiClient } from "@/lib/api-client";

interface TurnstileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  siteKey: string;
}

export function TurnstileDialog({ 
  open, 
  onOpenChange, 
  onVerified,
  siteKey 
}: TurnstileDialogProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = (token: string) => {
    setIsVerifying(true);
    setError(null);
    
    // 保存 Turnstile token
    apiClient.setTurnstileToken(token);
    setIsVerified(true);
    setIsVerifying(false);
    
    toast.success("验证成功！");
    
    // 延迟关闭对话框并调用回调
    setTimeout(() => {
      onVerified();
      onOpenChange(false);
    }, 1000);
  };

  const handleError = (error: string) => {
    setError(error);
    setIsVerifying(false);
    toast.error("验证失败，请重试");
  };

  const handleExpire = () => {
    setIsVerified(false);
    setError("验证已过期，请重新验证");
    apiClient.clearTurnstileToken();
  };

  const handleClose = () => {
    if (!isVerified) {
      setError(null);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            安全验证
          </DialogTitle>
          <DialogDescription>
            为了防止滥用，请完成以下安全验证。
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          {isVerified ? (
            <div className="flex items-center gap-2 p-3 bg-green-100 text-green-800 rounded-md">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">验证成功！正在处理您的请求...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-sm text-muted-foreground text-center">
                请完成下方的验证以继续使用服务
              </div>
              
              {siteKey ? (
                <Turnstile
                  siteKey={siteKey}
                  onVerify={handleVerify}
                  onError={handleError}
                  onExpire={handleExpire}
                  theme="auto"
                  size="normal"
                  className="flex justify-center"
                />
              ) : (
                <div className="text-sm text-muted-foreground">
                  Turnstile 未配置，请联系管理员
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {isVerified ? "完成" : "取消"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
