import { useCallback } from "react";
import { api } from "~/trpc/react";

interface AnnotationEntry {
  x: number | null;
  y: number | null;
  ballVisible: boolean;
}

export function useAnnotationData(videoId: string) {
  const utils = api.useUtils();

  const { data: annotationMap, isLoading } =
    api.annotation.getAllAnnotations.useQuery(
      { videoId },
      { staleTime: Infinity },
    );

  const getFrameAnnotation = useCallback(
    (frameNumber: number): AnnotationEntry | null => {
      if (!annotationMap) return null;
      return annotationMap[frameNumber] ?? null;
    },
    [annotationMap],
  );

  const getPreviousVisible = useCallback(
    (
      frameNumber: number,
      limit = 5,
    ): Array<{ frameNumber: number; x: number; y: number }> => {
      if (!annotationMap) return [];

      const result: Array<{ frameNumber: number; x: number; y: number }> = [];
      // Scan all annotations, collect visible ones, sort descending by frame
      for (const [frame, ann] of Object.entries(annotationMap)) {
        const fn = Number(frame);
        if (ann.ballVisible && ann.x !== null && ann.y !== null) {
          result.push({ frameNumber: fn, x: ann.x, y: ann.y });
        }
      }
      result.sort((a, b) => b.frameNumber - a.frameNumber);
      return result.slice(0, limit);
    },
    [annotationMap],
  );

  const setLocalAnnotation = useCallback(
    (frameNumber: number, annotation: AnnotationEntry) => {
      utils.annotation.getAllAnnotations.setData({ videoId }, (old) => {
        if (!old) return { [frameNumber]: annotation };
        return { ...old, [frameNumber]: annotation };
      });
    },
    [utils, videoId],
  );

  return {
    annotationMap,
    isLoading,
    getFrameAnnotation,
    getPreviousVisible,
    setLocalAnnotation,
  };
}
