"use client";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

const statusBadge: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  ready: { label: "Prêt", variant: "default" },
  pending: { label: "En attente", variant: "outline" },
  processing: { label: "En cours", variant: "secondary" },
  error: { label: "Erreur", variant: "destructive" },
};

const progressBadge: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  in_progress: { label: "En cours", variant: "secondary" },
  completed: { label: "Terminé", variant: "default" },
  validated: { label: "Validé", variant: "outline" },
};

export function SegmentDetail({ sourceVideoId }: { sourceVideoId: string }) {
  const { data, isLoading } = api.stats.getSegmentDetails.useQuery({
    sourceVideoId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-sm">Aucun segment trouvé.</p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((seg) => {
        const sb = statusBadge[seg.status] ?? {
          label: seg.status,
          variant: "outline" as const,
        };

        return (
          <Card key={seg.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm">{seg.name}</CardTitle>
                <Badge variant={sb.variant}>{sb.label}</Badge>
                <span className="text-muted-foreground text-xs">
                  {seg.totalFrames.toLocaleString()} frames
                </span>
              </div>
            </CardHeader>
            {seg.annotators.length > 0 && (
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Annotateur</TableHead>
                      <TableHead className="w-28">Statut</TableHead>
                      <TableHead className="w-48">Progression</TableHead>
                      <TableHead className="w-36 text-right">
                        Dernière activité
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seg.annotators.map((a) => {
                      const pb = progressBadge[a.progressStatus] ?? {
                        label: a.progressStatus,
                        variant: "outline" as const,
                      };
                      const pct =
                        seg.totalFrames > 0
                          ? Math.round(
                              (a.totalAnnotated / seg.totalFrames) * 100,
                            )
                          : 0;

                      return (
                        <TableRow key={a.userId}>
                          <TableCell className="font-medium">
                            {a.userName}
                          </TableCell>
                          <TableCell>
                            <Badge variant={pb.variant}>{pb.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-2 flex-1" />
                              <span className="text-muted-foreground text-xs">
                                {a.totalAnnotated}/{seg.totalFrames}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {a.lastActivity
                              ? new Date(a.lastActivity).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
