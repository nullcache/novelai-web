/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Download,
  History,
  ChevronLeft,
  ChevronRight,
  Settings,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ImageHistory } from "./image-history";
import { TurnstileDialog } from "./turnstile-dialog";
import {
  apiClient,
  RateLimitError,
  TurnstileRequiredError,
  InvalidTurnstileError,
} from "@/lib/api-client";

// API 响应类型
interface GenerateImageResponse {
  id: number;
  seed: number;
  image_url: string;
}

interface StylePreset {
  id: number;
  name: string;
  description: string;
  prefix_prompt: string;
  suffix_prompt: string;
  prefix_negative_prompt: string;
  suffix_negative_prompt: string;
  enabled: boolean;
}

interface GenerationParams {
  prompt: string;
  negative_prompt: string;
  seed: number;
  steps: number;
  width: number;
  height: number;
  style_preset_id?: number;
}

interface GeneratedImage {
  id: number;
  prompt: string;
  negative_prompt: string;
  seed: number;
  steps: number;
  width: number;
  height: number;
  image_url: string;
  status: string;
  created_at: string;
}

const DEFAULT_PARAMS: GenerationParams = {
  prompt: "",
  negative_prompt:
    "bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
  seed: -1, // -1 表示随机
  steps: 28,
  width: 832,
  height: 1216,
};

export function ImageGenerator() {
  const [params, setParams] = useState<GenerationParams>(DEFAULT_PARAMS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [blurEnabled, setBlurEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("novelai-blur-enabled") === "true";
    }
    return false;
  });
  const [enlargedImage, setEnlargedImage] = useState<GeneratedImage | null>(
    null
  );
  const [showTurnstileDialog, setShowTurnstileDialog] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState(false);

  // 画风预设相关状态
  const [stylePresets, setStylePresets] = useState<StylePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [presetPromptParts, setPresetPromptParts] = useState({
    prefixPrompt: "",
    suffixPrompt: "",
    prefixNegativePrompt: "",
    suffixNegativePrompt: "",
  });

  // Turnstile 配置 - 在实际使用时需要替换为真实的 site key
  const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  // Save blur setting to localStorage
  useEffect(() => {
    localStorage.setItem("novelai-blur-enabled", blurEnabled.toString());
  }, [blurEnabled]);

  // Load recent images on component mount
  useEffect(() => {
    const loadRecentImages = async () => {
      try {
        // 从 localStorage 获取图像 ID 列表
        const storedIds = localStorage.getItem("novelai-image-ids");
        if (!storedIds) return;

        const ids = JSON.parse(storedIds) as number[];
        if (ids.length === 0) return;

        // 取最近的 10 个 ID
        const recentIds = ids.slice(0, 10);

        // 批量获取图像信息
        const response = await fetch("/api/images/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: recentIds }),
        });

        if (response.ok) {
          const data = await response.json();
          setGeneratedImages(data.images || []);
        }
      } catch (error) {
        console.error("Failed to load images:", error);
      }
    };

    loadRecentImages();
  }, []);

  // Load style presets on component mount
  useEffect(() => {
    const loadStylePresets = async () => {
      try {
        const response = await fetch("/api/style-presets");
        if (response.ok) {
          const data = await response.json();
          setStylePresets(data.presets || []);
        }
      } catch (error) {
        console.error("Failed to load style presets:", error);
      }
    };

    loadStylePresets();
  }, []);

  // Handle style preset selection
  const handleStylePresetChange = (presetId: string) => {
    if (presetId === "none") {
      setSelectedPresetId(null);
      setPresetPromptParts({
        prefixPrompt: "",
        suffixPrompt: "",
        prefixNegativePrompt: "",
        suffixNegativePrompt: "",
      });
      setParams((prev) => ({ ...prev, style_preset_id: undefined }));
    } else {
      const preset = stylePresets.find((p) => p.id === parseInt(presetId));
      if (preset) {
        setSelectedPresetId(preset.id);
        setPresetPromptParts({
          prefixPrompt: preset.prefix_prompt,
          suffixPrompt: preset.suffix_prompt,
          prefixNegativePrompt: preset.prefix_negative_prompt,
          suffixNegativePrompt: preset.suffix_negative_prompt,
        });
        setParams((prev) => ({ ...prev, style_preset_id: preset.id }));
      }
    }
  };

  // Handle double click to make preset text editable
  const handlePresetTextDoubleClick = (
    type: keyof typeof presetPromptParts
  ) => {
    const presetText = presetPromptParts[type];
    if (presetText) {
      // 将预设文本添加到对应的输入框中
      if (type === "prefixPrompt" || type === "suffixPrompt") {
        setParams((prev) => ({
          ...prev,
          prompt:
            type === "prefixPrompt"
              ? presetText + prev.prompt
              : prev.prompt + presetText,
        }));
      } else {
        setParams((prev) => ({
          ...prev,
          negative_prompt:
            type === "prefixNegativePrompt"
              ? presetText + prev.negative_prompt
              : prev.negative_prompt + presetText,
        }));
      }
    }

    // 重置预设选择
    setSelectedPresetId(null);
    setPresetPromptParts({
      prefixPrompt: "",
      suffixPrompt: "",
      prefixNegativePrompt: "",
      suffixNegativePrompt: "",
    });
    setParams((prev) => ({ ...prev, style_preset_id: undefined }));
  };

  const handleGenerate = async () => {
    if (!params.prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);

    try {
      // 使用 API 客户端发送请求，后端会根据 style_preset_id 组合文本
      const result = await apiClient.post<GenerateImageResponse>(
        "/api/generate",
        {
          prompt: params.prompt,
          negative_prompt: params.negative_prompt,
          seed: params.seed,
          steps: params.steps,
          width: params.width,
          height: params.height,
          style_preset_id: params.style_preset_id,
        }
      );

      // 构建图像对象
      const newImage: GeneratedImage = {
        id: result.id,
        prompt: params.prompt,
        negative_prompt: params.negative_prompt,
        seed: result.seed,
        steps: params.steps,
        width: params.width,
        height: params.height,
        image_url: `/api/files${result.image_url.replace("/files", "")}`,
        status: "success",
        created_at: new Date().toISOString(),
      };

      // 保存 ID 到 localStorage
      const storedIds = localStorage.getItem("novelai-image-ids");
      const ids = storedIds ? (JSON.parse(storedIds) as number[]) : [];
      ids.unshift(result.id); // 添加到开头

      // 只保留最近的 100 个 ID
      if (ids.length > 100) {
        ids.splice(100);
      }

      localStorage.setItem("novelai-image-ids", JSON.stringify(ids));

      // 更新显示的图像列表 - 新图片追加到前面，不限制数量
      setGeneratedImages((prev) => [newImage, ...prev]);
      setCurrentImageIndex(0); // 重置到第一张图片

      toast.success(`图像生成成功！`);
    } catch (error) {
      console.error("Generation error:", error);

      if (error instanceof TurnstileRequiredError) {
        // 需要 Turnstile 验证 - 保持生成状态，弹出验证框
        setPendingGeneration(true);
        setShowTurnstileDialog(true);
        toast.error("需要完成安全验证");
        return; // 不要在 finally 中重置状态
      } else if (error instanceof InvalidTurnstileError) {
        // Turnstile token 无效 - 清除旧token，保持生成状态，弹出验证框
        apiClient.clearTurnstileToken();
        setPendingGeneration(true);
        setShowTurnstileDialog(true);
        toast.error("验证已过期，请重新验证");
        return; // 不要在 finally 中重置状态
      } else if (error instanceof RateLimitError) {
        // 限流错误
        if (error.type === "global") {
          toast.error("网站当前请求人数过多，请稍后");
        } else if (error.type === "ip") {
          toast.error("30s内只能生成一张图片");
        }
      } else {
        // 其他错误
        const errorMessage =
          error instanceof Error ? error.message : "发生未知错误";
        toast.error(`生成图像失败: ${errorMessage}`);
      }
    } finally {
      // 只有在不需要验证的情况下才重置生成状态
      // 如果需要验证，状态会在验证完成后重置
      if (!pendingGeneration) {
        setIsGenerating(false);
      }
    }
  };

  // 处理 Turnstile 验证完成
  const handleTurnstileVerified = async () => {
    if (pendingGeneration) {
      setPendingGeneration(false);
      setIsGenerating(true); // 确保生成状态为 true

      // 验证完成后，重新尝试生成
      try {
        const result = await apiClient.post<GenerateImageResponse>(
          "/api/generate",
          {
            prompt: params.prompt,
            negative_prompt: params.negative_prompt,
            seed: params.seed,
            steps: params.steps,
            width: params.width,
            height: params.height,
            style_preset_id: params.style_preset_id,
          }
        );

        // 构建图像对象
        const newImage: GeneratedImage = {
          id: result.id,
          prompt: params.prompt,
          negative_prompt: params.negative_prompt,
          seed: result.seed,
          steps: params.steps,
          width: params.width,
          height: params.height,
          image_url: `/api/files${result.image_url.replace("/files", "")}`,
          status: "success",
          created_at: new Date().toISOString(),
        };

        // 保存 ID 到 localStorage
        const storedIds = localStorage.getItem("novelai-image-ids");
        const ids = storedIds ? (JSON.parse(storedIds) as number[]) : [];
        ids.unshift(result.id);

        if (ids.length > 100) {
          ids.splice(100);
        }

        localStorage.setItem("novelai-image-ids", JSON.stringify(ids));

        // 更新显示的图像列表
        setGeneratedImages((prev) => [newImage, ...prev]);
        setCurrentImageIndex(0);

        toast.success(`图像生成成功！`);
      } catch (error) {
        console.error("Generation error after verification:", error);
        const errorMessage =
          error instanceof Error ? error.message : "发生未知错误";
        toast.error(`生成图像失败: ${errorMessage}`);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  // 轮播图导航函数
  const goToPrevious = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentImageIndex < generatedImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handleDownload = async (image: GeneratedImage, index: number) => {
    try {
      const response = await fetch(
        "/api" + image.image_url.replace("/api", "")
      );
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `novelai-generated-${image.seed}-${index}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      toast.error("下载图像失败");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Generation Panel */}
      <div className="space-y-6">
        {/* 顶部控制栏 */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">图像生成参数</h1>
          <div className="flex items-center gap-2">
            {/* 高斯模糊开关 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBlurEnabled(!blurEnabled)}
              className="flex items-center gap-2"
            >
              {blurEnabled ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {blurEnabled ? "关闭模糊" : "开启模糊"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>生成图像</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 画风预设选择器 */}
            <div>
              <Label htmlFor="style-preset" className="block mb-2">
                画风预设（推荐选古风）
              </Label>
              <Select
                value={selectedPresetId ? selectedPresetId.toString() : "none"}
                onValueChange={handleStylePresetChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择画风预设" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  {stylePresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id.toString()}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prompt" className="block mb-2">
                正向提示词
              </Label>
              <div className="space-y-1">
                {/* 预设前缀文本 */}
                {presetPromptParts.prefixPrompt && (
                  <div
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                    onDoubleClick={() =>
                      handlePresetTextDoubleClick("prefixPrompt")
                    }
                    title="双击转为可编辑文本"
                  >
                    {presetPromptParts.prefixPrompt}
                  </div>
                )}

                <Textarea
                  id="prompt"
                  placeholder="描述你想要生成的图像..."
                  value={params.prompt}
                  onChange={(e) =>
                    setParams((prev) => ({ ...prev, prompt: e.target.value }))
                  }
                  className="min-h-[100px]"
                />

                {/* 预设后缀文本 */}
                {presetPromptParts.suffixPrompt && (
                  <div
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                    onDoubleClick={() =>
                      handlePresetTextDoubleClick("suffixPrompt")
                    }
                    title="双击转为可编辑文本"
                  >
                    {presetPromptParts.suffixPrompt}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="negative_prompt" className="block mb-2">
                负向提示词
              </Label>
              <div className="space-y-1">
                {/* 预设前缀文本 */}
                {presetPromptParts.prefixNegativePrompt && (
                  <div
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                    onDoubleClick={() =>
                      handlePresetTextDoubleClick("prefixNegativePrompt")
                    }
                    title="双击转为可编辑文本"
                  >
                    {presetPromptParts.prefixNegativePrompt}
                  </div>
                )}

                <Textarea
                  id="negative_prompt"
                  placeholder="描述你不想要在图像中出现的内容..."
                  value={params.negative_prompt}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      negative_prompt: e.target.value,
                    }))
                  }
                  className="min-h-[80px]"
                />

                {/* 预设后缀文本 */}
                {presetPromptParts.suffixNegativePrompt && (
                  <div
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500 text-sm cursor-pointer hover:bg-gray-100 transition-colors"
                    onDoubleClick={() =>
                      handlePresetTextDoubleClick("suffixNegativePrompt")
                    }
                    title="双击转为可编辑文本"
                  >
                    {presetPromptParts.suffixNegativePrompt}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width" className="block mb-2">
                  宽度
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={params.width}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      width: parseInt(e.target.value) || 832,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="height" className="block mb-2">
                  高度
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={params.height}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      height: parseInt(e.target.value) || 1216,
                    }))
                  }
                />
              </div>
            </div>

            {/* 高级设置 */}
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between"
              >
                <span className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  高级设置
                </span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                />
              </Button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor="seed" className="block mb-2">
                      种子值 (-1 为随机)
                    </Label>
                    <Input
                      id="seed"
                      type="number"
                      value={params.seed}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          seed: parseInt(e.target.value) || -1,
                        }))
                      }
                      placeholder="-1"
                    />
                  </div>

                  <div>
                    <Label className="block mb-2">步数: {params.steps}</Label>
                    <Slider
                      value={[params.steps]}
                      onValueChange={(value) =>
                        setParams((prev) => ({ ...prev, steps: value[0] }))
                      }
                      max={50}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              className="w-full"
            >
              <History className="w-4 h-4 mr-2" />
              {showHistory ? "隐藏" : "显示"} 历史记录
            </Button>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                "生成图像"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results Panel */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>生成的图像</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedImages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>还没有生成图像。</p>
                <p className="text-sm mt-2">
                  输入提示词并点击&quot;生成图像&quot;开始使用。
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* 轮播图容器 */}
                <div className="relative aspect-square overflow-hidden rounded-lg">
                  <img
                    src={
                      "/api" +
                      generatedImages[currentImageIndex].image_url.replace(
                        "/api",
                        ""
                      )
                    }
                    alt={`生成的图像 ${currentImageIndex + 1}`}
                    className={`w-full h-full object-cover transition-all duration-200 cursor-pointer ${
                      blurEnabled ? "filter blur-sm hover:blur-none" : ""
                    }`}
                    onClick={() =>
                      setEnlargedImage(generatedImages[currentImageIndex])
                    }
                  />

                  {/* 下载按钮 */}
                  <Button
                    onClick={() =>
                      handleDownload(
                        generatedImages[currentImageIndex],
                        currentImageIndex
                      )
                    }
                    className="absolute top-2 right-2 opacity-75 hover:opacity-100 transition-opacity"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  {/* 图像信息 */}
                  <div className="absolute bottom-2 left-2 bg-black/75 text-white text-xs p-2 rounded max-w-[calc(100%-1rem)]">
                    <p
                      className="truncate cursor-pointer hover:bg-white/10 px-1 py-0.5 rounded transition-colors"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(
                            generatedImages[currentImageIndex].prompt
                          );
                          toast.success("提示词已复制到剪贴板");
                        } catch (error) {
                          toast.error("复制失败");
                        }
                      }}
                      title="点击复制提示词"
                    >
                      {generatedImages[currentImageIndex].prompt}
                    </p>
                    <p className="text-xs opacity-75">
                      种子: {generatedImages[currentImageIndex].seed}
                    </p>
                  </div>

                  {/* 导航按钮 */}
                  {generatedImages.length > 1 && (
                    <>
                      <Button
                        onClick={goToPrevious}
                        disabled={currentImageIndex === 0}
                        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100 transition-opacity"
                        size="sm"
                        variant="secondary"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={goToNext}
                        disabled={
                          currentImageIndex === generatedImages.length - 1
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100 transition-opacity"
                        size="sm"
                        variant="secondary"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </>
                  )}

                  {/* 图像计数器 */}
                  {generatedImages.length > 1 && (
                    <div className="absolute top-2 left-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                      {currentImageIndex + 1} / {generatedImages.length}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Modal */}
      {showHistory && <ImageHistory onClose={() => setShowHistory(false)} />}

      {/* Turnstile Dialog */}
      <TurnstileDialog
        open={showTurnstileDialog}
        onOpenChange={(open) => {
          setShowTurnstileDialog(open);
          // 只有在取消验证时才重置状态，验证成功时不重置
          if (!open && pendingGeneration && !apiClient.getTurnstileToken()) {
            setPendingGeneration(false);
            setIsGenerating(false);
          }
        }}
        onVerified={handleTurnstileVerified}
        siteKey={TURNSTILE_SITE_KEY}
      />

      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={"/api" + enlargedImage.image_url.replace("/api", "")}
              alt="放大的图像"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* 关闭按钮 */}
            <Button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-4 right-4"
              size="sm"
              variant="secondary"
            >
              <X className="w-4 h-4" />
            </Button>

            {/* 导航按钮 */}
            {generatedImages.length > 1 && (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex =
                      currentImageIndex > 0 ? currentImageIndex - 1 : 0;
                    setCurrentImageIndex(newIndex);
                    setEnlargedImage(generatedImages[newIndex]);
                  }}
                  disabled={currentImageIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100 transition-opacity"
                  size="sm"
                  variant="secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex =
                      currentImageIndex < generatedImages.length - 1
                        ? currentImageIndex + 1
                        : currentImageIndex;
                    setCurrentImageIndex(newIndex);
                    setEnlargedImage(generatedImages[newIndex]);
                  }}
                  disabled={currentImageIndex === generatedImages.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100 transition-opacity"
                  size="sm"
                  variant="secondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* 图像计数器 */}
            {generatedImages.length > 1 && (
              <div className="absolute top-4 left-4 bg-black/75 text-white text-sm px-3 py-1 rounded">
                {currentImageIndex + 1} / {generatedImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
