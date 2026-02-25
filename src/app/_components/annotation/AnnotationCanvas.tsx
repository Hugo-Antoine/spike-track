"use client";

import { useState, useRef, useEffect } from "react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { MagnifyingGlass } from "./MagnifyingGlass";
import { ImageSequenceViewer } from "./ImageSequenceViewer";
import { getFrameUrl } from "~/lib/frame-url";

interface AnnotationCanvasProps {
  imageUrl: string;
  frameNumber: number;
  s3FramesPrefix: string | null;
  cloudinaryPublicId?: string | null;
  fps: number;
  totalFrames: number;
  previousAnnotations: Array<{ frameNumber: number; x: number; y: number }>;
  currentAnnotation: { x: number; y: number; ballVisible: boolean } | null;
  onAnnotate: (x: number, y: number) => void;
  isAnnotated: boolean;
}

export function AnnotationCanvas({
  imageUrl: _imageUrl,
  frameNumber,
  s3FramesPrefix,
  cloudinaryPublicId,
  fps,
  totalFrames,
  previousAnnotations: _previousAnnotations,
  currentAnnotation,
  onAnnotate,
  isAnnotated: _isAnnotated,
}: AnnotationCanvasProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when frame changes
  useEffect(() => {
    setHasError(false);
  }, [frameNumber]);

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [zoom, setZoom] = useState(2);
  const [, forceUpdate] = useState(0);
  const activeImageRef = useRef<HTMLImageElement | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeImageRef.current) return;

    const rect = activeImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const relativeX = x / rect.width;
    const relativeY = y / rect.height;

    if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
      return;
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

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoom((prev) => Math.min(Math.max(prev - e.deltaY * 0.01, 1.5), 10));
  };

  // Build magnifying glass image URL
  const magnifyUrl = s3FramesPrefix
    ? getFrameUrl(s3FramesPrefix, frameNumber)
    : _imageUrl;

  if (hasError) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement de l&apos;image. Veuillez réessayer.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <ImageSequenceViewer
      s3FramesPrefix={s3FramesPrefix}
      cloudinaryPublicId={cloudinaryPublicId}
      fps={fps}
      totalFrames={totalFrames}
      currentFrame={frameNumber}
      bufferBefore={5}
      bufferAfter={5}
      activeImageRef={activeImageRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onFrameLoad={() => forceUpdate((n) => n + 1)}
      onFrameError={(frame) => {
        if (frame === frameNumber) {
          setHasError(true);
        }
      }}
      className="bg-muted/30 flex h-full cursor-none items-center justify-center overflow-hidden p-4"
    >
      {/* SVG Overlay for current annotation */}
      {activeImageRef.current &&
        currentAnnotation &&
        currentAnnotation.ballVisible && (
          <svg
            className="pointer-events-none absolute top-0 left-0 h-full w-full"
            style={{ zIndex: 10 }}
          >
            <circle
              cx={
                currentAnnotation.x *
                activeImageRef.current.getBoundingClientRect().width
              }
              cy={
                currentAnnotation.y *
                activeImageRef.current.getBoundingClientRect().height
              }
              r={4}
              fill="red"
              opacity={0.9}
            />
          </svg>
        )}

      {/* Magnifying glass */}
      {mousePos && activeImageRef.current && (
        <MagnifyingGlass
          imageUrl={magnifyUrl}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          imageElement={activeImageRef.current}
          zoom={zoom}
        />
      )}
    </ImageSequenceViewer>
  );
}
