"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { getFrameUrlClient } from "~/lib/cloudinary";

interface Point {
  x: number;
  y: number;
}

interface Props {
  imageUrl: string;
  frameNumber: number;
  cloudinaryFolder: string;
  totalFrames: number;
  previousAnnotations: Array<{ frameNumber: number; x: number; y: number }>;
  currentPoint: Point | null;
  onPointChange: (point: Point | null) => void;
}

export function AnnotationCanvas({
  imageUrl,
  frameNumber,
  cloudinaryFolder,
  totalFrames,
  previousAnnotations,
  currentPoint,
  onPointChange,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<Point | null>(null);

  // Preload next 10 frames for smooth navigation
  useEffect(() => {
    const preloadCount = 10;
    const preloadFrames = Array.from(
      { length: preloadCount },
      (_, i) => frameNumber + i + 1
    );

    preloadFrames.forEach((frame) => {
      if (frame < totalFrames) {
        const img = new Image();
        img.src = getFrameUrlClient(cloudinaryFolder, frame);
      }
    });
  }, [frameNumber, cloudinaryFolder, totalFrames]);

  // Handle image load
  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
  }, [imageUrl]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  // Handle click to set annotation point
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Ensure coordinates are within image bounds
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      onPointChange({ x, y });
    }
  };

  // Track mouse position for custom cursor
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCursorPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setCursorPosition(null);
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-background">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </div>
      )}

      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Échec du chargement de l'image
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div
        ref={canvasRef}
        className="relative cursor-none"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={`Frame ${frameNumber}`}
          className="max-h-[calc(100vh-350px)] w-auto object-contain"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {/* SVG Overlay for annotations and cursor */}
        <svg
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
          style={{ width: "100%", height: "100%" }}
        >
          {/* Previous annotations (green dots) */}
          {previousAnnotations.map((ann, idx) => (
            <circle
              key={`prev-${ann.frameNumber}-${idx}`}
              cx={ann.x}
              cy={ann.y}
              r={6}
              fill="rgb(34, 197, 94)"
              fillOpacity={0.5}
            />
          ))}

          {/* Current annotation (red dot) */}
          {currentPoint && (
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r={8}
              fill="rgb(239, 68, 68)"
              fillOpacity={0.9}
            />
          )}

          {/* Custom crosshair cursor */}
          {cursorPosition && (
            <g>
              <line
                x1={cursorPosition.x - 15}
                y1={cursorPosition.y}
                x2={cursorPosition.x + 15}
                y2={cursorPosition.y}
                stroke="white"
                strokeWidth={2}
                opacity={0.7}
              />
              <line
                x1={cursorPosition.x}
                y1={cursorPosition.y - 15}
                x2={cursorPosition.x}
                y2={cursorPosition.y + 15}
                stroke="white"
                strokeWidth={2}
                opacity={0.7}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Debug info - Image URL */}
      <div className="mt-2 max-w-full overflow-hidden text-center">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold">Frame:</span> {frameNumber}
        </p>
        <p className="truncate text-xs text-muted-foreground" title={imageUrl}>
          {imageUrl}
        </p>
      </div>
    </div>
  );
}
