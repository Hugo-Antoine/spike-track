"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { AnnotationCanvas } from "~/app/_components/annotation/AnnotationCanvas";
import { AnnotationControls } from "~/app/_components/annotation/AnnotationControls";
import { AnnotationStats } from "~/app/_components/annotation/AnnotationStats";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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
import { PartyPopper } from "lucide-react";
import { useToast } from "~/hooks/use-toast";
import { useAnnotationBuffer } from "~/hooks/use-annotation-buffer";
import { useAnnotationData } from "~/hooks/use-annotation-data";
import { getFrameUrlClient } from "~/lib/cloudinary";

export default function AnnotatePage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const resolvedParams = use(params);
  const videoId = resolvedParams.videoId;
  const router = useRouter();
  const { toast } = useToast();

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

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
    { staleTime: Infinity }
  );

  const { data: stats } = api.annotation.getStats.useQuery({ videoId });

  const { data: nextUnannotated } = api.annotation.getNextFrame.useQuery({
    videoId,
  });

  // Derived annotation data (instant, from local cache)
  const currentAnnotation = getFrameAnnotation(currentFrame);
  const previousAnnotations = getPreviousVisible(currentFrame);
  const isAnnotated = currentAnnotation !== null;

  // Check if all frames are annotated
  useEffect(() => {
    if (nextUnannotated?.completed) {
      setIsCompleted(true);
    }
  }, [nextUnannotated]);

  // Navigation avec buffer check
  const navigateTo = (path: string) => {
    if (pendingCount > 0) {
      setPendingNavigation(path);
      setShowNavigationWarning(true);
    } else {
      router.push(path);
    }
  };

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
    addToBuffer({
      frameNumber: currentFrame,
      x,
      y,
      ballVisible: true,
    });

    // Optimistic update in local cache
    setLocalAnnotation(currentFrame, { x, y, ballVisible: true });

    // Navigate to next frame
    if (video && currentFrame < video.totalFrames - 1) {
      setCurrentFrame(currentFrame + 1);
    }
  };

  const handleNoBall = () => {
    addToBuffer({
      frameNumber: currentFrame,
      ballVisible: false,
    });

    // Optimistic update in local cache
    setLocalAnnotation(currentFrame, { x: null, y: null, ballVisible: false });

    // Navigate to next frame
    if (video && currentFrame < video.totalFrames - 1) {
      setCurrentFrame(currentFrame + 1);
    }
  };

  const handlePrevFrame = () => {
    if (currentFrame > 0) {
      setCurrentFrame(currentFrame - 1);
    }
  };

  const handleNextFrame = () => {
    if (video && currentFrame < video.totalFrames - 1) {
      setCurrentFrame(currentFrame + 1);
    }
  };

  const handleGoToFirst = () => {
    setCurrentFrame(0);
  };

  const handleGoToNextUnannotated = () => {
    if (nextUnannotated && !nextUnannotated.completed) {
      setCurrentFrame(nextUnannotated.frameNumber!);
    }
  };

  const handleMarkCompleted = async () => {
    // TODO: Implement mark as completed mutation
    toast({
      title: "Vidéo marquée comme terminée",
      description: "Vous pouvez retourner au dashboard",
    });
    router.push("/dashboard");
  };

  // Loading
  if (!video || isAnnotationsLoading || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Completion screen
  if (isCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <PartyPopper className="mx-auto mb-6 h-16 w-16 text-green-500" />
          <h1 className="mb-4 text-3xl font-bold">Toutes les frames annotées !</h1>
          <p className="mb-8 text-muted-foreground">
            Vous avez annoté toutes les frames de cette vidéo. Vous pouvez vérifier
            votre travail ou marquer la vidéo comme terminée.
          </p>
          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={handleMarkCompleted} className="w-full">
              Marquer comme terminé
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsCompleted(false)}
              className="w-full"
            >
              Continuer la vérification
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Image URL generated client-side (no server needed)
  const imageUrl = getFrameUrlClient(video.cloudinaryFolder, currentFrame);

  return (
    <>
      <div className="flex h-[calc(100dvh-2.5rem)] flex-col bg-background">
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
        />

        {/* Canvas */}
        <div className="min-h-0 flex-1">
          <AnnotationCanvas
            imageUrl={imageUrl}
            frameNumber={currentFrame}
            cloudinaryFolder={video.cloudinaryFolder}
            totalFrames={video.totalFrames}
            previousAnnotations={previousAnnotations}
            currentAnnotation={
              currentAnnotation && currentAnnotation.x !== null && currentAnnotation.y !== null
                ? {
                    x: currentAnnotation.x,
                    y: currentAnnotation.y,
                    ballVisible: currentAnnotation.ballVisible,
                  }
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
      <AlertDialog open={showNavigationWarning} onOpenChange={setShowNavigationWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annotations non sauvegardées</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez {pendingCount} annotation(s) en attente. Voulez-vous les sauvegarder ?
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
