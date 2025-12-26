"use client";

import { useState, useRef, useEffect } from "react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Preload next 30 frames
  useEffect(() => {
    const preloadFrames = [];
    for (let i = 1; i <= 30; i++) {
      const nextFrame = frameNumber + i;
      if (nextFrame < totalFrames) {
        const img = new Image();
        img.src = getFrameUrlClient(cloudinaryFolder, nextFrame);
        preloadFrames.push(img);
      }
    }
    // Keep references to prevent GC
    return () => {
      preloadFrames.forEach((img) => {
        img.src = "";
      });
    };
  }, [frameNumber, cloudinaryFolder, totalFrames]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
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
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Skeleton className="h-full w-full max-w-6xl" />
      </div>
    );
  }

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
      <div className="relative">
        <img
          ref={imageRef}
          src={imageUrl}
          alt={`Frame ${frameNumber}`}
          className="max-h-full max-w-full select-none"
          draggable={false}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />

        {/* SVG Overlay for annotations */}
        <svg
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
          style={{ zIndex: 10 }}
        >
          {/* Previous annotations (green dots with fade) */}
          {previousAnnotations.map((ann, idx) => {
            const opacity = 1 - idx * 0.15; // Fade: 1, 0.85, 0.70, 0.55, 0.40
            if (!imageRef.current) return null;
            const rect = imageRef.current.getBoundingClientRect();
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
          {currentAnnotation && currentAnnotation.ballVisible && imageRef.current && (
            <circle
              cx={currentAnnotation.x * imageRef.current.getBoundingClientRect().width}
              cy={currentAnnotation.y * imageRef.current.getBoundingClientRect().height}
              r={8}
              fill="red"
              opacity={0.9}
            />
          )}
        </svg>

        {/* Magnifying glass */}
        {mousePos && imageRef.current && (
          <MagnifyingGlass
            imageUrl={imageUrl}
            mouseX={mousePos.x}
            mouseY={mousePos.y}
            imageElement={imageRef.current}
          />
        )}
      </div>
    </div>
  );
}
