"use client";

import { Progress } from "~/components/ui/progress";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface SegmentStatus {
  id: string;
  name: string;
  status: string;
  totalFrames: number;
}

interface SegmentImportProgressProps {
  segments: SegmentStatus[];
  allReady: boolean;
}

export function SegmentImportProgress({
  segments,
  allReady,
}: SegmentImportProgressProps) {
  const readyCount = segments.filter((s) => s.status === "ready").length;
  const errorCount = segments.filter((s) => s.status === "error").length;
  const total = segments.length;
  const percent = total > 0 ? ((readyCount + errorCount) / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span>
          {allReady ? (
            "Traitement terminé"
          ) : (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Traitement en cours...
            </span>
          )}
        </span>
        <span className="text-muted-foreground">
          {readyCount + errorCount} / {total}
        </span>
      </div>

      <Progress value={percent} />

      {segments.length > 0 && (
        <div className="space-y-1">
          {segments.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              {s.status === "ready" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
              ) : s.status === "error" ? (
                <XCircle className="h-4 w-4 shrink-0 text-red-500" />
              ) : (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
              )}
              <span className="truncate">{s.name}</span>
              {s.status === "ready" && s.totalFrames > 0 && (
                <span className="text-muted-foreground text-xs">
                  ({s.totalFrames} frames)
                </span>
              )}
              {s.status === "error" && (
                <span className="text-muted-foreground text-xs">(erreur)</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
