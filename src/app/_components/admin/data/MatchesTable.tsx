"use client";

import { Fragment, useState } from "react";
import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { SegmentDetail } from "./SegmentDetail";

export function MatchesTable() {
  const { data, isLoading } = api.stats.getSourceVideoStats.useQuery();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Aucune vidéo source trouvée.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Nom</TableHead>
          <TableHead className="w-24 text-right">Segments</TableHead>
          <TableHead className="w-24 text-right">Frames</TableHead>
          <TableHead className="w-48">Progression</TableHead>
          <TableHead className="w-32 text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((sv) => {
          const isExpanded = expandedId === sv.id;
          const progress =
            sv.totalFrames > 0
              ? Math.round((sv.totalAnnotations / sv.totalFrames) * 100)
              : 0;

          return (
            <Fragment key={sv.id}>
              <TableRow
                className="cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : sv.id)}
              >
                <TableCell>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isExpanded && "rotate-90",
                    )}
                  />
                </TableCell>
                <TableCell className="font-medium">{sv.name}</TableCell>
                <TableCell className="text-right">{sv.segmentCount}</TableCell>
                <TableCell className="text-right">
                  {sv.totalFrames.toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-muted-foreground w-10 text-right text-xs">
                      {progress}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {new Date(sv.createdAt).toLocaleDateString("fr-FR")}
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow>
                  <TableCell colSpan={6} className="bg-muted/50 p-4">
                    <SegmentDetail sourceVideoId={sv.id} />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
