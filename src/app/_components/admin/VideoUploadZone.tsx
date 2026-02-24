"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Film, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface VideoUploadZoneProps {
  onFileSelected: (objectUrl: string, file: File) => void;
  onUploadComplete: (s3Key: string) => void;
  onUploadProgress?: (percent: number) => void;
  disabled?: boolean;
}

export function VideoUploadZone({
  onFileSelected,
  onUploadComplete,
  onUploadProgress,
  disabled,
}: VideoUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<{ uploadId?: string; s3Key?: string } | null>(null);

  const getUploadUrl = api.video.getUploadUrl.useMutation();
  const completeUpload = api.video.completeUpload.useMutation();

  const startUpload = useCallback(
    async (file: File) => {
      setError(null);
      setSelectedFile(file);
      setUploadProgress(0);

      // Instant preview
      const objectUrl = URL.createObjectURL(file);
      onFileSelected(objectUrl, file);

      try {
        // Get presigned URLs from backend
        const uploadInfo = await getUploadUrl.mutateAsync({
          filename: file.name,
          contentType: file.type || "video/mp4",
          fileSize: file.size,
        });

        if (uploadInfo.mode === "single") {
          // Single PUT upload with XHR for progress
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                setUploadProgress(pct);
                onUploadProgress?.(pct);
              }
            });
            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`Upload failed: ${xhr.status}`));
            });
            xhr.addEventListener("error", () =>
              reject(new Error("Upload failed")),
            );
            xhr.open("PUT", uploadInfo.url);
            xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
            xhr.send(file);
          });

          setUploadProgress(100);
          onUploadProgress?.(100);
          onUploadComplete(uploadInfo.s3Key);
        } else {
          // Multipart upload
          abortRef.current = {
            uploadId: uploadInfo.uploadId,
            s3Key: uploadInfo.s3Key,
          };
          const parts: Array<{ PartNumber: number; ETag: string }> = [];
          const totalParts = uploadInfo.partUrls.length;
          let uploadedBytes = 0;

          for (let i = 0; i < totalParts; i++) {
            const start = i * uploadInfo.partSize;
            const end = Math.min(start + uploadInfo.partSize, file.size);
            const blob = file.slice(start, end);
            const partUrl = uploadInfo.partUrls[i]!;

            const etag = await new Promise<string>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                  const totalLoaded = uploadedBytes + e.loaded;
                  const pct = Math.round((totalLoaded / file.size) * 100);
                  setUploadProgress(pct);
                  onUploadProgress?.(pct);
                }
              });
              xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  const etagHeader = xhr.getResponseHeader("ETag");
                  if (!etagHeader)
                    reject(new Error("Missing ETag in response"));
                  else resolve(etagHeader);
                } else {
                  reject(new Error(`Part upload failed: ${xhr.status}`));
                }
              });
              xhr.addEventListener("error", () =>
                reject(new Error("Part upload failed")),
              );
              xhr.open("PUT", partUrl);
              xhr.send(blob);
            });

            uploadedBytes += end - start;
            parts.push({ PartNumber: i + 1, ETag: etag });
          }

          // Complete multipart upload
          await completeUpload.mutateAsync({
            s3Key: uploadInfo.s3Key,
            uploadId: uploadInfo.uploadId,
            parts,
          });

          abortRef.current = null;
          setUploadProgress(100);
          onUploadProgress?.(100);
          onUploadComplete(uploadInfo.s3Key);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setUploadProgress(null);
        setSelectedFile(null);
      }
    },
    [
      onFileSelected,
      onUploadComplete,
      onUploadProgress,
      getUploadUrl,
      completeUpload,
    ],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("video/")) {
        void startUpload(file);
      } else {
        setError("Please drop a video file");
      }
    },
    [startUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void startUpload(file);
    },
    [startUpload],
  );

  const reset = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (selectedFile && uploadProgress !== null) {
    return (
      <div className="rounded-lg border p-6">
        <div className="flex items-center gap-3">
          <Film className="text-muted-foreground h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-muted-foreground text-xs">
              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          {uploadProgress === 100 ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <Progress value={uploadProgress} className="mt-3" />
        <p className="text-muted-foreground mt-1 text-xs">
          {uploadProgress < 100
            ? `Upload S3 en cours... ${uploadProgress}%`
            : "Upload terminé"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn(
          "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "pointer-events-none opacity-50",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
        <p className="text-sm font-medium">
          Glissez une vidéo ici ou cliquez pour sélectionner
        </p>
        <p className="text-muted-foreground mt-1 text-xs">MP4, AVI, MOV, MKV</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
