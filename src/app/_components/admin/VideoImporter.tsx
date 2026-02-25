"use client";

import { useState, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import { VideoUploadZone } from "./VideoUploadZone";
import {
  VideoSegmentEditor,
  type Segment,
  type VideoSegmentEditorHandle,
  type ExistingSegment,
  formatTime,
} from "./VideoSegmentEditor";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { useToast } from "~/hooks/use-toast";
import {
  Scissors,
  ChevronLeft,
  ChevronDown,
  Video,
  Upload,
  ArrowUpDown,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Play,
  Pencil,
} from "lucide-react";

type Step = "list" | "edit";

export function VideoImporter() {
  const { toast } = useToast();
  const utils = api.useUtils();

  const [step, setStep] = useState<Step>("list");
  const [sourceName, setSourceName] = useState("");
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);
  const [, setSegments] = useState<Segment[]>([]);
  const [existingSegments, setExistingSegments] = useState<ExistingSegment[]>(
    [],
  );
  const [segmentsSort, setSegmentsSort] = useState<"asc" | "desc">("asc");
  const editorRef = useRef<VideoSegmentEditorHandle>(null);

  // S3 upload state
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [s3Key, setS3Key] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const uploadComplete = s3Key !== null;

  // Pending queue: segments added before source exists in DB
  const pendingQueueRef = useRef<Segment[]>([]);

  // Track sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Debounce timers for segment name updates
  const nameDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Queries
  const { data: sourceVideos, isLoading: isSourcesLoading } =
    api.video.listSourceVideos.useQuery();

  // Mutations
  const createSource = api.video.createSourceVideo.useMutation({
    onSuccess: () => {
      void utils.video.listSourceVideos.invalidate();
    },
    onError: (err) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const createSegmentMut = api.video.createSegment.useMutation({
    onSuccess: () => {
      void utils.video.listSourceVideos.invalidate();
    },
    onError: (err) => {
      toast({
        title: "Erreur création segment",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateSegmentNameMut = api.video.updateSegmentName.useMutation({
    onError: (err) => {
      toast({
        title: "Erreur renommage",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteSegmentMut = api.video.deleteSegment.useMutation({
    onSuccess: () => {
      void utils.video.listSourceVideos.invalidate();
    },
    onError: (err) => {
      toast({
        title: "Erreur suppression",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const launchProcessingMut = api.video.launchProcessing.useMutation({
    onSuccess: (data) => {
      void utils.video.listSourceVideos.invalidate();
      toast({
        title: "Traitement lancé",
        description: `${data.launched} segment(s) en cours de traitement.`,
      });
    },
    onError: (err) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Playback URL for editing existing source
  const { data: playbackData } = api.video.getSourcePlaybackUrl.useQuery(
    { sourceVideoId: currentSourceId! },
    { enabled: !!currentSourceId && step === "edit" && !objectUrl },
  );

  // The video URL to use in the editor: objectUrl (instant) or presigned S3 URL
  const videoUrl = objectUrl ?? playbackData?.url;

  // --- Auto-save: create segment in DB ---
  const createSegmentInDb = useCallback(
    async (segment: Segment, sourceId: string) => {
      setIsSyncing(true);
      try {
        const result = await createSegmentMut.mutateAsync({
          sourceVideoId: sourceId,
          name: segment.name,
          startTime: segment.startTime,
          endTime: segment.endTime,
        });
        // Update the segment's dbId in state
        setSegments((prev) =>
          prev.map((s) =>
            s.id === segment.id ? { ...s, dbId: result.id } : s,
          ),
        );
        setLastSyncedAt(new Date());
      } finally {
        setIsSyncing(false);
      }
    },
    [createSegmentMut],
  );

  // Flush pending queue when sourceId becomes available
  const flushPendingQueue = useCallback(
    async (sourceId: string) => {
      const queue = [...pendingQueueRef.current];
      pendingQueueRef.current = [];
      for (const seg of queue) {
        await createSegmentInDb(seg, sourceId);
      }
    },
    [createSegmentInDb],
  );

  const handleSegmentAdded = useCallback(
    (segment: Segment) => {
      if (currentSourceId) {
        void createSegmentInDb(segment, currentSourceId);
      } else {
        pendingQueueRef.current.push(segment);
      }
    },
    [currentSourceId, createSegmentInDb],
  );

  const handleSegmentNameChanged = useCallback(
    (dbId: string, name: string) => {
      // Clear existing debounce for this segment
      const existing = nameDebounceRef.current.get(dbId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        nameDebounceRef.current.delete(dbId);
        updateSegmentNameMut.mutate({ segmentId: dbId, name });
      }, 500);
      nameDebounceRef.current.set(dbId, timer);
    },
    [updateSegmentNameMut],
  );

  const handleSegmentDeleted = useCallback(
    (dbId: string) => {
      // Clear any pending name debounce
      const existing = nameDebounceRef.current.get(dbId);
      if (existing) {
        clearTimeout(existing);
        nameDebounceRef.current.delete(dbId);
      }
      deleteSegmentMut.mutate({ segmentId: dbId });
    },
    [deleteSegmentMut],
  );

  const handleFileSelected = useCallback((url: string, file: File) => {
    setObjectUrl(url);
    const nameFromFile = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]/g, " ");
    setSourceName(nameFromFile);
    setStep("edit");
  }, []);

  const handleUploadComplete = useCallback(
    async (key: string) => {
      setS3Key(key);

      if (!currentSourceId && sourceName.trim()) {
        const source = await createSource.mutateAsync({
          name: sourceName.trim(),
          s3Key: key,
        });
        setCurrentSourceId(source.id);
        // Flush any segments that were queued
        await flushPendingQueue(source.id);
      }
    },
    [currentSourceId, sourceName, createSource, flushPendingQueue],
  );

  const handleUploadProgress = useCallback((percent: number) => {
    setUploadProgress(percent);
  }, []);

  const handleOpenExisting = (sourceId: string) => {
    setCurrentSourceId(sourceId);
    const source = sourceVideos?.find((s) => s.id === sourceId);
    if (source) {
      setSourceName(source.name);
      setExistingSegments(
        source.segments.map((seg) => ({
          id: seg.id,
          name: seg.name,
          startTimeSeconds: seg.startTimeSeconds,
          endTimeSeconds: seg.endTimeSeconds,
          status: seg.status,
        })),
      );
      setSegments(
        source.segments
          .filter((seg) => seg.status === "pending")
          .map((seg) => ({
            id: seg.id,
            dbId: seg.id,
            name: seg.name,
            startTime: seg.startTimeSeconds ?? 0,
            endTime: seg.endTimeSeconds ?? 0,
          })),
      );
    }
    setObjectUrl(null);
    setS3Key(source?.s3Key ?? null);
    setStep("edit");
  };

  const handleReset = () => {
    // Clear all debounce timers
    for (const timer of nameDebounceRef.current.values()) {
      clearTimeout(timer);
    }
    nameDebounceRef.current.clear();
    pendingQueueRef.current = [];

    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setStep("list");
    setSourceName("");
    setCurrentSourceId(null);
    setSegments([]);
    setExistingSegments([]);
    setObjectUrl(null);
    setS3Key(null);
    setUploadProgress(0);
    setIsSyncing(false);
    setLastSyncedAt(null);
  };

  // --- Render ---

  if (step === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Vidéos sources</h3>
            <p className="text-muted-foreground text-sm">
              Glissez une vidéo ou sélectionnez une source existante
            </p>
          </div>
        </div>

        <VideoUploadZone
          onFileSelected={handleFileSelected}
          onUploadComplete={(key) => void handleUploadComplete(key)}
          onUploadProgress={handleUploadProgress}
        />

        {isSourcesLoading ? (
          <p className="text-muted-foreground text-sm">Chargement...</p>
        ) : sourceVideos && sourceVideos.length > 0 ? (
          <div className="space-y-3">
            {sourceVideos.map((sv) => {
              const readyCount = sv.segments.filter(
                (s) => s.status === "ready",
              ).length;
              const pendingCount = sv.segments.filter(
                (s) => s.status === "pending",
              ).length;
              const processingCount = sv.segments.filter(
                (s) => s.status === "processing",
              ).length;
              const errorCount = sv.segments.filter(
                (s) => s.status === "error",
              ).length;
              const lastModified = sv.segments.reduce((latest, s) => {
                const d = s.updatedAt ?? s.createdAt;
                return d && d > latest ? d : latest;
              }, sv.createdAt);

              return (
                <Collapsible key={sv.id}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <div className="hover:bg-muted/50 cursor-pointer rounded-t-xl p-6 transition-colors select-none">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]_&]:rotate-180" />
                            <div>
                              <CardTitle className="text-base">
                                {sv.name}
                              </CardTitle>
                              <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                                <span>
                                  {new Date(sv.createdAt).toLocaleDateString(
                                    "fr-FR",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </span>
                                {sv.durationSeconds && (
                                  <span>
                                    {Math.floor(sv.durationSeconds / 60)}m
                                    {Math.floor(sv.durationSeconds % 60)
                                      .toString()
                                      .padStart(2, "0")}
                                    s
                                  </span>
                                )}
                                {sv.width && sv.height && (
                                  <span>
                                    {sv.width}×{sv.height}
                                  </span>
                                )}
                                {lastModified > sv.createdAt && (
                                  <span>
                                    modifié{" "}
                                    {new Date(lastModified).toLocaleDateString(
                                      "fr-FR",
                                      {
                                        day: "numeric",
                                        month: "short",
                                      },
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {sv.segments.length === 0 && (
                              <Badge variant="outline">Aucun segment</Badge>
                            )}
                            {readyCount > 0 && (
                              <Badge variant="default">
                                {readyCount} prêt
                                {readyCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                            {processingCount > 0 && (
                              <Badge variant="secondary">
                                {processingCount} en cours
                              </Badge>
                            )}
                            {pendingCount > 0 && (
                              <Badge variant="outline">
                                {pendingCount} en attente
                              </Badge>
                            )}
                            {errorCount > 0 && (
                              <Badge variant="destructive">
                                {errorCount} erreur
                                {errorCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="mb-3 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenExisting(sv.id)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Éditer les segments
                          </Button>
                        </div>
                        {sv.segments.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Segment</TableHead>
                                <TableHead className="w-28">Statut</TableHead>
                                <TableHead className="w-28">
                                  Timecodes
                                </TableHead>
                                <TableHead className="w-20">Durée</TableHead>
                                <TableHead className="w-24 text-right">
                                  Frames
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sv.segments
                                .sort(
                                  (a, b) =>
                                    (a.startTimeSeconds ?? 0) -
                                    (b.startTimeSeconds ?? 0),
                                )
                                .map((seg) => {
                                  const start = seg.startTimeSeconds ?? 0;
                                  const end = seg.endTimeSeconds ?? 0;
                                  const dur = end - start;
                                  const fmtTime = (s: number) => {
                                    const m = Math.floor(s / 60);
                                    const sec = Math.floor(s % 60);
                                    return `${m}:${sec.toString().padStart(2, "0")}`;
                                  };

                                  return (
                                    <TableRow key={seg.id}>
                                      <TableCell className="font-medium">
                                        {seg.name}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1.5">
                                          {seg.status === "ready" ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                          ) : seg.status === "error" ? (
                                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                                          ) : seg.status === "processing" ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                                          ) : (
                                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                                          )}
                                          <span className="text-sm">
                                            {seg.status === "ready"
                                              ? "Prêt"
                                              : seg.status === "processing"
                                                ? "En cours"
                                                : seg.status === "error"
                                                  ? "Erreur"
                                                  : "En attente"}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {fmtTime(start)} → {fmtTime(end)}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {fmtTime(dur)}
                                      </TableCell>
                                      <TableCell className="text-right text-sm">
                                        {seg.totalFrames > 0
                                          ? seg.totalFrames.toLocaleString()
                                          : "—"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-muted-foreground py-4 text-center text-sm">
                            Aucun segment découpé. Cliquez sur
                            &quot;Éditer&quot; pour commencer.
                          </p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border p-8 text-center">
            <Video className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
            <p className="text-muted-foreground text-sm">
              Aucune vidéo source. Glissez une vidéo ci-dessus pour commencer.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Step: Edit segments
  if (step === "edit") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Retour
          </Button>
          <div className="flex items-center gap-3">
            {!uploadComplete && objectUrl && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Upload className="h-3 w-3" />
                Upload S3 : {uploadProgress}%
              </span>
            )}
            {isSyncing ? (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Sauvegarde...
              </span>
            ) : lastSyncedAt ? (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Check className="h-3 w-3" />
                Sauvegardé
              </span>
            ) : null}
            {currentSourceId &&
              existingSegments.some((s) => s.status === "pending") && (
                <Button
                  size="sm"
                  onClick={() =>
                    launchProcessingMut.mutate({
                      sourceVideoId: currentSourceId,
                    })
                  }
                  disabled={launchProcessingMut.isPending}
                >
                  {launchProcessingMut.isPending ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="mr-1 h-3 w-3" />
                  )}
                  Lancer le traitement
                </Button>
              )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Découpage
            </CardTitle>
            <CardDescription>
              Marquez les segments à extraire. Utilisez A (IN), E (OUT), Z
              (Ajouter). Les segments sont sauvegardés automatiquement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-muted-foreground mb-1 block text-xs">
                Nom de la vidéo source
              </label>
              <Input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="ex: Reims vs Amiens - Set 2"
              />
            </div>

            {videoUrl ? (
              <VideoSegmentEditor
                ref={editorRef}
                videoUrl={videoUrl}
                sourceName={sourceName}
                existingSegments={existingSegments}
                onSegmentsChange={setSegments}
                onSegmentAdded={handleSegmentAdded}
                onSegmentNameChanged={handleSegmentNameChanged}
                onSegmentDeleted={handleSegmentDeleted}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Chargement de la vidéo...
              </p>
            )}
          </CardContent>
        </Card>

        {existingSegments.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Segments existants ({existingSegments.length})
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSegmentsSort((s) => (s === "asc" ? "desc" : "asc"))
                  }
                >
                  <ArrowUpDown className="mr-1 h-3 w-3" />
                  {segmentsSort === "asc" ? "Croissant" : "Décroissant"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="w-28">Début</TableHead>
                    <TableHead className="w-28">Fin</TableHead>
                    <TableHead className="w-24">Durée</TableHead>
                    <TableHead className="w-28">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...existingSegments]
                    .sort((a, b) => {
                      const aStart = a.startTimeSeconds ?? 0;
                      const bStart = b.startTimeSeconds ?? 0;
                      return segmentsSort === "asc"
                        ? aStart - bStart
                        : bStart - aStart;
                    })
                    .map((seg) => {
                      const start = seg.startTimeSeconds ?? 0;
                      const end = seg.endTimeSeconds ?? 0;
                      return (
                        <TableRow key={seg.id}>
                          <TableCell className="text-sm">{seg.name}</TableCell>
                          <TableCell>
                            <button
                              className="text-muted-foreground hover:text-foreground font-mono text-xs"
                              onClick={() =>
                                editorRef.current?.seekToTime(start)
                              }
                            >
                              {formatTime(start)}
                            </button>
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-muted-foreground hover:text-foreground font-mono text-xs"
                              onClick={() => editorRef.current?.seekToTime(end)}
                            >
                              {formatTime(end)}
                            </button>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatTime(end - start)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                seg.status === "ready"
                                  ? "default"
                                  : seg.status === "processing"
                                    ? "secondary"
                                    : seg.status === "error"
                                      ? "destructive"
                                      : "outline"
                              }
                            >
                              {seg.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}
