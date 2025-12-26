"use client";

import { useEffect, useRef, useState } from "react";

interface MagnifyingGlassProps {
  imageUrl: string;
  mouseX: number;
  mouseY: number;
  imageElement: HTMLImageElement | null;
  zoom?: number;
  size?: number;
}

export function MagnifyingGlass({
  imageUrl,
  mouseX,
  mouseY,
  imageElement,
  zoom = 2,
  size = 200,
}: MagnifyingGlassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!imageElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Position de la loupe (offset pour ne pas cacher)
    const offsetX = 30;
    const offsetY = 30;

    setPosition({
      x: mouseX + offsetX,
      y: mouseY + offsetY,
    });

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Calculate source position on image
    const sourceX = mouseX - size / (2 * zoom);
    const sourceY = mouseY - size / (2 * zoom);
    const sourceWidth = size / zoom;
    const sourceHeight = size / zoom;

    // Draw magnified portion
    ctx.drawImage(
      imageElement,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      size,
      size
    );

    // Draw crosshair
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();

    // Draw center circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.fill();
    ctx.stroke();

  }, [imageElement, mouseX, mouseY, imageUrl, zoom, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="pointer-events-none absolute rounded-full border-4 border-white shadow-2xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
      }}
    />
  );
}
