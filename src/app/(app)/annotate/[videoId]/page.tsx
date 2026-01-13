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

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Annotation buffer
  const { buffer, addToBuffer, manualSave, pendingCount, isSaving } =
    useAnnotationBuffer({ videoId });

  // Queries
  const { data: video } = api.video.getById.useQuery({ id: videoId });

  const { data: frameData, refetch: refetchFrame } = api.annotation.getFrame.useQuery(
    { videoId, frameNumber: currentFrame },
    { enabled: !!video }
  );

  const { data: stats, refetch: refetchStats } = api.annotation.getStats.useQuery(
    { videoId },
    { refetchInterval: 5000, enabled: !!video }
  );

  const { data: nextUnannotated } = api.annotation.getNextFrame.useQuery(
    { videoId },
    { enabled: !!video }
  );

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
            handlePrevUnannotated();
            break;
          case "e":
            e.preventDefault();
            handleNextUnannotated();
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

  const handlePrevUnannotated = () => {
    // Find previous unannotated frame
    // TODO: Implement with new API query
    toast({
      title: "Fonction en développement",
      description: "Navigation vers frame non annotée précédente",
    });
  };

  const handleNextUnannotated = () => {
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
  if (!video || !frameData || !stats) {
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

  return (
    <>
      <main className="flex h-screen flex-col bg-background">
        {/* Stats Header */}
        <AnnotationStats
          currentFrame={currentFrame}
          totalFrames={video.totalFrames}
          annotated={stats.annotated}
          isAnnotated={frameData.annotation !== null}
          isCompleted={isCompleted}
        />

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <AnnotationCanvas
            imageUrl={frameData.imageUrl}
            frameNumber={currentFrame}
            cloudinaryFolder={video.cloudinaryFolder}
            totalFrames={video.totalFrames}
            previousAnnotations={frameData.previousAnnotations}
            currentAnnotation={
              frameData.annotation && frameData.annotation.x !== null && frameData.annotation.y !== null
                ? {
                    x: frameData.annotation.x,
                    y: frameData.annotation.y,
                    ballVisible: frameData.annotation.ballVisible,
                  }
                : null
            }
            onAnnotate={handleAnnotate}
            isAnnotated={frameData.annotation !== null}
          />
        </div>

        {/* Controls Footer */}
        <AnnotationControls
          onPrevFrame={handlePrevFrame}
          onNextFrame={handleNextFrame}
          onPrevUnannotated={handlePrevUnannotated}
          onNextUnannotated={handleNextUnannotated}
          onNoBall={handleNoBall}
          onManualSave={manualSave}
          pendingCount={pendingCount}
          isSaving={isSaving}
          disabled={false}
        />
      </main>

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
