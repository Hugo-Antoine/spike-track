"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Eye,
  ShieldCheck,
  PlayCircle,
  ListChecks,
  Loader2,
} from "lucide-react";
import { useToast } from "~/hooks/use-toast";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  in_progress: { label: "En cours", variant: "secondary" },
  completed: { label: "À valider", variant: "outline" },
  validated: { label: "Validée", variant: "default" },
};

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const utils = api.useUtils();
  const { data: progressData, isLoading } =
    api.annotation.getMyProgress.useQuery();

  const assignNext = api.queue.assignNextVideo.useMutation({
    onSuccess: (data) => {
      if (data.type === "assigned" || data.type === "continue") {
        router.push(`/annotate/${data.videoId}`);
      } else {
        toast({
          title: "Aucune vidéo disponible",
          description:
            "Toutes les vidéos ont été annotées. Revenez plus tard !",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateMut = api.annotation.validateVideo.useMutation({
    onSuccess: () => {
      void utils.annotation.getMyProgress.invalidate();
      toast({
        title: "Vidéo validée",
        description: "Les annotations sont maintenant verrouillées.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Error loading data</p>
      </div>
    );
  }

  const { current, completed, validated } = progressData;

  // Build a flat list of all videos sorted: in_progress first, then completed, then validated
  const allVideos = [
    ...(current
      ? [
          {
            id: current.videoId,
            name: current.videoName,
            status: "in_progress" as const,
            totalFrames: current.totalFrames,
            totalAnnotated: current.totalAnnotated,
            percentComplete: current.percentComplete,
            completedAt: null as Date | null,
          },
        ]
      : []),
    ...completed.map((v) => ({
      id: v.id,
      name: v.name,
      status: "completed" as const,
      totalFrames: v.totalFrames,
      totalAnnotated: v.totalAnnotated,
      percentComplete: (v.totalAnnotated / v.totalFrames) * 100,
      completedAt: v.completedAt,
    })),
    ...validated.map((v) => ({
      id: v.id,
      name: v.name,
      status: "validated" as const,
      totalFrames: v.totalFrames,
      totalAnnotated: v.totalAnnotated,
      percentComplete: (v.totalAnnotated / v.totalFrames) * 100,
      completedAt: v.completedAt,
    })),
  ];

  const totalAnnotations = allVideos.reduce(
    (sum, v) => sum + v.totalAnnotated,
    0,
  );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-4">
        <Button
          onClick={() => assignNext.mutate()}
          disabled={assignNext.isPending}
        >
          {assignNext.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="mr-2 h-4 w-4" />
          )}
          Prochaine vidéo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Mes vidéos ({allVideos.length})
          </CardTitle>
          <CardDescription>
            {totalAnnotations.toLocaleString()} frames annotées au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allVideos.length === 0 ? (
            <div className="py-12 text-center">
              <PlayCircle className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
              <p className="text-muted-foreground text-sm">
                Aucune vidéo pour le moment.
              </p>
              <p className="text-muted-foreground text-xs">
                Cliquez sur &quot;Prochaine vidéo&quot; ci-dessus pour
                commencer.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="w-28">Statut</TableHead>
                  <TableHead className="w-48">Progression</TableHead>
                  <TableHead className="w-32 text-right">Annotées</TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allVideos.map((video) => {
                  const cfg = statusConfig[video.status] ?? {
                    label: video.status,
                    variant: "outline" as const,
                  };
                  const pct = Math.round(video.percentComplete);

                  return (
                    <TableRow key={video.id}>
                      <TableCell className="font-medium">
                        {video.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="h-2 flex-1" />
                          <span className="text-muted-foreground w-10 text-right text-xs">
                            {pct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {video.totalAnnotated} / {video.totalFrames}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {video.status === "in_progress" && (
                            <Link href={`/annotate/${video.id}`}>
                              <Button size="sm">
                                <PlayCircle className="mr-1 h-3.5 w-3.5" />
                                Continuer
                              </Button>
                            </Link>
                          )}
                          {video.status === "completed" && (
                            <>
                              <Link href={`/annotate/${video.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="mr-1 h-3.5 w-3.5" />
                                  Revoir
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                onClick={() =>
                                  validateMut.mutate({ videoId: video.id })
                                }
                                disabled={validateMut.isPending}
                              >
                                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                                Valider
                              </Button>
                            </>
                          )}
                          {video.status === "validated" && (
                            <Link href={`/annotate/${video.id}`}>
                              <Button size="sm" variant="ghost">
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                Consulter
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
