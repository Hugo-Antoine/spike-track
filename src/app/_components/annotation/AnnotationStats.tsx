"use client";

import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Save } from "lucide-react";

interface AnnotationStatsProps {
  videoName: string;
  currentFrame: number;
  totalFrames: number;
  annotated: number;
  isAnnotated: boolean;
  pendingCount: number;
  isSaving: boolean;
  countdown: number | null;
  onManualSave: () => void;
}

export function AnnotationStats({
  videoName,
  currentFrame,
  totalFrames,
  annotated,
  isAnnotated,
  pendingCount,
  isSaving,
  countdown,
  onManualSave,
}: AnnotationStatsProps) {
  const percentComplete = totalFrames > 0 ? (annotated / totalFrames) * 100 : 0;

  return (
    <div className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
      {/* Video name */}
      <span className="truncate text-sm font-medium">{videoName}</span>

      <div className="h-4 w-px bg-border" />

      {/* Frame info */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Frame</span>
        <span className="text-xs font-medium tabular-nums">{currentFrame}</span>
        {isAnnotated && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px] leading-none">
            OK
          </Badge>
        )}
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Progress */}
      <div className="flex items-center gap-2">
        <Progress value={percentComplete} className="h-1.5 w-24" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {annotated}/{totalFrames}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save area */}
      <div className="flex items-center gap-1.5">
        {pendingCount > 0 && countdown !== null && !isSaving && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {countdown}s
          </span>
        )}
        {pendingCount > 0 && (
          <Badge variant="outline" className="h-5 text-[10px] tabular-nums">
            {pendingCount}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onManualSave}
          disabled={pendingCount === 0 || isSaving}
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? "..." : "Ctrl+S"}
        </Button>
      </div>
    </div>
  );
}
