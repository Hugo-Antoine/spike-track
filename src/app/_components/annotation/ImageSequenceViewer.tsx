"use client";

import { useImageBuffer } from "~/hooks/use-image-buffer";
import { cn } from "~/lib/utils";

interface ImageSequenceViewerProps {
  s3FramesPrefix: string | null;
  cloudinaryPublicId?: string | null;
  fps: number;
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
  s3FramesPrefix,
  cloudinaryPublicId,
  fps,
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
  const { images } = useImageBuffer({
    s3FramesPrefix,
    cloudinaryPublicId,
    fps,
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
                  onFrameLoad?.(frame);
                }
              }}
              style={{
                position: isActive ? "relative" : "absolute",
                top: 0,
                left: 0,
                opacity: isActive ? 1 : 0,
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
