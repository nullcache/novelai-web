"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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

interface ImageHistoryProps {
  onClose: () => void;
}

export function ImageHistory({ onClose }: ImageHistoryProps) {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [enlargedImage, setEnlargedImage] = useState<GeneratedImage | null>(
    null
  );
  const [enlargedImageIndex, setEnlargedImageIndex] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadImages(currentPage);
  }, [currentPage]);

  const loadImages = async (page: number = 1) => {
    try {
      setIsLoading(true);
      // 从 localStorage 获取所有 ID
      const storedIds = localStorage.getItem("novelai-image-ids");
      if (!storedIds) {
        setImages([]);
        return;
      }

      const allIds = JSON.parse(storedIds) as number[];
      if (allIds.length === 0) {
        setImages([]);
        return;
      }

      // 计算分页范围
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageIds = allIds.slice(startIndex, endIndex);

      if (pageIds.length === 0) {
        setImages([]);
        return;
      }

      // 批量获取当前页的图像信息
      const response = await fetch("/api/images/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: pageIds }),
      });

      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      } else {
        throw new Error("获取图像失败");
      }
    } catch (error) {
      console.error("Failed to load images:", error);
      toast.error("加载图像历史失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.image_url);
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `novelai-generated-${image.seed}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      toast.error("下载图像失败");
    }
  };

  // 获取总ID数量用于分页计算
  const getTotalIds = () => {
    const storedIds = localStorage.getItem("novelai-image-ids");
    if (!storedIds) return 0;
    const allIds = JSON.parse(storedIds) as number[];
    return allIds.length;
  };

  const totalIds = getTotalIds();
  const totalPages = Math.ceil(totalIds / itemsPerPage);

  // 当前页面的图像就是从后端获取的images
  const filteredImages = images.filter(
    (image) =>
      image.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      image.negative_prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 搜索时重置到第一页
  useEffect(() => {
    if (searchQuery && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>图像历史 ({images.length} 张图像)</CardTitle>
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索提示词..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : filteredImages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "没有找到匹配的图像。" : "历史记录中没有图像。"}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto">
                {filteredImages.map((image, index) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={"/api" + image.image_url.replace("/api", "")}
                      alt={`Generated image ${image.id}`}
                      className="w-full aspect-square object-cover rounded-lg cursor-pointer"
                      onClick={() => {
                        setEnlargedImage(image);
                        setEnlargedImageIndex(index);
                      }}
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image);
                        }}
                        size="sm"
                        variant="secondary"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/75 text-white text-xs p-2 rounded max-w-[calc(100%-1rem)]">
                      <p
                        className="truncate cursor-pointer hover:bg-white/10 px-1 py-0.5 rounded transition-colors"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(image.prompt);
                            toast.success("提示词已复制到剪贴板");
                          } catch (error) {
                            toast.error("复制失败");
                          }
                        }}
                        title="点击复制提示词"
                      >
                        {image.prompt}
                      </p>
                      <p className="opacity-75">种子: {image.seed}</p>
                      <p className="opacity-50 text-xs">
                        {new Date(image.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {currentPage} 页，共 {totalPages} 页
                  </span>
                  <Button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
            {filteredImages.length > 1 && (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex =
                      enlargedImageIndex > 0 ? enlargedImageIndex - 1 : 0;
                    setEnlargedImageIndex(newIndex);
                    setEnlargedImage(filteredImages[newIndex]);
                  }}
                  disabled={enlargedImageIndex === 0}
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
                      enlargedImageIndex < filteredImages.length - 1
                        ? enlargedImageIndex + 1
                        : enlargedImageIndex;
                    setEnlargedImageIndex(newIndex);
                    setEnlargedImage(filteredImages[newIndex]);
                  }}
                  disabled={enlargedImageIndex === filteredImages.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100 transition-opacity"
                  size="sm"
                  variant="secondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* 图像计数器 */}
            {filteredImages.length > 1 && (
              <div className="absolute top-4 left-4 bg-black/75 text-white text-sm px-3 py-1 rounded">
                {enlargedImageIndex + 1} / {filteredImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
