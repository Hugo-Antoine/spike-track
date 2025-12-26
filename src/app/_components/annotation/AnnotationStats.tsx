"use client";

import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Clock } from "lucide-react";

interface Props {
  currentFrame: number;
  totalFrames: number;
  annotated: number;
  percentComplete: number;
  sessionDuration: number; // in seconds
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export function AnnotationStats({
  currentFrame,
  totalFrames,
  annotated,
  percentComplete,
  sessionDuration,
}: Props) {
  return (
    <div className="border-b p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-3">
            <Badge variant="outline">
              Frame: {currentFrame} / {totalFrames}
            </Badge>
            <Badge variant="outline">Annotated: {annotated}</Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(sessionDuration)}
            </Badge>
          </div>
          <Badge>{percentComplete.toFixed(1)}%</Badge>
        </div>
        <Progress value={percentComplete} className="h-2" />
      </div>
    </div>
  );
}
