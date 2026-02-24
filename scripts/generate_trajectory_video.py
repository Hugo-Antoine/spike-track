#!/usr/bin/env python3
"""
Generate a video with trajectory trails drawn progressively.
Each trajectory segment (serve, reception, set, attack...) is drawn
in a different color, building up over time as the video plays.
"""

import os
import shutil
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from io import BytesIO
from urllib.request import urlopen

import numpy as np
import psycopg2
from PIL import Image, ImageDraw
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

VIDEO_ID = "d603f983-8906-4072-b319-1dd81a55558b"

TRAJECTORY_COLORS = [
    (255, 255, 0),    # Yellow - Service toss
    (0, 255, 255),    # Cyan - Serve flight
    (0, 255, 0),      # Green - Reception/Passe
    (255, 165, 0),    # Orange - Passe haute
    (255, 0, 0),      # Red - Attaque
    (255, 0, 255),    # Magenta - After attack
    (128, 255, 128),
    (128, 128, 255),
]

TRAJECTORY_LABELS = [
    "Service (toss)",
    "Service (vol)",
    "Reception/Passe",
    "Passe haute",
    "Attaque",
    "Apres attaque",
    "Trajectoire 7",
    "Trajectoire 8",
]


def get_frame_url(cloud_name: str, folder: str, frame_number: int) -> str:
    actual = frame_number + 1
    padded = str(actual).zfill(6)
    return f"https://res.cloudinary.com/{cloud_name}/image/upload/q_auto,f_auto/{folder}/{folder}/frame_{padded}.jpg"


def download_image(url: str) -> Image.Image:
    with urlopen(url) as resp:
        return Image.open(BytesIO(resp.read())).convert("RGB")


def detect_contacts(frames, xs, ys):
    """Detect contact points via abrupt velocity direction changes (>115 deg)."""
    n = len(frames)
    if n < 7:
        return []

    window = 3
    angle_changes = np.zeros(n)
    for i in range(window, n - window):
        dt_b = frames[i] - frames[i - window]
        dt_a = frames[i + window] - frames[i]
        if dt_b == 0 or dt_a == 0:
            continue
        vxb = (xs[i] - xs[i - window]) / dt_b
        vyb = (ys[i] - ys[i - window]) / dt_b
        vxa = (xs[i + window] - xs[i]) / dt_a
        vya = (ys[i + window] - ys[i]) / dt_a
        ab = np.arctan2(vyb, vxb)
        aa = np.arctan2(vya, vxa)
        ac = abs(aa - ab)
        ac = min(ac, 2 * np.pi - ac)
        angle_changes[i] = ac

    min_contact_distance = 15
    threshold_rad = 2.0
    contacts = []
    for idx in np.argsort(-angle_changes):
        if angle_changes[idx] < threshold_rad:
            break
        if idx < window or idx >= n - window:
            continue
        if all(abs(idx - c) >= min_contact_distance for c in contacts):
            contacts.append(idx)
    contacts.sort()
    return contacts


def fit_quadratic(seg_frames, seg_xs, seg_ys):
    """Fit parametric quadratic curves x(t) and y(t) for a trajectory segment.

    Returns (poly_x, poly_y, frame_min, frame_max) where poly_x and poly_y
    are np.poly1d objects mapping frame number -> normalized coordinate.
    """
    t = seg_frames.astype(float)
    poly_x = np.polyfit(t, seg_xs, 2)
    poly_y = np.polyfit(t, seg_ys, 2)
    return np.poly1d(poly_x), np.poly1d(poly_y), int(seg_frames[0]), int(seg_frames[-1])


def eval_smooth_curve(poly_x, poly_y, frame_start, frame_end, img_w, img_h, up_to_frame=None):
    """Evaluate the quadratic curve at every frame from frame_start to frame_end (or up_to_frame).

    Returns a list of (px, py) pixel coordinates with one point per frame for a smooth curve.
    """
    last = min(frame_end, up_to_frame) if up_to_frame is not None else frame_end
    if last < frame_start:
        return []
    t = np.arange(frame_start, last + 1, dtype=float)
    px = (poly_x(t) * img_w).astype(int)
    py = (poly_y(t) * img_h).astype(int)
    return list(zip(px.tolist(), py.tolist()))


def main():
    db_url = os.getenv("DATABASE_URL")
    cloud_name = os.getenv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME")

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute(
        'SELECT name, "cloudinaryFolder", "totalFrames", fps, width, height '
        'FROM "pg-drizzle_video" WHERE id = %s',
        (VIDEO_ID,),
    )
    name, folder, total_frames, fps, width, height = cur.fetchone()
    print(f"Video: {name} ({total_frames} frames, {fps}fps, {width}x{height})")

    # Get ALL annotations
    cur.execute(
        """
        SELECT a."frameNumber", a.x, a.y, a."ballVisible"
        FROM "pg-drizzle_annotation" a
        WHERE a."videoId" = %s
        ORDER BY a."frameNumber"
        """,
        (VIDEO_ID,),
    )
    all_rows = cur.fetchall()
    conn.close()

    annotations = {}
    for frame_num, x, y, visible in all_rows:
        annotations[frame_num] = (x, y, visible)

    # Get visible-only for trajectory detection
    visible_frames = []
    visible_xs = []
    visible_ys = []
    for frame_num, x, y, visible in all_rows:
        if visible and x is not None and y is not None:
            visible_frames.append(frame_num)
            visible_xs.append(x)
            visible_ys.append(y)

    v_frames = np.array(visible_frames)
    v_xs = np.array(visible_xs)
    v_ys = np.array(visible_ys)

    # Detect contacts and build segments
    contacts = detect_contacts(v_frames, v_xs, v_ys)
    boundaries = [0] + contacts + [len(v_frames)]
    segments = []
    for i in range(len(boundaries) - 1):
        s, e = boundaries[i], boundaries[i + 1]
        if e - s >= 2:
            segments.append((s, e))

    print(f"Detected {len(contacts)} contacts, {len(segments)} trajectory segments")

    # Fit quadratic curves for each segment
    fitted_curves = []
    for i, (s, e) in enumerate(segments):
        label = TRAJECTORY_LABELS[i] if i < len(TRAJECTORY_LABELS) else f"Traj {i+1}"
        seg_frames = v_frames[s:e]
        seg_xs = v_xs[s:e]
        seg_ys = v_ys[s:e]
        poly_x, poly_y, f_min, f_max = fit_quadratic(seg_frames, seg_xs, seg_ys)
        fitted_curves.append((poly_x, poly_y, f_min, f_max))
        print(f"  {label}: frames {f_min}-{f_max} ({e-s} points) -> quadratic fit")

    # Pre-download all frames in parallel
    tmpdir = tempfile.mkdtemp(prefix="spike_track_traj_video_")
    raw_dir = os.path.join(tmpdir, "raw")
    out_dir = os.path.join(tmpdir, "out")
    os.makedirs(raw_dir)
    os.makedirs(out_dir)

    print(f"\nDownloading {total_frames} frames...")

    def download_frame(frame_num: int) -> None:
        url = get_frame_url(cloud_name, folder, frame_num)
        img = download_image(url)
        img.save(os.path.join(raw_dir, f"frame_{str(frame_num).zfill(6)}.jpg"), quality=95)

    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = {executor.submit(download_frame, i): i for i in range(total_frames)}
        done = 0
        for future in as_completed(futures):
            done += 1
            if done % 50 == 0 or done == total_frames:
                print(f"  {done}/{total_frames}")
            future.result()

    # Now process each frame sequentially, drawing smooth quadratic trails
    print(f"\nRendering smooth trajectory overlay on each frame...")
    for frame_num in range(total_frames):
        img = Image.open(os.path.join(raw_dir, f"frame_{str(frame_num).zfill(6)}.jpg"))
        draw = ImageDraw.Draw(img)
        img_w, img_h = img.size

        # Draw smooth quadratic curves up to current frame
        for seg_i, (s, e) in enumerate(segments):
            color = TRAJECTORY_COLORS[seg_i % len(TRAJECTORY_COLORS)]
            poly_x, poly_y, f_min, f_max = fitted_curves[seg_i]

            if frame_num < f_min:
                continue

            # Evaluate smooth curve from segment start up to current frame
            smooth_points = eval_smooth_curve(poly_x, poly_y, f_min, f_max, img_w, img_h, up_to_frame=frame_num)

            if len(smooth_points) < 2:
                continue

            # Draw smooth curve as connected line segments (one per frame = very smooth)
            for j in range(len(smooth_points) - 1):
                draw.line([smooth_points[j], smooth_points[j + 1]], fill=color, width=3)

            # Highlight current ball position on the curve
            if f_min <= frame_num <= f_max:
                px, py = smooth_points[-1]
                r = 8
                draw.ellipse([px - r, py - r, px + r, py + r], outline="white", width=2)
                draw.ellipse([px - 4, py - 4, px + 4, py + 4], fill=color)

        # Draw contact markers for contacts that have occurred
        for ci, c in enumerate(contacts):
            if v_frames[c] <= frame_num:
                # Use the fitted curve value at the contact frame for a clean position
                seg_idx = ci + 1 if ci + 1 < len(fitted_curves) else ci
                poly_x, poly_y, _, _ = fitted_curves[min(ci, len(fitted_curves) - 1)]
                px = int(poly_x(float(v_frames[c])) * img_w)
                py = int(poly_y(float(v_frames[c])) * img_h)
                r = 6
                draw.ellipse([px - r, py - r, px + r, py + r], outline="white", width=2)

        # Frame number + current segment label
        draw.text((10, 10), f"Frame {frame_num}", fill="white")
        current_label = ""
        for seg_i, (s, e) in enumerate(segments):
            poly_x, poly_y, f_min, f_max = fitted_curves[seg_i]
            if f_min <= frame_num <= f_max:
                current_label = TRAJECTORY_LABELS[seg_i] if seg_i < len(TRAJECTORY_LABELS) else ""
                current_color = TRAJECTORY_COLORS[seg_i % len(TRAJECTORY_COLORS)]
                break
        if current_label:
            draw.text((10, 30), current_label, fill=current_color)

        # Mini legend (bottom-left)
        legend_y_start = img_h - 18 * min(len(segments), 8) - 8
        draw.rectangle([5, legend_y_start - 2, 170, img_h - 2], fill=(0, 0, 0))
        for i, (s, e) in enumerate(segments):
            col = TRAJECTORY_COLORS[i % len(TRAJECTORY_COLORS)]
            label = TRAJECTORY_LABELS[i] if i < len(TRAJECTORY_LABELS) else f"Traj {i+1}"
            yp = legend_y_start + i * 18
            f_min = fitted_curves[i][2]
            if f_min > frame_num:
                col = tuple(c // 3 for c in col)
            draw.rectangle([8, yp, 20, yp + 12], fill=col)
            draw.text((24, yp), label, fill=col)

        img.save(os.path.join(out_dir, f"frame_{str(frame_num).zfill(6)}.jpg"), quality=95)

        if (frame_num + 1) % 50 == 0 or frame_num == total_frames - 1:
            print(f"  {frame_num + 1}/{total_frames}")

    # Assemble with ffmpeg
    output_path = Path(__file__).parent.parent / "trajectory_video.mp4"
    print(f"\nAssembling video...")
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", os.path.join(out_dir, "frame_%06d.jpg"),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        str(output_path),
    ]
    subprocess.run(cmd, check=True)

    print(f"\nVideo saved to: {output_path}")
    shutil.rmtree(tmpdir)
    print("Done!")


if __name__ == "__main__":
    main()
