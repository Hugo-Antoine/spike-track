"use client";

import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Video,
  Film,
  Layers,
  PenTool,
  Users,
  AlertTriangle,
} from "lucide-react";

const stats = [
  { key: "totalSourceVideos", label: "Vidéos sources", icon: Video },
  { key: "totalReadySegments", label: "Segments prêts", icon: Film },
  { key: "totalFrames", label: "Frames totales", icon: Layers },
  { key: "totalAnnotations", label: "Annotations", icon: PenTool },
  { key: "activeAnnotators", label: "Annotateurs actifs", icon: Users },
  { key: "errorSegments", label: "Segments erreur", icon: AlertTriangle },
] as const;

export function GlobalStats() {
  const { data, isLoading } = api.stats.getGlobalStats.useQuery();

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {stats.map(({ key, label, icon: Icon }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
            <Icon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.[key]?.toLocaleString() ?? 0}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
