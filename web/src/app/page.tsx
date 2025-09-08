"use client";

import { ImageGenerator } from "@/components/image-generator";
import { ErrorBoundary } from "@/components/error-boundary";

export default function Home() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-foreground">
              NovelAI 二次元图片生成器
            </h1>
            <p className="text-muted-foreground mt-1">
              只画二次元谢谢
            </p>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <ImageGenerator />
        </main>
      </div>
    </ErrorBoundary>
  );
}
