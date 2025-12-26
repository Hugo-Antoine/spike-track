"use client";

import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";

interface AnnotationStatsProps {
  currentFrame: number;
  totalFrames: number;
  annotated: number;
  isAnnotated: boolean;
  isCompleted: boolean;
}

export function AnnotationStats({
  currentFrame,
  totalFrames,
  annotated,
  isAnnotated,
  isCompleted,
}: AnnotationStatsProps) {
  const percentComplete = (annotated / totalFrames) * 100;

  return (
    <div className="space-y-3 border-b border-border bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            Frame {currentFrame}
          </h2>
          {isAnnotated && (
            <Badge variant="secondary">Annoté</Badge>
          )}
          {isCompleted && (
            <Badge variant="default" className="bg-green-600">
              Complété
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {annotated} / {totalFrames}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <Progress value={percentComplete} className="h-2" />
      </div>
    </div>
  );
}
