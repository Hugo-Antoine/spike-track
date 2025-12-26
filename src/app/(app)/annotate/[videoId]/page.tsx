"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { AnnotationCanvas } from "~/app/_components/annotation/AnnotationCanvas";
import { AnnotationControls } from "~/app/_components/annotation/AnnotationControls";
import { AnnotationStats } from "~/app/_components/annotation/AnnotationStats";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { PartyPopper } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { getFrameUrlClient } from "~/lib/cloudinary";

interface Point {
  x: number;
  y: number;
}

export default function AnnotatePage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const resolvedParams = use(params);
  const videoId = parseInt(resolvedParams.videoId, 10);
  const router = useRouter();
  const { toast } = useToast();
  const utils = api.useUtils();

  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [noBall, setNoBall] = useState(false);

  // Optimistic frame state for instant UI updates
  const [optimisticFrame, setOptimisticFrame] = useState<{
    frameNumber: number;
    imageUrl: string;
  } | null>(null);

  // Queries
  const { data: frameData, refetch: refetchFrame } =
    api.annotation.getNextFrame.useQuery(
      { videoId },
      {
        refetchOnWindowFocus: false,
        staleTime: 0, // Always fetch fresh data
      }
    );

  const { data: stats, refetch: refetchStats } =
    api.annotation.getStats.useQuery(
      { videoId },
      {
        refetchInterval: 5000, // Refetch every 5 seconds
        refetchOnWindowFocus: false,
      }
    );

  const { data: video } = api.video.getById.useQuery({ id: videoId });

  // Mutation
  const saveAnnotation = api.annotation.saveAnnotation.useMutation({
    onSuccess: async () => {
      toast.success("Annotation saved successfully");
      // Clear optimistic state - server data will take over
      setOptimisticFrame(null);
      // Invalidate and refetch to ensure fresh data
      await utils.annotation.getNextFrame.invalidate({ videoId });
      await utils.annotation.getStats.invalidate({ videoId });
      setCurrentPoint(null);
      setNoBall(false);
    },
    onError: (error) => {
      toast.error(error.message);
      // Revert optimistic update on error
      setOptimisticFrame(null);
      setCurrentPoint(null);
      setNoBall(false);
    },
  });

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (saveAnnotation.isPending) return;

      // Ignore if focus is in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case "a":
          handleSaveAndNext();
          break;
        case "z":
          handleNoBall();
          break;
        case "delete":
          handleDelete();
          break;
        case "e":
          handleSave();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPoint, noBall, saveAnnotation.isPending, frameData]);

  const handleDelete = () => {
    setCurrentPoint(null);
    setNoBall(false);
  };

  const handleNoBall = () => {
    if (!frameData || frameData.completed || !video) return;

    setCurrentPoint(null);
    setNoBall(true);

    // Optimistic update: show next frame immediately
    const nextFrameNumber = frameData.frameNumber! + 1;
    if (nextFrameNumber < video.totalFrames) {
      setOptimisticFrame({
        frameNumber: nextFrameNumber,
        imageUrl: getFrameUrlClient(video.cloudinaryFolder, nextFrameNumber),
      });
    }

    // Auto-save when marking no ball
    saveAnnotation.mutate({
      videoId,
      frameNumber: frameData.frameNumber!,
      ballVisible: false,
    });
  };

  const handleSave = () => {
    if (!frameData || frameData.completed || !video) return;

    if (!currentPoint && !noBall) {
      toast.error("Please mark the ball position or select 'No ball'");
      return;
    }

    // Optimistic update: show next frame immediately
    const nextFrameNumber = frameData.frameNumber! + 1;
    if (nextFrameNumber < video.totalFrames) {
      setOptimisticFrame({
        frameNumber: nextFrameNumber,
        imageUrl: getFrameUrlClient(video.cloudinaryFolder, nextFrameNumber),
      });
    }

    saveAnnotation.mutate({
      videoId,
      frameNumber: frameData.frameNumber!,
      x: currentPoint?.x,
      y: currentPoint?.y,
      ballVisible: !noBall,
    });
  };

  const handleSaveAndNext = () => {
    if (!currentPoint && !noBall) {
      toast.error("Please mark the ball position or select 'No ball'");
      return;
    }
    handleSave();
  };

  // Loading state
  if (!frameData || !stats || !video) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Completion state
  if (frameData.completed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-12 text-center">
          <PartyPopper className="mx-auto mb-6 h-16 w-16 text-green-500" />
          <h1 className="mb-4 text-3xl font-bold">Congratulations!</h1>
          <p className="mb-8 text-muted-foreground">
            You have completed annotating all frames for this video.
          </p>
          <Button
            size="lg"
            onClick={() => router.push("/dashboard")}
            className="w-full"
          >
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // Use optimistic frame if available, otherwise use server data
  const displayFrame = optimisticFrame || {
    frameNumber: frameData.frameNumber!,
    imageUrl: frameData.imageUrl!,
  };

  return (
    <main className="flex h-[calc(100vh-3rem)] flex-col bg-background">
      {/* Stats Header */}
      <AnnotationStats
        currentFrame={stats.currentFrame}
        totalFrames={stats.totalFrames}
        annotated={stats.annotated}
        percentComplete={stats.percentComplete}
        sessionDuration={stats.sessionDuration}
      />

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <AnnotationCanvas
          key={displayFrame.frameNumber} // Force remount when frame changes
          imageUrl={displayFrame.imageUrl}
          frameNumber={displayFrame.frameNumber}
          cloudinaryFolder={video.cloudinaryFolder}
          totalFrames={video.totalFrames}
          previousAnnotations={frameData.previousAnnotations ?? []}
          currentPoint={noBall ? null : currentPoint}
          onPointChange={setCurrentPoint}
        />
      </div>

      {/* Controls Footer */}
      <AnnotationControls
        hasPoint={!!currentPoint || noBall}
        onDelete={handleDelete}
        onNoBall={handleNoBall}
        onSave={handleSave}
        onSaveAndNext={handleSaveAndNext}
        disabled={saveAnnotation.isPending}
      />
    </main>
  );
}
