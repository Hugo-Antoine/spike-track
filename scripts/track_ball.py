"""
Ball tracking in padel/tennis video using YOLOv8 + interpolation.

Usage:
    python scripts/track_ball.py match_1_extract.mp4 -o output_tracked.mp4
"""

import argparse
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO


def interpolate_positions(positions: dict[int, tuple[int, int]], total_frames: int, max_gap: int = 10) -> dict[int, tuple[int, int]]:
    """Fill gaps in detected positions with linear interpolation."""
    if len(positions) < 2:
        return positions

    result = dict(positions)
    sorted_frames = sorted(positions.keys())

    for i in range(len(sorted_frames) - 1):
        f_start = sorted_frames[i]
        f_end = sorted_frames[i + 1]
        gap = f_end - f_start

        if 1 < gap <= max_gap:
            x1, y1 = positions[f_start]
            x2, y2 = positions[f_end]
            for f in range(f_start + 1, f_end):
                t = (f - f_start) / gap
                x = int(x1 + t * (x2 - x1))
                y = int(y1 + t * (y2 - y1))
                result[f] = (x, y)

    return result


def draw_trail(frame: np.ndarray, positions: dict[int, tuple[int, int]], current_frame: int, trail_length: int = 15):
    """Draw ball trail with fading effect."""
    trail_frames = sorted(
        [f for f in positions if current_frame - trail_length <= f <= current_frame]
    )

    for i, f in enumerate(trail_frames):
        alpha = (i + 1) / len(trail_frames) if trail_frames else 1.0
        x, y = positions[f]
        radius = max(2, int(6 * alpha))
        color = (0, int(255 * alpha), int(255 * (1 - alpha)))
        cv2.circle(frame, (x, y), radius, color, -1)

    if current_frame in positions:
        x, y = positions[current_frame]
        cv2.circle(frame, (x, y), 10, (0, 255, 0), 2)
        cv2.putText(frame, f"({x},{y})", (x + 12, y - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)


def main():
    parser = argparse.ArgumentParser(description="Track ball in padel/tennis video with YOLO")
    parser.add_argument("video", help="Input video path")
    parser.add_argument("-o", "--output", default="output_tracked.mp4", help="Output video path")
    parser.add_argument("--model", default="yolov8x.pt", help="YOLO model to use")
    parser.add_argument("--conf", type=float, default=0.15, help="Confidence threshold")
    parser.add_argument("--max-gap", type=int, default=10, help="Max frames to interpolate")
    args = parser.parse_args()

    print(f"Loading YOLO model: {args.model}")
    model = YOLO(args.model)

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {args.video}")

    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Video: {w}x{h} @ {fps}fps, {total_frames} frames")

    # --- Pass 1: Detect ball positions ---
    print("\n=== Pass 1: Detecting ball positions ===")
    SPORTS_BALL_CLASS = 32  # COCO class for sports ball

    raw_positions: dict[int, tuple[int, int]] = {}
    raw_confidences: dict[int, float] = {}
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, conf=args.conf, verbose=False, classes=[SPORTS_BALL_CLASS])

        if len(results[0].boxes) > 0:
            # Pick highest confidence detection
            boxes = results[0].boxes
            best_idx = boxes.conf.argmax().item()
            box = boxes.xyxy[best_idx].cpu().numpy()
            conf = boxes.conf[best_idx].item()

            cx = int((box[0] + box[2]) / 2)
            cy = int((box[1] + box[3]) / 2)
            raw_positions[frame_idx] = (cx, cy)
            raw_confidences[frame_idx] = conf

        if frame_idx % 30 == 0:
            det = len(raw_positions)
            print(f"  Frame {frame_idx}/{total_frames} - Detections so far: {det}")

        frame_idx += 1

    detection_rate = len(raw_positions) / total_frames * 100
    print(f"\nDetected ball in {len(raw_positions)}/{total_frames} frames ({detection_rate:.1f}%)")

    if raw_confidences:
        avg_conf = np.mean(list(raw_confidences.values()))
        print(f"Average confidence: {avg_conf:.3f}")

    # Interpolate missing positions
    positions = interpolate_positions(raw_positions, total_frames, max_gap=args.max_gap)
    interpolated = len(positions) - len(raw_positions)
    print(f"Interpolated {interpolated} additional frames")
    coverage = len(positions) / total_frames * 100
    print(f"Total coverage: {len(positions)}/{total_frames} frames ({coverage:.1f}%)")

    # --- Pass 2: Write output video ---
    print("\n=== Pass 2: Writing output video ===")
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(args.output, fourcc, fps, (w, h))

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        draw_trail(frame, positions, frame_idx)

        # Status overlay
        status = "DETECTED" if frame_idx in raw_positions else (
            "INTERPOLATED" if frame_idx in positions else "LOST"
        )
        color = (0, 255, 0) if frame_idx in raw_positions else (
            (0, 200, 255) if frame_idx in positions else (0, 0, 255)
        )
        cv2.putText(frame, f"Frame {frame_idx} | Ball: {status}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        if frame_idx in raw_confidences:
            cv2.putText(frame, f"Conf: {raw_confidences[frame_idx]:.2f}", (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        out.write(frame)
        frame_idx += 1

    cap.release()
    out.release()
    print(f"\nOutput saved to: {args.output}")


if __name__ == "__main__":
    main()
