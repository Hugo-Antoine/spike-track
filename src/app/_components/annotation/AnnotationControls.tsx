"use client";

import { Button } from "~/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  EyeOff,
} from "lucide-react";

interface AnnotationControlsProps {
  onPrevFrame: () => void;
  onNextFrame: () => void;
  onGoToFirst: () => void;
  onGoToNextUnannotated: () => void;
  onNoBall: () => void;
  disabled: boolean;
}

export function AnnotationControls({
  onPrevFrame,
  onNextFrame,
  onGoToFirst,
  onGoToNextUnannotated,
  onNoBall,
  disabled,
}: AnnotationControlsProps) {
  const buttons = [
    { icon: ChevronsLeft, shortcut: "Shift+A", onClick: onGoToFirst },
    { icon: ChevronLeft, shortcut: "A", onClick: onPrevFrame },
    { icon: EyeOff, shortcut: "Z", onClick: onNoBall },
    { icon: ChevronRight, shortcut: "E", onClick: onNextFrame },
    { icon: ChevronsRight, shortcut: "Shift+E", onClick: onGoToNextUnannotated },
  ];

  return (
    <div className="flex shrink-0 items-center justify-center gap-1.5 border-t border-border bg-background px-3 py-1.5">
      {buttons.map((btn) => (
        <Button
          key={btn.shortcut}
          variant="outline"
          onClick={btn.onClick}
          disabled={disabled}
          className="h-8 w-28 gap-1.5 text-xs"
        >
          <btn.icon className="h-3.5 w-3.5 shrink-0" />
          <kbd className="font-mono text-[10px] text-muted-foreground">
            {btn.shortcut}
          </kbd>
        </Button>
      ))}
    </div>
  );
}
