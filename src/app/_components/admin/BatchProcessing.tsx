"use client";

import { api } from "~/trpc/react";
import { SegmentImportProgress } from "./SegmentImportProgress";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useToast } from "~/hooks/use-toast";
import { Play, Zap } from "lucide-react";

export function BatchProcessing() {
  const { toast } = useToast();
  const utils = api.useUtils();

  const { data: sourceVideos, isLoading } = api.video.listSourceVideos.useQuery(
    undefined,
    {
      refetchInterval: 2000,
    },
  );

  const launchMut = api.video.launchProcessing.useMutation({
    onSuccess: (data) => {
      void utils.video.listSourceVideos.invalidate();
      toast({
        title: "Traitement lancé",
        description: `${data.launched} segments en ${data.batches} batch(es).`,
      });
    },
    onError: (err) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Filter sources that have non-ready segments
  const sourcesWithWork = sourceVideos?.filter((sv) =>
    sv.segments.some((s) => s.status !== "ready"),
  );

  // All sources with pending segments (for "launch all" button)
  const sourcesWithPending = sourceVideos?.filter((sv) =>
    sv.segments.some((s) => s.status === "pending"),
  );

  const handleLaunchAll = () => {
    if (!sourcesWithPending?.length) return;
    for (const sv of sourcesWithPending) {
      launchMut.mutate({ sourceVideoId: sv.id });
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Chargement...</p>;
  }

  if (!sourcesWithWork?.length) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <Zap className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
        <p className="text-muted-foreground text-sm">
          Aucun segment en attente de traitement.
        </p>
        <p className="text-muted-foreground text-xs">
          Ajoutez des segments depuis l&apos;onglet &quot;Import &amp;
          découpage&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global launch button */}
      {sourcesWithPending && sourcesWithPending.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {sourcesWithPending.length} vidéo(s) avec des segments en attente
          </p>
          <Button onClick={handleLaunchAll} disabled={launchMut.isPending}>
            <Play className="mr-2 h-4 w-4" />
            {launchMut.isPending ? "Lancement..." : "Tout lancer"}
          </Button>
        </div>
      )}

      {/* Per-source cards */}
      {sourcesWithWork.map((sv) => {
        const pendingCount = sv.segments.filter(
          (s) => s.status === "pending",
        ).length;
        const processingCount = sv.segments.filter(
          (s) => s.status === "processing",
        ).length;
        const readyCount = sv.segments.filter(
          (s) => s.status === "ready",
        ).length;
        const errorCount = sv.segments.filter(
          (s) => s.status === "error",
        ).length;
        const allReady =
          sv.segments.length > 0 &&
          sv.segments.every((s) => s.status === "ready");
        const hasPending = pendingCount > 0;

        return (
          <Card key={sv.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{sv.name}</CardTitle>
                  <CardDescription className="flex gap-2 pt-1">
                    {pendingCount > 0 && (
                      <Badge variant="outline">{pendingCount} en attente</Badge>
                    )}
                    {processingCount > 0 && (
                      <Badge variant="secondary">
                        {processingCount} en cours
                      </Badge>
                    )}
                    {readyCount > 0 && (
                      <Badge variant="default">{readyCount} prêts</Badge>
                    )}
                    {errorCount > 0 && (
                      <Badge variant="destructive">{errorCount} erreurs</Badge>
                    )}
                  </CardDescription>
                </div>
                {hasPending && (
                  <Button
                    size="sm"
                    onClick={() => launchMut.mutate({ sourceVideoId: sv.id })}
                    disabled={launchMut.isPending}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    Lancer
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <SegmentImportProgress
                segments={sv.segments.map((s) => ({
                  id: s.id,
                  name: s.name,
                  status: s.status,
                  totalFrames: s.totalFrames,
                }))}
                allReady={allReady}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
