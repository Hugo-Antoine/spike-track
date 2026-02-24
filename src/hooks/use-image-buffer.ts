import { useState, useEffect, useCallback, useRef } from "react";
import { getFrameUrl } from "~/lib/frame-url";

interface BufferedImage {
  frameNumber: number;
  url: string;
  status: "loading" | "ready" | "error";
}

interface UseImageBufferOptions {
  s3FramesPrefix: string | null;
  /** @deprecated Legacy Cloudinary support */
  cloudinaryPublicId?: string | null;
  fps: number;
  totalFrames: number;
  currentFrame: number;
  bufferBefore?: number;
  bufferAfter?: number;
  onFrameReady?: (frame: number) => void;
  onFrameError?: (frame: number) => void;
}

interface UseImageBufferReturn {
  images: Map<number, BufferedImage>;
  windowStart: number;
  windowEnd: number;
  isCurrentReady: boolean;
}

function buildUrl(
  s3FramesPrefix: string | null,
  cloudinaryPublicId: string | null | undefined,
  fps: number,
  frameNumber: number,
): string {
  if (s3FramesPrefix) {
    return getFrameUrl(s3FramesPrefix, frameNumber);
  }
  // Legacy Cloudinary fallback
  if (cloudinaryPublicId) {
    const seconds = ((frameNumber - 1) / fps).toFixed(3);
    const cloudName =
      typeof window !== "undefined"
        ? (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "")
        : "";
    return `https://res.cloudinary.com/${cloudName}/video/upload/so_${seconds},w_1280,c_limit,q_auto,f_auto/${cloudinaryPublicId}.jpg`;
  }
  return "";
}

export function useImageBuffer({
  s3FramesPrefix,
  cloudinaryPublicId,
  fps,
  totalFrames,
  currentFrame,
  bufferBefore = 30,
  bufferAfter = 30,
  onFrameReady,
  onFrameError,
}: UseImageBufferOptions): UseImageBufferReturn {
  const [images, setImages] = useState<Map<number, BufferedImage>>(new Map());
  const loadingRef = useRef<Set<number>>(new Set());

  const onFrameReadyRef = useRef(onFrameReady);
  const onFrameErrorRef = useRef(onFrameError);
  useEffect(() => {
    onFrameReadyRef.current = onFrameReady;
    onFrameErrorRef.current = onFrameError;
  }, [onFrameReady, onFrameError]);

  const windowStart = Math.max(1, currentFrame - bufferBefore);
  const windowEnd = Math.min(totalFrames, currentFrame + bufferAfter);

  const preloadImage = useCallback(
    (frameNumber: number) => {
      if (loadingRef.current.has(frameNumber)) return;

      const url = buildUrl(
        s3FramesPrefix,
        cloudinaryPublicId,
        fps,
        frameNumber,
      );
      if (!url) return;

      loadingRef.current.add(frameNumber);
      setImages((prev) => {
        const newMap = new Map(prev);
        newMap.set(frameNumber, { frameNumber, url, status: "loading" });
        return newMap;
      });

      const img = new Image();
      img.src = url;

      img
        .decode()
        .then(() => {
          loadingRef.current.delete(frameNumber);
          setImages((prev) => {
            const newMap = new Map(prev);
            newMap.set(frameNumber, { frameNumber, url, status: "ready" });
            return newMap;
          });
          onFrameReadyRef.current?.(frameNumber);
        })
        .catch(() => {
          loadingRef.current.delete(frameNumber);
          setImages((prev) => {
            const newMap = new Map(prev);
            newMap.set(frameNumber, { frameNumber, url, status: "error" });
            return newMap;
          });
          onFrameErrorRef.current?.(frameNumber);
        });
    },
    [s3FramesPrefix, cloudinaryPublicId, fps],
  );

  useEffect(() => {
    const framesToLoad: number[] = [];

    framesToLoad.push(currentFrame);

    for (
      let offset = 1;
      offset <= Math.max(bufferBefore, bufferAfter);
      offset++
    ) {
      if (currentFrame + offset <= windowEnd) {
        framesToLoad.push(currentFrame + offset);
      }
      if (currentFrame - offset >= windowStart) {
        framesToLoad.push(currentFrame - offset);
      }
    }

    for (const frame of framesToLoad) {
      preloadImage(frame);
    }

    setImages((prev) => {
      let hasFramesToRemove = false;
      for (const [frame] of prev) {
        if (
          frame !== currentFrame &&
          (frame < windowStart || frame > windowEnd)
        ) {
          hasFramesToRemove = true;
          break;
        }
      }

      if (!hasFramesToRemove) return prev;

      const newMap = new Map(prev);
      for (const [frame] of prev) {
        if (
          frame !== currentFrame &&
          (frame < windowStart || frame > windowEnd)
        ) {
          newMap.delete(frame);
          loadingRef.current.delete(frame);
        }
      }
      return newMap;
    });
  }, [
    currentFrame,
    windowStart,
    windowEnd,
    bufferBefore,
    bufferAfter,
    preloadImage,
  ]);

  const currentImage = images.get(currentFrame);
  const isCurrentReady = currentImage?.status === "ready";

  return {
    images,
    windowStart,
    windowEnd,
    isCurrentReady,
  };
}
