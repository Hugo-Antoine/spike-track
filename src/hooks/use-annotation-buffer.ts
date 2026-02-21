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
  autoSaveDelay?: number; // ms, default 15000 (15s)
}

export function useAnnotationBuffer({
  videoId,
  autoSaveDelay = 15000,
}: UseAnnotationBufferOptions) {
  const { toast } = useToast();
  const [buffer, setBuffer] = useState<Annotation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const bufferRef = useRef<Annotation[]>([]);
  const isSavingRef = useRef(false);
  const bufferStartTimeRef = useRef<number | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const utils = api.useUtils();

  // Keep refs in sync
  bufferRef.current = buffer;
  isSavingRef.current = isSaving;

  const saveBatch = api.annotation.saveBatch.useMutation();
  const saveBatchRef = useRef(saveBatch);
  saveBatchRef.current = saveBatch;

  const doSave = useCallback(
    async (annotationsToSave: Annotation[]) => {
      if (annotationsToSave.length === 0 || isSavingRef.current) return;

      setIsSaving(true);

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          const data = await saveBatchRef.current.mutateAsync({
            videoId,
            annotations: annotationsToSave,
          });
          toast({
            title: "Sauvegarde effectuée",
            description: `${data.count} annotation(s) sauvegardée(s)`,
          });
          await Promise.all([
            utils.annotation.getStats.invalidate({ videoId }),
            utils.annotation.getMyProgress.invalidate(),
            utils.annotation.getNextFrame.invalidate({ videoId }),
            utils.annotation.getAllAnnotations.invalidate({ videoId }),
          ]);
          setIsSaving(false);
          return;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            setBuffer((prev) => [...annotationsToSave, ...prev]);
            toast({
              title: "Erreur de sauvegarde",
              description:
                error instanceof Error ? error.message : "Erreur inconnue",
              variant: "destructive",
            });
            setIsSaving(false);
            throw error;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, attempts * 2000 - 1000)
          );
        }
      }
    },
    [videoId, utils, toast]
  );

  const doSaveRef = useRef(doSave);
  doSaveRef.current = doSave;

  // Schedule auto-save timeout when buffer goes from empty to non-empty
  const scheduleAutoSave = useCallback(() => {
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    bufferStartTimeRef.current = Date.now();

    autoSaveTimeoutRef.current = setTimeout(() => {
      const currentBuffer = bufferRef.current;
      if (currentBuffer.length === 0 || isSavingRef.current) return;

      const batchToSave = [...currentBuffer];
      setBuffer([]);
      bufferStartTimeRef.current = null;

      void doSaveRef.current(batchToSave);
    }, autoSaveDelay);
  }, [autoSaveDelay]);

  const addToBuffer = useCallback(
    (annotation: Annotation) => {
      setBuffer((prev) => {
        const isFirstItem = prev.length === 0;
        const existing = prev.findIndex(
          (a) => a.frameNumber === annotation.frameNumber
        );
        if (existing !== -1) {
          const newBuffer = [...prev];
          newBuffer[existing] = annotation;
          return newBuffer;
        }

        // Schedule auto-save when buffer goes from 0 → 1
        if (isFirstItem) {
          // Use queueMicrotask to avoid setState-during-render issues
          queueMicrotask(() => scheduleAutoSave());
        }

        return [...prev, annotation];
      });
    },
    [scheduleAutoSave]
  );

  const manualSave = useCallback(async () => {
    const currentBuffer = bufferRef.current;
    if (currentBuffer.length === 0) {
      toast({
        title: "Rien à sauvegarder",
        description: "Le buffer est vide",
      });
      return;
    }

    // Cancel pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    bufferStartTimeRef.current = null;

    const batchToSave = [...currentBuffer];
    setBuffer([]);

    try {
      await doSaveRef.current(batchToSave);
    } catch {
      // Buffer already restored in doSave on error
    }
  }, [toast]);

  // Countdown tick (every 1s)
  useEffect(() => {
    const id = setInterval(() => {
      const startTime = bufferStartTimeRef.current;
      if (startTime === null || bufferRef.current.length === 0) {
        setCountdown(null);
        return;
      }
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(
        Math.ceil((autoSaveDelay - elapsed) / 1000),
        0
      );
      setCountdown(remaining);
    }, 1000);

    return () => clearInterval(id);
  }, [autoSaveDelay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (bufferRef.current.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return {
    buffer,
    addToBuffer,
    manualSave,
    pendingCount: buffer.length,
    isSaving,
    countdown,
  };
}
