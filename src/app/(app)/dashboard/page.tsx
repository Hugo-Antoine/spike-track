"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { PlayCircle, CheckCircle2, Video, BarChart3 } from "lucide-react";

export default function DashboardPage() {
  const { data: progressData, isLoading } = api.annotation.getMyProgress.useQuery();

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

  const { current, available, completed } = progressData;

  // Calculate personal stats
  const videosInProgress = current ? 1 : 0;
  const videosCompleted = completed.length;
  const totalAnnotated = completed.reduce(
    (sum, v) => sum + v.totalAnnotated,
    current?.totalAnnotated ?? 0
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
                  <p className="text-sm text-muted-foreground">vidéo en cours</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{videosCompleted}</p>
                  <p className="text-sm text-muted-foreground">
                    vidéo{videosCompleted > 1 ? "s" : ""} terminée{videosCompleted > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{totalAnnotated}</p>
                  <p className="text-sm text-muted-foreground">frames annotées au total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Current Video Section */}
        {current && (
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Current Video</h2>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{current.videoName}</h3>
                  <p className="mt-2 text-muted-foreground">
                    Frame {current.lastFrame} / {current.totalFrames}
                  </p>
                  <Badge className="mt-2" variant="outline">
                    {current.percentComplete.toFixed(1)}% Complete
                  </Badge>
                </div>
                <Link href={`/annotate/${current.videoId}`}>
                  <Button size="lg" className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5" />
                    Continue
                  </Button>
                </Link>
              </div>
            </Card>
          </section>
        )}

        {/* Available Videos Section */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            Available Videos ({available.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {available.map((video) => (
              <Card key={video.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <Video className="mb-2 h-8 w-8 text-muted-foreground" />
                    <h3 className="font-semibold">{video.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {video.totalFrames} frames @ {video.fps}fps
                    </p>
                  </div>
                </div>
                <Link href={`/annotate/${video.id}`} className="mt-4 block">
                  <Button className="w-full">Start Annotating</Button>
                </Link>
              </Card>
            ))}
          </div>
          {available.length === 0 && (
            <p className="text-muted-foreground">No videos available to annotate.</p>
          )}
        </section>

        {/* Completed Videos Section */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold">
            Completed Videos ({completed.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completed.map((video) => (
              <Card key={video.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <CheckCircle2 className="mb-2 h-8 w-8 text-green-500" />
                    <h3 className="font-semibold">{video.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {video.totalAnnotated} / {video.totalFrames} annotated
                    </p>
                    {video.completedAt && (
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        Completed:{" "}
                        {new Date(video.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {completed.length === 0 && (
            <p className="text-muted-foreground">No completed videos yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
