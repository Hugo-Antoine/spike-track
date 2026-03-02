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
import { AlertCircle, Lock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
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
    // Set read-only if video is completed or validated
    if (
      progressData?.validated.some((v) => v.id === videoId) ||
      progressData?.completed.some((v) => v.id === videoId)
    ) {
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
  const {
    data: video,
    isError: isVideoError,
    error: videoError,
  } = api.video.getById.useQuery({ id: videoId }, { staleTime: Infinity });

  const { data: stats } = api.annotation.getStats.useQuery({ videoId });

  const { data: nextUnannotated } = api.annotation.getNextFrame.useQuery({
    videoId,
  });

  // Derived annotation data (instant, from local cache)
  const currentAnnotation = getFrameAnnotation(currentFrame);
  const previousAnnotations = getPreviousVisible(currentFrame);
  const isAnnotated = currentAnnotation !== null;

  const allAnnotated = nextUnannotated?.completed === true;

  // Jump to first unannotated frame on initial load
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (hasInitialized || !nextUnannotated || isReadOnly) return;
    if (!nextUnannotated.completed && nextUnannotated.frameNumber) {
      setCurrentFrame(nextUnannotated.frameNumber);
    }
    setHasInitialized(true);
  }, [nextUnannotated, hasInitialized, isReadOnly]);

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

  const validateMut = api.annotation.validateVideo.useMutation({
    onSuccess: () => {
      void utils.annotation.getMyProgress.invalidate();
      toast({
        title: "Vidéo validée",
        description: "Les annotations sont maintenant verrouillées.",
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

  // Error state
  if (isVideoError) {
    const isNotFound = videoError?.data?.code === "NOT_FOUND";
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="text-destructive mx-auto mb-2 h-10 w-10" />
            <CardTitle>
              {isNotFound ? "Vidéo introuvable" : "Erreur de chargement"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground text-sm">
              {isNotFound
                ? "Cette vidéo n'existe pas ou a été supprimée."
                : "Impossible de charger la vidéo. Veuillez réessayer."}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Retour au dashboard
              </Button>
              {!isNotFound && (
                <Button onClick={() => window.location.reload()}>
                  Réessayer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading skeleton
  if (!video || isAnnotationsLoading || !stats) {
    return (
      <div className="bg-background flex h-[calc(100dvh-2.5rem)] flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="ml-auto h-5 w-24" />
        </div>
        <div className="min-h-0 flex-1 p-4">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        <div className="flex items-center justify-center gap-2 border-t px-4 py-3">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
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
        {videoStatus === "validated" && (
          <div className="flex items-center justify-center gap-2 bg-yellow-100 px-4 py-1.5 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
            <Lock className="h-3.5 w-3.5" />
            Vidéo validée — consultation seule
          </div>
        )}
        {videoStatus === "completed" && (
          <div className="flex items-center justify-center gap-2 bg-blue-100 px-4 py-1.5 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
            <span>Revoyez vos annotations puis validez</span>
            <Button
              size="sm"
              variant="default"
              className="ml-2 h-6 gap-1 px-3 text-xs"
              onClick={() => validateMut.mutate({ videoId })}
              disabled={validateMut.isPending}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {validateMut.isPending ? "..." : "Valider"}
            </Button>
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
            isReadOnly={isReadOnly}
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
          isReadOnly={isReadOnly}
          fps={video.fps}
          currentFrame={currentFrame}
          totalFrames={video.totalFrames}
          onSetFrame={setCurrentFrame}
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
