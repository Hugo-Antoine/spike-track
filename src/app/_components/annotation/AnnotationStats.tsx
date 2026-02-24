"use client";

import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Save, Check } from "lucide-react";

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
  videoStatus: "validated" | "completed" | "all_annotated" | "in_progress";
  onMarkCompleted?: () => void;
  isMarkingCompleted?: boolean;
}

const STATUS_CONFIG = {
  in_progress: { label: "En cours", variant: "secondary" as const },
  all_annotated: { label: "Tout annoté", variant: "default" as const },
  completed: { label: "Terminé", variant: "default" as const },
  validated: { label: "Validé", variant: "outline" as const },
};

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
  videoStatus,
  onMarkCompleted,
  isMarkingCompleted,
}: AnnotationStatsProps) {
  const percentComplete = totalFrames > 0 ? (annotated / totalFrames) * 100 : 0;
  const statusConfig = STATUS_CONFIG[videoStatus];

  return (
    <div className="border-border bg-background flex h-10 shrink-0 items-center gap-3 border-b px-3">
      {/* Video name */}
      <span className="truncate text-sm font-medium">{videoName}</span>

      {/* Status badge */}
      <Badge variant={statusConfig.variant} className="shrink-0 text-[10px]">
        {statusConfig.label}
      </Badge>

      <div className="bg-border h-4 w-px" />

      {/* Frame info */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-xs">Frame</span>
        <span className="text-xs font-medium tabular-nums">{currentFrame}</span>
        {isAnnotated && (
          <Badge
            variant="secondary"
            className="h-4 px-1 text-[10px] leading-none"
          >
            OK
          </Badge>
        )}
      </div>

      <div className="bg-border h-4 w-px" />

      {/* Progress */}
      <div className="flex items-center gap-2">
        <Progress value={percentComplete} className="h-1.5 w-24" />
        <span className="text-muted-foreground text-xs tabular-nums">
          {annotated}/{totalFrames}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mark completed button */}
      {videoStatus === "all_annotated" && onMarkCompleted && (
        <Button
          variant="default"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onMarkCompleted}
          disabled={isMarkingCompleted}
        >
          <Check className="h-3.5 w-3.5" />
          {isMarkingCompleted ? "..." : "Marquer terminé"}
        </Button>
      )}

      {/* Save area */}
      <div className="flex items-center gap-1.5">
        {pendingCount > 0 && countdown !== null && !isSaving && (
          <span className="text-muted-foreground text-[11px] tabular-nums">
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
