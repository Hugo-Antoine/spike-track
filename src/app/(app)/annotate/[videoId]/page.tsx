"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { AnnotationCanvas } from "~/app/_components/annotation/AnnotationCanvas";
import { AnnotationControls } from "~/app/_components/annotation/AnnotationControls";
import { AnnotationStats } from "~/app/_components/annotation/AnnotationStats";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Lock } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { useAnnotationBuffer } from "~/hooks/use-annotation-buffer";
import { useAnnotationData } from "~/hooks/use-annotation-data";
import { getFrameUrl } from "~/lib/frame-url";

export default function AnnotatePage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const resolvedParams = use(params);
  const videoId = resolvedParams.videoId;
  const router = useRouter();
  const { toast } = useToast();
  const utils = api.useUtils();

  const [currentFrame, setCurrentFrame] = useState(1);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );

  // Guard: redirect if user has a different in_progress video
  const { data: progressData } = api.annotation.getMyProgress.useQuery();
  useEffect(() => {
    if (progressData?.current && progressData.current.videoId !== videoId) {
      // Allow viewing validated/completed videos without redirect
      const isReviewing =
        progressData.completed.some((v) => v.id === videoId) ||
        progressData.validated.some((v) => v.id === videoId);
      if (!isReviewing) {
        router.replace(`/annotate/${progressData.current.videoId}`);
      }
    }
    // Set read-only if video is validated
    if (progressData?.validated.some((v) => v.id === videoId)) {
      setIsReadOnly(true);
    }
  }, [progressData, videoId, router]);

  // Annotation buffer
  const { addToBuffer, manualSave, pendingCount, isSaving, countdown } =
    useAnnotationBuffer({ videoId });

  // Annotation data (bulk cache)
  const {
    getFrameAnnotation,
    getPreviousVisible,
    setLocalAnnotation,
    isLoading: isAnnotationsLoading,
  } = useAnnotationData(videoId);

  // Queries — all fire in parallel (no `enabled` gating)
  const { data: video } = api.video.getById.useQuery(
    { id: videoId },
    { staleTime: Infinity },
  );

  const { data: stats } = api.annotation.getStats.useQuery({ videoId });

  const { data: nextUnannotated } = api.annotation.getNextFrame.useQuery({
    videoId,
  });

  // Derived annotation data (instant, from local cache)
  const currentAnnotation = getFrameAnnotation(currentFrame);
  const previousAnnotations = getPreviousVisible(currentFrame);
  const isAnnotated = currentAnnotation !== null;

  const allAnnotated = nextUnannotated?.completed === true;

  const handleSaveAndNavigate = async () => {
    await manualSave();
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
  };

  const handleNavigateWithoutSaving = () => {
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      // Ctrl+S for manual save
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        void manualSave();
        return;
      }

      // Navigation shortcuts
      if (e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "a":
            e.preventDefault();
            handleGoToFirst();
            break;
          case "e":
            e.preventDefault();
            handleGoToNextUnannotated();
            break;
        }
      } else {
        switch (e.key.toLowerCase()) {
          case "a":
            e.preventDefault();
            handlePrevFrame();
            break;
          case "e":
            e.preventDefault();
            handleNextFrame();
            break;
          case "z":
            e.preventDefault();
            handleNoBall();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentFrame, video, manualSave]);

  // Handlers
  const handleAnnotate = (x: number, y: number) => {
    if (isReadOnly) return;

    addToBuffer({
      frameNumber: currentFrame,
      x,
      y,
      ballVisible: true,
    });

    setLocalAnnotation(currentFrame, { x, y, ballVisible: true });

    if (video && currentFrame < video.totalFrames) {
      setCurrentFrame(currentFrame + 1);
    }
  };

  const handleNoBall = () => {
    if (isReadOnly) return;

    addToBuffer({
      frameNumber: currentFrame,
      ballVisible: false,
    });

    setLocalAnnotation(currentFrame, { x: null, y: null, ballVisible: false });

    if (video && currentFrame < video.totalFrames) {
      setCurrentFrame(currentFrame + 1);
    }
  };

  const handlePrevFrame = () => {
    if (currentFrame > 1) {
      setCurrentFrame(currentFrame - 1);
    }
  };

  const handleNextFrame = () => {
    if (video && currentFrame < video.totalFrames) {
      setCurrentFrame(currentFrame + 1);
    }
  };

  const handleGoToFirst = () => {
    setCurrentFrame(1);
  };

  const handleGoToNextUnannotated = () => {
    if (nextUnannotated && !nextUnannotated.completed) {
      setCurrentFrame(nextUnannotated.frameNumber!);
    }
  };

  const markCompletedMut = api.annotation.markCompleted.useMutation({
    onSuccess: () => {
      void utils.annotation.getMyProgress.invalidate();
      toast({
        title: "Vidéo marquée comme terminée",
        description: "Vous pouvez la revoir et la valider depuis le dashboard.",
      });
      router.push("/dashboard");
    },
    onError: (err) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Derive status for the badge
  const videoStatus:
    | "validated"
    | "completed"
    | "all_annotated"
    | "in_progress" = isReadOnly
    ? "validated"
    : progressData?.completed.some((v) => v.id === videoId)
      ? "completed"
      : allAnnotated
        ? "all_annotated"
        : "in_progress";

  // Loading
  if (!video || isAnnotationsLoading || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Build image URL for the current frame
  const imageUrl = video.s3FramesPrefix
    ? getFrameUrl(video.s3FramesPrefix, currentFrame)
    : "";

  return (
    <>
      <div className="bg-background flex h-[calc(100dvh-2.5rem)] flex-col">
        {/* Read-only banner */}
        {isReadOnly && (
          <div className="flex items-center justify-center gap-2 bg-yellow-100 px-4 py-1.5 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
            <Lock className="h-3.5 w-3.5" />
            Vidéo validée — consultation seule
          </div>
        )}

        {/* Stats Header */}
        <AnnotationStats
          videoName={video.name}
          currentFrame={currentFrame}
          totalFrames={video.totalFrames}
          annotated={stats.annotated}
          isAnnotated={isAnnotated}
          pendingCount={pendingCount}
          isSaving={isSaving}
          countdown={countdown}
          onManualSave={manualSave}
          videoStatus={videoStatus}
          onMarkCompleted={() => markCompletedMut.mutate({ videoId })}
          isMarkingCompleted={markCompletedMut.isPending}
        />

        {/* Canvas */}
        <div className="min-h-0 flex-1">
          <AnnotationCanvas
            imageUrl={imageUrl}
            frameNumber={currentFrame}
            s3FramesPrefix={video.s3FramesPrefix}
            cloudinaryPublicId={video.cloudinaryPublicId}
            fps={video.fps}
            totalFrames={video.totalFrames}
            previousAnnotations={previousAnnotations}
            currentAnnotation={
              currentAnnotation?.x !== null && currentAnnotation?.y !== null
                ? currentAnnotation
                  ? {
                      x: currentAnnotation.x,
                      y: currentAnnotation.y,
                      ballVisible: currentAnnotation.ballVisible,
                    }
                  : null
                : null
            }
            onAnnotate={handleAnnotate}
            isAnnotated={isAnnotated}
          />
        </div>

        {/* Controls Footer */}
        <AnnotationControls
          onPrevFrame={handlePrevFrame}
          onNextFrame={handleNextFrame}
          onGoToFirst={handleGoToFirst}
          onGoToNextUnannotated={handleGoToNextUnannotated}
          onNoBall={handleNoBall}
          disabled={false}
        />
      </div>

      {/* Navigation Warning Dialog */}
      <AlertDialog
        open={showNavigationWarning}
        onOpenChange={setShowNavigationWarning}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annotations non sauvegardées</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez {pendingCount} annotation(s) en attente. Voulez-vous les
              sauvegarder ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingNavigation(null)}>
              Annuler
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                handleNavigateWithoutSaving();
                setShowNavigationWarning(false);
              }}
            >
              Non, ignorer
            </Button>
            <AlertDialogAction
              onClick={() => {
                void handleSaveAndNavigate();
                setShowNavigationWarning(false);
              }}
            >
              Oui, sauvegarder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
