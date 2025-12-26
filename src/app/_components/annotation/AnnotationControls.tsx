"use client";

import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { Trash2, Circle, Save, CheckCircle } from "lucide-react";

interface Props {
  hasPoint: boolean;
  onDelete: () => void;
  onNoBall: () => void;
  onSave: () => void;
  onSaveAndNext: () => void;
  disabled: boolean;
}

export function AnnotationControls({
  hasPoint,
  onDelete,
  onNoBall,
  onSave,
  onSaveAndNext,
  disabled,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-4 border-t bg-card p-6">
      <Button
        variant="outline"
        onClick={onDelete}
        disabled={!hasPoint || disabled}
        className="flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Supprimer <Kbd>Suppr</Kbd>
      </Button>

      <Button
        variant="secondary"
        onClick={onNoBall}
        disabled={disabled}
        className="flex items-center gap-2"
      >
        <Circle className="h-4 w-4" />
        Pas de balle <Kbd>Z</Kbd>
      </Button>

      <Button
        variant="outline"
        onClick={onSave}
        disabled={!hasPoint || disabled}
        className="flex items-center gap-2"
      >
        <Save className="h-4 w-4" />
        Sauvegarder <Kbd>E</Kbd>
      </Button>

      <Button
        onClick={onSaveAndNext}
        disabled={!hasPoint || disabled}
        className="flex items-center gap-2"
      >
        <CheckCircle className="h-4 w-4" />
        Valider & Suivant <Kbd>A</Kbd>
      </Button>
    </div>
  );
}
