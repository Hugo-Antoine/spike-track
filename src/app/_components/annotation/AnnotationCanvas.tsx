"use client";

import { useState, useRef } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { MagnifyingGlass } from "./MagnifyingGlass";
import { ImageSequenceViewer } from "./ImageSequenceViewer";
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
  imageUrl: _imageUrl,
  frameNumber,
  cloudinaryFolder,
  totalFrames,
  previousAnnotations,
  currentAnnotation,
  onAnnotate,
  isAnnotated: _isAnnotated,
}: AnnotationCanvasProps) {
  const [hasError, setHasError] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const activeImageRef = useRef<HTMLImageElement | null>(null);

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
    <ImageSequenceViewer
      cloudinaryFolder={cloudinaryFolder}
      totalFrames={totalFrames}
      currentFrame={frameNumber}
      activeImageRef={activeImageRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFrameError={(frame) => {
        if (frame === frameNumber) {
          setHasError(true);
        }
      }}
      className="flex h-full items-center justify-center overflow-hidden bg-muted/30 p-4"
    >
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
    </ImageSequenceViewer>
  );
}
