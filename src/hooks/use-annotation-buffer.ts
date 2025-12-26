import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import { useToast } from "~/hooks/use-toast";

interface Annotation {
  frameNumber: number;
  x?: number;
  y?: number;
  ballVisible: boolean;
}

interface UseAnnotationBufferOptions {
  videoId: string;
  autoSaveInterval?: number; // ms, default 30000 (30s)
}

export function useAnnotationBuffer({
  videoId,
  autoSaveInterval = 30000,
}: UseAnnotationBufferOptions) {
  const { toast } = useToast();
  const [buffer, setBuffer] = useState<Annotation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const utils = api.useUtils();

  const saveBatch = api.annotation.saveBatch.useMutation({
    onSuccess: async (data) => {
      toast({
        title: "Sauvegarde automatique effectuée",
        description: `${data.count} annotation(s) sauvegardée(s)`,
      });
      await utils.annotation.getStats.invalidate({ videoId });
      await utils.annotation.getMyProgress.invalidate();
      setIsSaving(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur de sauvegarde",
        description: error.message,
        variant: "destructive",
      });
      setIsSaving(false);
    },
  });

  // Fonction de sauvegarde
  const saveBufferToServer = useCallback(
    async (annotationsToSave: Annotation[]) => {
      if (annotationsToSave.length === 0 || isSaving) return;

      setIsSaving(true);

      // Retry logic: 3 attempts with increasing delay
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          await saveBatch.mutateAsync({
            videoId,
            annotations: annotationsToSave,
          });
          return; // Success, exit
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            // Final failure: add back to buffer
            setBuffer((prev) => [...annotationsToSave, ...prev]);
            throw error;
          }
          // Wait before retry: 1s, 3s, 5s
          await new Promise((resolve) =>
            setTimeout(resolve, attempts * 2000 - 1000)
          );
        }
      }
    },
    [videoId, saveBatch, isSaving]
  );

  // Fonction d'ajout au buffer
  const addToBuffer = useCallback((annotation: Annotation) => {
    setBuffer((prev) => {
      // Check if frame already in buffer, replace it
      const existing = prev.findIndex(
        (a) => a.frameNumber === annotation.frameNumber
      );
      if (existing !== -1) {
        const newBuffer = [...prev];
        newBuffer[existing] = annotation;
        return newBuffer;
      }
      return [...prev, annotation];
    });
  }, []);

  // Sauvegarde manuelle
  const manualSave = useCallback(async () => {
    if (buffer.length === 0) {
      toast({
        title: "Rien à sauvegarder",
        description: "Le buffer est vide",
      });
      return;
    }

    const batchToSave = [...buffer];
    setBuffer([]); // Clear buffer

    try {
      await saveBufferToServer(batchToSave);
      toast({
        title: "Sauvegarde manuelle effectuée",
        description: `${batchToSave.length} annotation(s) sauvegardée(s)`,
      });
    } catch (error) {
      // Buffer already restored in saveBufferToServer on error
    }
  }, [buffer, saveBufferToServer, toast]);

  // Auto-save every X seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (buffer.length === 0) return;

      const batchToSave = [...buffer];
      setBuffer([]); // Clear buffer

      void saveBufferToServer(batchToSave);
    }, autoSaveInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [buffer, autoSaveInterval, saveBufferToServer]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (buffer.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [buffer]);

  return {
    buffer,
    addToBuffer,
    manualSave,
    pendingCount: buffer.length,
    isSaving,
  };
}
