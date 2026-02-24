"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { PlayCircle, CheckCircle2, BarChart3, Loader2 } from "lucide-react";
import { useToast } from "~/hooks/use-toast";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
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

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-8 py-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
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

  const { current, completed } = progressData;

  // Calculate personal stats
  const videosInProgress = current ? 1 : 0;
  const videosCompleted = completed.length;
  const totalAnnotated = completed.reduce(
    (sum, v) => sum + v.totalAnnotated,
    current?.totalAnnotated ?? 0,
  );

  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Annotation Dashboard</h1>

        {/* Personal Stats */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Vos statistiques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{videosInProgress}</p>
                  <p className="text-muted-foreground text-sm">
                    vidéo en cours
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{videosCompleted}</p>
                  <p className="text-muted-foreground text-sm">
                    vidéo{videosCompleted > 1 ? "s" : ""} terminée
                    {videosCompleted > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{totalAnnotated}</p>
                  <p className="text-muted-foreground text-sm">
                    frames annotées au total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Current Video or Queue Button */}
        <section className="mb-12">
          {current ? (
            <>
              <h2 className="mb-4 text-2xl font-semibold">Vidéo en cours</h2>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {current.videoName}
                    </h3>
                    <p className="text-muted-foreground mt-2">
                      Frame {current.lastFrame} / {current.totalFrames}
                    </p>
                    <Badge className="mt-2" variant="outline">
                      {current.percentComplete.toFixed(1)}% Complete
                    </Badge>
                  </div>
                  <Link href={`/annotate/${current.videoId}`}>
                    <Button size="lg" className="flex items-center gap-2">
                      <PlayCircle className="h-5 w-5" />
                      Continuer
                    </Button>
                  </Link>
                </div>
              </Card>
            </>
          ) : (
            <Card className="mx-auto max-w-md p-8 text-center">
              <PlayCircle className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h2 className="mb-2 text-xl font-semibold">Prêt à annoter ?</h2>
              <p className="text-muted-foreground mb-6">
                Cliquez pour recevoir une vidéo à annoter automatiquement.
              </p>
              <Button
                size="lg"
                className="w-full"
                onClick={() => assignNext.mutate()}
                disabled={assignNext.isPending}
              >
                {assignNext.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Attribution en cours...
                  </>
                ) : (
                  "Annoter la prochaine vidéo"
                )}
              </Button>
            </Card>
          )}
        </section>

        {/* Completed Videos Section */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">
            Vidéos terminées ({completed.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completed.map((video) => (
              <Card key={video.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
                    <h3 className="font-semibold">{video.name}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {video.totalAnnotated} / {video.totalFrames} annotated
                    </p>
                    {video.completedAt && (
                      <p className="text-muted-foreground/70 mt-1 text-xs">
                        Terminé le{" "}
                        {new Date(video.completedAt).toLocaleDateString(
                          "fr-FR",
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {completed.length === 0 && (
            <p className="text-muted-foreground">
              Aucune vidéo terminée pour le moment.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
