"use client";

import { useState } from "react";
import { useImageBuffer } from "~/hooks/use-image-buffer";
import { cn } from "~/lib/utils";

interface ImageSequenceViewerProps {
  cloudinaryFolder: string;
  totalFrames: number;
  currentFrame: number;
  bufferBefore?: number;
  bufferAfter?: number;
  activeImageRef?: React.RefObject<HTMLImageElement | null>;
  onFrameLoad?: (frame: number) => void;
  onFrameError?: (frame: number) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: () => void;
  onWheel?: (e: React.WheelEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  className?: string;
}

export function ImageSequenceViewer({
  cloudinaryFolder,
  totalFrames,
  currentFrame,
  bufferBefore = 30,
  bufferAfter = 30,
  activeImageRef,
  onFrameLoad,
  onFrameError,
  onClick,
  onMouseMove,
  onMouseLeave,
  onWheel,
  children,
  className,
}: ImageSequenceViewerProps) {
  const [loadedFrame, setLoadedFrame] = useState<number | null>(null);

  const { images } = useImageBuffer({
    cloudinaryFolder,
    totalFrames,
    currentFrame,
    bufferBefore,
    bufferAfter,
    onFrameReady: onFrameLoad,
    onFrameError,
  });

  return (
    <div
      className={cn("relative", className)}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onWheel={onWheel}
    >
      {/* Container for images - maintains aspect ratio from active image */}
      <div className="relative">
        {Array.from(images.entries()).map(([frame, img]) => {
          const isActive = frame === currentFrame;

          return (
            <img
              key={frame}
              ref={isActive && activeImageRef ? activeImageRef : undefined}
              src={img.url}
              alt={`Frame ${frame}`}
              className="max-h-full max-w-full select-none"
              draggable={false}
              onLoad={() => {
                if (isActive) {
                  setLoadedFrame(frame);
                  onFrameLoad?.(frame);
                }
              }}
              style={{
                // Active image is relative to set container dimensions
                // Others are absolute and stacked underneath
                position: isActive ? "relative" : "absolute",
                top: 0,
                left: 0,
                // Use opacity instead of display to keep images in render tree
                opacity: isActive ? 1 : 0,
                // Prevent interaction with hidden images
                pointerEvents: isActive ? "auto" : "none",
              }}
            />
          );
        })}

        {/* Children (overlay elements like annotations, magnifying glass) */}
        {children}
      </div>
    </div>
  );
}
