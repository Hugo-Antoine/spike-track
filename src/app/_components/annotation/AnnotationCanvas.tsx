"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { MagnifyingGlass } from "./MagnifyingGlass";
import { getFrameUrlClient } from "~/lib/cloudinary";

interface AnnotationCanvasProps {
  imageUrl: string;
  frameNumber: number;
  cloudinaryFolder: string;
  totalFrames: number;
  previousAnnotations: Array<{ frameNumber: number; x: number; y: number }>;
  currentAnnotation: { x: number; y: number; ballVisible: boolean } | null;
  onAnnotate: (x: number, y: number) => void;
  isAnnotated: boolean;
}

// Nombre d'images à garder en cache dans le DOM
const CACHE_SIZE = 40;
const PRELOAD_AHEAD = 30;

export function AnnotationCanvas({
  imageUrl,
  frameNumber,
  cloudinaryFolder,
  totalFrames,
  previousAnnotations,
  currentAnnotation,
  onAnnotate,
  isAnnotated,
}: AnnotationCanvasProps) {
  const [loadedFrames, setLoadedFrames] = useState<Set<number>>(new Set());
  const [hasError, setHasError] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const activeImageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRefsMap = useRef<Map<number, HTMLImageElement>>(new Map());

  // Calculer quelles frames doivent être dans le DOM
  const framesToRender = useMemo(() => {
    const frames: number[] = [];
    const start = Math.max(0, frameNumber - 5); // 5 frames avant
    const end = Math.min(totalFrames - 1, frameNumber + CACHE_SIZE); // CACHE_SIZE frames après

    for (let i = start; i <= end; i++) {
      frames.push(i);
    }
    return frames;
  }, [frameNumber, totalFrames]);

  // Mettre à jour la ref de l'image active
  useEffect(() => {
    const activeImg = imageRefsMap.current.get(frameNumber);
    if (activeImg) {
      activeImageRef.current = activeImg;
    }
  }, [frameNumber]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeImageRef.current) return;

    const rect = activeImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to relative coordinates (0-1)
    const relativeX = x / rect.width;
    const relativeY = y / rect.height;

    // Validate coordinates are within bounds
    if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
      return; // Ignore clicks outside image
    }

    onAnnotate(relativeX, relativeY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeImageRef.current) return;

    const rect = activeImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  const isCurrentFrameLoaded = loadedFrames.has(frameNumber);

  if (hasError) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement de l'image. Veuillez réessayer.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full items-center justify-center overflow-hidden bg-muted/30 p-4"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Skeleton si la frame courante n'est pas encore chargée */}
      {!isCurrentFrameLoaded && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-50">
          <Skeleton className="h-full w-full max-w-6xl" />
        </div>
      )}

      {/* Container pour toutes les images */}
      <div className="relative">
        {framesToRender.map((frame) => {
          const url = getFrameUrlClient(cloudinaryFolder, frame);
          const isActive = frame === frameNumber;

          return (
            <img
              key={frame}
              ref={(el) => {
                if (el) {
                  imageRefsMap.current.set(frame, el);
                } else {
                  imageRefsMap.current.delete(frame);
                }
              }}
              src={url}
              alt={`Frame ${frame}`}
              className="max-h-full max-w-full select-none"
              draggable={false}
              style={{
                position: isActive ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                visibility: isActive ? 'visible' : 'hidden',
                zIndex: isActive ? 1 : 0,
              }}
              onLoad={() => {
                setLoadedFrames((prev) => new Set(prev).add(frame));
              }}
              onError={() => {
                if (isActive) {
                  setHasError(true);
                }
              }}
            />
          );
        })}

        {/* SVG Overlay for annotations */}
        {activeImageRef.current && (
          <svg
            className="pointer-events-none absolute left-0 top-0 h-full w-full"
            style={{ zIndex: 10 }}
          >
            {/* Previous annotations (green dots with fade) */}
            {previousAnnotations.map((ann, idx) => {
              const opacity = 1 - idx * 0.15;
              const rect = activeImageRef.current!.getBoundingClientRect();
              const pixelX = ann.x * rect.width;
              const pixelY = ann.y * rect.height;

              return (
                <circle
                  key={ann.frameNumber}
                  cx={pixelX}
                  cy={pixelY}
                  r={6}
                  fill="green"
                  opacity={opacity}
                />
              );
            })}

            {/* Current annotation (red dot) */}
            {currentAnnotation && currentAnnotation.ballVisible && (
              <circle
                cx={currentAnnotation.x * activeImageRef.current.getBoundingClientRect().width}
                cy={currentAnnotation.y * activeImageRef.current.getBoundingClientRect().height}
                r={8}
                fill="red"
                opacity={0.9}
              />
            )}
          </svg>
        )}

        {/* Magnifying glass */}
        {mousePos && activeImageRef.current && (
          <MagnifyingGlass
            imageUrl={getFrameUrlClient(cloudinaryFolder, frameNumber)}
            mouseX={mousePos.x}
            mouseY={mousePos.y}
            imageElement={activeImageRef.current}
          />
        )}
      </div>
    </div>
  );
}
