"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Trash2,
  LogIn,
  LogOut,
} from "lucide-react";

export interface Segment {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
}

export interface VideoSegmentEditorHandle {
  seekToTime: (time: number) => void;
}

export interface ExistingSegment {
  id: string;
  name: string;
  startTimeSeconds: number | null;
  endTimeSeconds: number | null;
  status: string;
}

interface VideoSegmentEditorProps {
  videoUrl: string;
  sourceName: string;
  initialSegments?: Segment[];
  existingSegments?: ExistingSegment[];
  onSegmentsChange: (segments: Segment[]) => void;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

export const VideoSegmentEditor = forwardRef<
  VideoSegmentEditorHandle,
  VideoSegmentEditorProps
>(function VideoSegmentEditor(
  {
    videoUrl,
    sourceName,
    initialSegments = [],
    existingSegments = [],
    onSegmentsChange,
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [markIn, setMarkIn] = useState<number | null>(null);
  const [markOut, setMarkOut] = useState<number | null>(null);
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [segmentCounter, setSegmentCounter] = useState(
    initialSegments.length + 1,
  );

  useEffect(() => {
    onSegmentsChange(segments);
  }, [segments, onSegmentsChange]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
  }, []);

  const handleMarkIn = useCallback(() => {
    setMarkIn(currentTime);
  }, [currentTime]);

  const handleMarkOut = useCallback(() => {
    setMarkOut(currentTime);
  }, [currentTime]);

  const addSegment = useCallback(() => {
    if (markIn === null || markOut === null) return;
    const start = Math.min(markIn, markOut);
    const end = Math.max(markIn, markOut);
    if (end - start < 0.1) return;

    const newSegment: Segment = {
      id: crypto.randomUUID(),
      name: `${sourceName} - Segment ${segmentCounter}`,
      startTime: start,
      endTime: end,
    };

    setSegments((prev) => [...prev, newSegment]);
    setSegmentCounter((c) => c + 1);
    setMarkIn(null);
    setMarkOut(null);
  }, [markIn, markOut, sourceName, segmentCounter]);

  const removeSegment = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSegmentName = (id: string, name: string) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const seekToTime = useCallback((time: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = time;
  }, []);

  useImperativeHandle(ref, () => ({ seekToTime }), [seekToTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "a":
          e.preventDefault();
          handleMarkIn();
          break;
        case "e":
          e.preventDefault();
          handleMarkOut();
          break;
        case "z":
          e.preventDefault();
          addSegment();
          break;
        case "arrowleft":
          e.preventDefault();
          seek(e.ctrlKey ? -1 : -5);
          break;
        case "arrowright":
          e.preventDefault();
          seek(e.ctrlKey ? 1 : 5);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, handleMarkIn, handleMarkOut, addSegment, seek]);

  return (
    <div className="space-y-4">
      {/* Video player */}
      <div className="overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="mx-auto max-h-[50vh] w-full"
          onTimeUpdate={() =>
            setCurrentTime(videoRef.current?.currentTime ?? 0)
          }
          onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          preload="auto"
        />
      </div>

      {/* Timeline */}
      <div className="relative h-10 overflow-hidden rounded bg-gray-800">
        {/* Existing segments overlay */}
        {existingSegments
          .filter((seg) => !segments.some((s) => s.id === seg.id))
          .map((seg) => {
            const start = seg.startTimeSeconds ?? 0;
            const end = seg.endTimeSeconds ?? 0;
            const colorClass =
              seg.status === "ready"
                ? "border-emerald-400 bg-emerald-500/25"
                : seg.status === "processing"
                  ? "border-amber-400 bg-amber-500/25"
                  : seg.status === "error"
                    ? "border-red-400 bg-red-500/25"
                    : "border-gray-400 bg-gray-500/20";
            return (
              <div
                key={`existing-${seg.id}`}
                className={`absolute top-0 h-full border-x ${colorClass}`}
                style={{
                  left: `${(start / duration) * 100}%`,
                  width: `${((end - start) / duration) * 100}%`,
                }}
              />
            );
          })}
        {/* New/pending segments overlay */}
        {segments.map((seg) => (
          <div
            key={seg.id}
            className="absolute top-0 h-full border-x border-blue-400 bg-blue-500/30"
            style={{
              left: `${(seg.startTime / duration) * 100}%`,
              width: `${((seg.endTime - seg.startTime) / duration) * 100}%`,
            }}
          />
        ))}
        {/* Mark IN/OUT indicators */}
        {markIn !== null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-green-400"
            style={{ left: `${(markIn / duration) * 100}%` }}
          />
        )}
        {markOut !== null && (
          <div
            className="absolute top-0 h-full w-0.5 bg-red-400"
            style={{ left: `${(markOut / duration) * 100}%` }}
          />
        )}
        {/* Playhead */}
        <div
          className="absolute top-0 z-10 h-full w-0.5 bg-white"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
        {/* Clickable area */}
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          onChange={(e) => seekToTime(parseFloat(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => seek(-5)}>
          <SkipBack className="mr-1 h-3 w-3" /> -5s
        </Button>
        <Button variant="outline" size="sm" onClick={() => seek(-1)}>
          -1s
        </Button>
        <Button variant="outline" size="sm" onClick={togglePlay}>
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={() => seek(1)}>
          +1s
        </Button>
        <Button variant="outline" size="sm" onClick={() => seek(5)}>
          +5s <SkipForward className="ml-1 h-3 w-3" />
        </Button>

        <div className="bg-muted text-muted-foreground rounded px-2 py-1 font-mono text-xs">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={markIn !== null ? "default" : "outline"}
            size="sm"
            onClick={handleMarkIn}
          >
            <LogIn className="mr-1 h-3 w-3" />
            IN {markIn !== null && `(${formatTime(markIn)})`}
          </Button>
          <Button
            variant={markOut !== null ? "default" : "outline"}
            size="sm"
            onClick={handleMarkOut}
          >
            <LogOut className="mr-1 h-3 w-3" />
            OUT {markOut !== null && `(${formatTime(markOut)})`}
          </Button>
          <Button
            size="sm"
            disabled={markIn === null || markOut === null}
            onClick={addSegment}
          >
            <Plus className="mr-1 h-3 w-3" />
            Ajouter (Z)
          </Button>
        </div>
      </div>

      {/* Keyboard hints */}
      <p className="text-muted-foreground text-xs">
        Raccourcis : Espace = play/pause, A = Mark IN, E = Mark OUT, Z =
        Ajouter, Flèches = ±5s, Ctrl+Flèches = ±1s
      </p>

      {/* Segments table */}
      {segments.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead className="w-28">Début</TableHead>
              <TableHead className="w-28">Fin</TableHead>
              <TableHead className="w-24">Durée</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.map((seg, i) => (
              <TableRow key={seg.id}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <Input
                    value={seg.name}
                    onChange={(e) => updateSegmentName(seg.id, e.target.value)}
                    className="h-7 text-xs"
                  />
                </TableCell>
                <TableCell>
                  <button
                    className="text-muted-foreground hover:text-foreground font-mono text-xs"
                    onClick={() => seekToTime(seg.startTime)}
                  >
                    {formatTime(seg.startTime)}
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    className="text-muted-foreground hover:text-foreground font-mono text-xs"
                    onClick={() => seekToTime(seg.endTime)}
                  >
                    {formatTime(seg.endTime)}
                  </button>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {formatTime(seg.endTime - seg.startTime)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSegment(seg.id)}
                  >
                    <Trash2 className="h-3 w-3 text-red-400" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
});
