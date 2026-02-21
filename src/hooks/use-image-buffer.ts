import { useState, useEffect, useCallback, useRef } from "react";
import { getFrameUrlClient } from "~/lib/cloudinary";

interface BufferedImage {
  frameNumber: number;
  url: string;
  status: "loading" | "ready" | "error";
}

interface UseImageBufferOptions {
  cloudinaryFolder: string;
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

export function useImageBuffer({
  cloudinaryFolder,
  totalFrames,
  currentFrame,
  bufferBefore = 30,
  bufferAfter = 30,
  onFrameReady,
  onFrameError,
}: UseImageBufferOptions): UseImageBufferReturn {
  const [images, setImages] = useState<Map<number, BufferedImage>>(new Map());
  const loadingRef = useRef<Set<number>>(new Set());

  // Use refs for callbacks to avoid recreating preloadImage on every render
  const onFrameReadyRef = useRef(onFrameReady);
  const onFrameErrorRef = useRef(onFrameError);
  useEffect(() => {
    onFrameReadyRef.current = onFrameReady;
    onFrameErrorRef.current = onFrameError;
  }, [onFrameReady, onFrameError]);

  // Calculate window boundaries
  const windowStart = Math.max(0, currentFrame - bufferBefore);
  const windowEnd = Math.min(totalFrames - 1, currentFrame + bufferAfter);

  // Preload a single image
  const preloadImage = useCallback(
    (frameNumber: number) => {
      // Skip if already loading or loaded
      if (loadingRef.current.has(frameNumber)) return;

      const url = getFrameUrlClient(cloudinaryFolder, frameNumber);

      // Mark as loading
      loadingRef.current.add(frameNumber);
      setImages((prev) => {
        const newMap = new Map(prev);
        newMap.set(frameNumber, { frameNumber, url, status: "loading" });
        return newMap;
      });

      // Create image element and decode
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
    [cloudinaryFolder]
  );

  // Effect to manage buffer when currentFrame changes
  useEffect(() => {
    // Preload images in window, prioritizing current frame and nearby frames
    const framesToLoad: number[] = [];

    // Current frame first
    framesToLoad.push(currentFrame);

    // Then expand outward from current frame
    for (let offset = 1; offset <= Math.max(bufferBefore, bufferAfter); offset++) {
      if (currentFrame + offset <= windowEnd) {
        framesToLoad.push(currentFrame + offset);
      }
      if (currentFrame - offset >= windowStart) {
        framesToLoad.push(currentFrame - offset);
      }
    }

    // Start loading
    for (const frame of framesToLoad) {
      preloadImage(frame);
    }

    // Clean up images outside the window (but never remove current frame)
    setImages((prev) => {
      // First check if there's anything to clean up
      let hasFramesToRemove = false;
      for (const [frame] of prev) {
        if (frame !== currentFrame && (frame < windowStart || frame > windowEnd)) {
          hasFramesToRemove = true;
          break;
        }
      }

      // Only create a new Map if we actually need to remove something
      if (!hasFramesToRemove) {
        return prev;
      }

      const newMap = new Map(prev);
      for (const [frame] of prev) {
        if (frame !== currentFrame && (frame < windowStart || frame > windowEnd)) {
          newMap.delete(frame);
          loadingRef.current.delete(frame);
        }
      }
      return newMap;
    });
  }, [currentFrame, windowStart, windowEnd, bufferBefore, bufferAfter, preloadImage]);

  const currentImage = images.get(currentFrame);
  const isCurrentReady = currentImage?.status === "ready";

  return {
    images,
    windowStart,
    windowEnd,
    isCurrentReady,
  };
}
