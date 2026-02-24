"use client";

import { useState, useCallback } from "react";
import { api } from "~/trpc/react";
import { VideoUploadZone } from "./VideoUploadZone";
import { VideoSegmentEditor, type Segment } from "./VideoSegmentEditor";
import { SegmentImportProgress } from "./SegmentImportProgress";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { useToast } from "~/hooks/use-toast";
import { Scissors, Play, ChevronLeft, Video, Upload } from "lucide-react";

type Step = "list" | "edit" | "import";

export function VideoImporter() {
  const { toast } = useToast();
  const utils = api.useUtils();

  const [step, setStep] = useState<Step>("list");
  const [sourceName, setSourceName] = useState("");
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);

  // S3 upload state
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [s3Key, setS3Key] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const uploadComplete = s3Key !== null;

  // Queries
  const { data: sourceVideos, isLoading: isSourcesLoading } =
    api.video.listSourceVideos.useQuery();

  // Polling for processing status
  const { data: processingStatus } = api.video.getProcessingStatus.useQuery(
    { sourceVideoId: currentSourceId! },
    {
      enabled: !!currentSourceId && step === "import",
      refetchInterval: 2000,
    },
  );

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

  const processSegmentsMut = api.video.processSegments.useMutation({
    onSuccess: () => {
      void utils.video.listSourceVideos.invalidate();
      toast({
        title: "Traitement lancé",
        description:
          "Les segments sont en cours de traitement. Suivez la progression ci-dessous.",
      });
    },
    onError: (err) => {
      toast({
        title: "Erreur d'import",
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

  const handleFileSelected = useCallback((url: string, file: File) => {
    setObjectUrl(url);
    // Pre-fill name from filename
    const nameFromFile = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]/g, " ");
    setSourceName(nameFromFile);
    setStep("edit");
  }, []);

  const handleUploadComplete = useCallback(
    async (key: string) => {
      setS3Key(key);

      // Auto-create source video in DB if not already created
      if (!currentSourceId && sourceName.trim()) {
        const source = await createSource.mutateAsync({
          name: sourceName.trim(),
          s3Key: key,
        });
        setCurrentSourceId(source.id);
      }
    },
    [currentSourceId, sourceName, createSource],
  );

  const handleUploadProgress = useCallback((percent: number) => {
    setUploadProgress(percent);
  }, []);

  const handleOpenExisting = (sourceId: string) => {
    setCurrentSourceId(sourceId);
    const source = sourceVideos?.find((s) => s.id === sourceId);
    if (source) {
      setSourceName(source.name);
      setSegments(
        source.segments.map((seg) => ({
          id: seg.id,
          name: seg.name,
          startTime: seg.startTimeSeconds ?? 0,
          endTime: 0,
        })),
      );
    }
    setObjectUrl(null);
    setS3Key(source?.s3Key ?? null);
    setStep("edit");
  };

  const handleImport = async () => {
    if (segments.length === 0) return;

    // Ensure source exists in DB
    let sourceId = currentSourceId;
    if (!sourceId && s3Key && sourceName.trim()) {
      const source = await createSource.mutateAsync({
        name: sourceName.trim(),
        s3Key,
      });
      sourceId = source.id;
      setCurrentSourceId(source.id);
    }

    if (!sourceId) return;

    setStep("import");

    processSegmentsMut.mutate({
      sourceVideoId: sourceId,
      segments: segments.map((s) => ({
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });
  };

  const handleReset = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setStep("list");
    setSourceName("");
    setCurrentSourceId(null);
    setSegments([]);
    setObjectUrl(null);
    setS3Key(null);
    setUploadProgress(0);
  };

  // Check if all processing is done (for import step)
  const allDone =
    processingStatus?.allReady === true || processingStatus?.hasError === true;

  // --- Render ---

  // Step: Source video list
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="w-24">Durée</TableHead>
                <TableHead className="w-24">Résolution</TableHead>
                <TableHead className="w-24">Segments</TableHead>
                <TableHead className="w-24">Date</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceVideos.map((sv) => (
                <TableRow key={sv.id}>
                  <TableCell className="font-medium">{sv.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {sv.durationSeconds
                      ? `${Math.floor(sv.durationSeconds / 60)}m${Math.floor(sv.durationSeconds % 60)}s`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {sv.width && sv.height ? `${sv.width}x${sv.height}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{sv.segmentCount}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(sv.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenExisting(sv.id)}
                    >
                      <Scissors className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    const importDisabled =
      segments.length === 0 || (!uploadComplete && !currentSourceId);

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
            <Button
              onClick={() => void handleImport()}
              disabled={importDisabled}
            >
              <Play className="mr-2 h-4 w-4" />
              Importer {segments.length} segment{segments.length !== 1 && "s"}
            </Button>
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
              (Ajouter).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Source name input */}
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
                videoUrl={videoUrl}
                sourceName={sourceName}
                onSegmentsChange={setSegments}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Chargement de la vidéo...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step: Import progress (polling)
  if (step === "import") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Import des segments</CardTitle>
            <CardDescription>
              Extraction des frames via Lambda. Progression en temps réel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SegmentImportProgress
              segments={
                processingStatus?.segments ??
                segments.map((s) => ({
                  id: s.id,
                  name: s.name,
                  status: "processing",
                  totalFrames: 0,
                }))
              }
              allReady={processingStatus?.allReady ?? false}
            />

            {allDone && (
              <div className="mt-4 flex gap-2">
                <Button onClick={handleReset}>Terminé</Button>
                {processingStatus?.hasError && (
                  <Button variant="outline" onClick={() => void handleImport()}>
                    Réessayer les erreurs
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
