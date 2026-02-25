"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { useToast } from "~/hooks/use-toast";
import {
  Play,
  Zap,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";

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
        description: `${data.launched} segment(s) en cours de traitement.`,
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

  const launchSegmentMut = api.video.launchSegmentProcessing.useMutation({
    onSuccess: () => {
      void utils.video.listSourceVideos.invalidate();
      toast({ title: "Segment lancé" });
    },
    onError: (err) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // All sources with segments
  const sourcesWithSegments = sourceVideos?.filter(
    (sv) => sv.segments.length > 0,
  );

  // Sources that have pending segments (for "launch all")
  const sourcesWithPending = sourcesWithSegments?.filter((sv) =>
    sv.segments.some((s) => s.status === "pending" || s.status === "error"),
  );

  const totalPending =
    sourcesWithPending?.reduce(
      (sum, sv) =>
        sum +
        sv.segments.filter(
          (s) => s.status === "pending" || s.status === "error",
        ).length,
      0,
    ) ?? 0;

  const handleLaunchAll = () => {
    if (!sourcesWithPending?.length) return;
    for (const sv of sourcesWithPending) {
      launchMut.mutate({ sourceVideoId: sv.id });
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Chargement...</p>;
  }

  if (!sourcesWithSegments?.length) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <Zap className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
        <p className="text-muted-foreground text-sm">
          Aucun segment à afficher.
        </p>
        <p className="text-muted-foreground text-xs">
          Importez une vidéo et découpez des segments depuis la page Gestion
          vidéos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {totalPending > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {totalPending} segment(s) en attente de traitement
          </p>
          <Button onClick={handleLaunchAll} disabled={launchMut.isPending}>
            {launchMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Tout lancer
          </Button>
        </div>
      )}

      {sourcesWithSegments.map((sv) => {
        const pendingCount = sv.segments.filter(
          (s) => s.status === "pending" || s.status === "error",
        ).length;
        const processingCount = sv.segments.filter(
          (s) => s.status === "processing",
        ).length;
        const readyCount = sv.segments.filter(
          (s) => s.status === "ready",
        ).length;
        const total = sv.segments.length;

        return (
          <Collapsible key={sv.id}>
            <Card>
              <CollapsibleTrigger asChild>
                <div className="hover:bg-muted/50 cursor-pointer rounded-t-xl p-6 transition-colors select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                      <CardTitle className="text-base">{sv.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {readyCount > 0 && (
                        <Badge variant="default">
                          {readyCount} prêt{readyCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {processingCount > 0 && (
                        <Badge variant="secondary">
                          {processingCount} en cours
                        </Badge>
                      )}
                      {pendingCount > 0 && (
                        <Badge variant="outline">
                          {pendingCount} en attente
                        </Badge>
                      )}
                      {readyCount === total && (
                        <Badge variant="default">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Terminé
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {pendingCount > 0 && (
                    <div className="mb-4 flex justify-end">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          launchMut.mutate({ sourceVideoId: sv.id });
                        }}
                        disabled={launchMut.isPending}
                      >
                        {launchMut.isPending ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="mr-1 h-3 w-3" />
                        )}
                        Lancer tous les pending ({pendingCount})
                      </Button>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Segment</TableHead>
                        <TableHead className="w-28">Statut</TableHead>
                        <TableHead className="w-48">Progression</TableHead>
                        <TableHead className="w-32 text-right">
                          Frames
                        </TableHead>
                        <TableHead className="w-28 text-right">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sv.segments.map((seg) => {
                        const pct =
                          seg.status === "processing" && seg.totalFrames > 0
                            ? Math.round(
                                (seg.processedFrames / seg.totalFrames) * 100,
                              )
                            : seg.status === "ready"
                              ? 100
                              : 0;

                        return (
                          <TableRow key={seg.id}>
                            <TableCell className="font-medium">
                              {seg.name}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {seg.status === "ready" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                ) : seg.status === "error" ? (
                                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                                ) : seg.status === "processing" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                                )}
                                <span className="text-sm">
                                  {seg.status === "ready"
                                    ? "Prêt"
                                    : seg.status === "processing"
                                      ? "En cours"
                                      : seg.status === "error"
                                        ? "Erreur"
                                        : "En attente"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={pct} className="h-2 flex-1" />
                                <span className="text-muted-foreground w-10 text-right text-xs">
                                  {pct}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {seg.status === "processing"
                                ? `${seg.processedFrames} / ${seg.totalFrames}`
                                : seg.totalFrames > 0
                                  ? seg.totalFrames.toLocaleString()
                                  : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {(seg.status === "pending" ||
                                seg.status === "error") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    launchSegmentMut.mutate({
                                      segmentId: seg.id,
                                    })
                                  }
                                  disabled={launchSegmentMut.isPending}
                                >
                                  <Play className="mr-1 h-3 w-3" />
                                  Lancer
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
