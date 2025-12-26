"use client";

import { Button } from "~/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, EyeOff } from "lucide-react";
import { Badge } from "~/components/ui/badge";

interface AnnotationControlsProps {
  onPrevFrame: () => void;
  onNextFrame: () => void;
  onPrevUnannotated: () => void;
  onNextUnannotated: () => void;
  onNoBall: () => void;
  onManualSave: () => void;
  pendingCount: number;
  isSaving: boolean;
  disabled: boolean;
}

export function AnnotationControls({
  onPrevFrame,
  onNextFrame,
  onPrevUnannotated,
  onNextUnannotated,
  onNoBall,
  onManualSave,
  pendingCount,
  isSaving,
  disabled,
}: AnnotationControlsProps) {
  return (
    <div className="border-t border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Previous unannotated */}
        <Button
          variant="outline"
          size="lg"
          onClick={onPrevUnannotated}
          disabled={disabled}
          className="flex flex-col gap-1 h-auto py-3"
        >
          <ChevronsLeft className="h-5 w-5" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-medium">Frame non ann.</span>
            <span className="text-xs font-medium">précédente</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Shift+A
            </kbd>
          </div>
        </Button>

        {/* Previous frame */}
        <Button
          variant="outline"
          size="lg"
          onClick={onPrevFrame}
          disabled={disabled}
          className="flex flex-col gap-1 h-auto py-3"
        >
          <ChevronLeft className="h-5 w-5" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-medium">Frame</span>
            <span className="text-xs font-medium">précéd.</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              A
            </kbd>
          </div>
        </Button>

        {/* No ball */}
        <Button
          variant="outline"
          size="lg"
          onClick={onNoBall}
          disabled={disabled}
          className="flex flex-col gap-1 h-auto py-3"
        >
          <EyeOff className="h-5 w-5" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-medium">Pas de ballon</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Z
            </kbd>
          </div>
        </Button>

        {/* Next frame */}
        <Button
          variant="outline"
          size="lg"
          onClick={onNextFrame}
          disabled={disabled}
          className="flex flex-col gap-1 h-auto py-3"
        >
          <ChevronRight className="h-5 w-5" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-medium">Frame</span>
            <span className="text-xs font-medium">suivante</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              E
            </kbd>
          </div>
        </Button>

        {/* Next unannotated */}
        <Button
          variant="outline"
          size="lg"
          onClick={onNextUnannotated}
          disabled={disabled}
          className="flex flex-col gap-1 h-auto py-3"
        >
          <ChevronsRight className="h-5 w-5" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-medium">Frame non ann.</span>
            <span className="text-xs font-medium">suivante</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Shift+E
            </kbd>
          </div>
        </Button>

        {/* Manual save button (top right corner of controls section) */}
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={pendingCount > 0 ? "default" : "secondary"}>
            {pendingCount} en attente
          </Badge>
          <Button
            onClick={onManualSave}
            disabled={pendingCount === 0 || isSaving}
            size="lg"
          >
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-primary-foreground px-1.5 font-mono text-[10px] font-medium text-primary">
              Ctrl+S
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
