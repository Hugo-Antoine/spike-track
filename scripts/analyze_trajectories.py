#!/usr/bin/env python3
"""
Analyze volleyball ball trajectories from annotations.
Detects contact points (serve, reception, set, attack) by finding
abrupt changes in ball velocity direction, then plots each trajectory
segment with a different color on a background frame.
"""

import os
import numpy as np
from pathlib import Path
from urllib.request import urlopen
from io import BytesIO

import psycopg2
from PIL import Image, ImageDraw
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

VIDEO_ID = "d603f983-8906-4072-b319-1dd81a55558b"

TRAJECTORY_COLORS = [
    (255, 255, 0),    # Yellow
    (0, 255, 255),    # Cyan
    (0, 255, 0),      # Green
    (255, 165, 0),    # Orange
    (255, 0, 0),      # Red
    (255, 0, 255),    # Magenta
    (128, 255, 128),  # Light green
    (128, 128, 255),  # Light blue
]

TRAJECTORY_LABELS = [
    "Service (toss)",
    "Service (vol)",
    "Reception/Passe",
    "Passe haute",
    "Attaque",
    "Trajectoire 6",
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
    """
    Detect ball contact points by finding abrupt changes in velocity direction.
    Uses a sliding window to compute average velocity before/after each point
    and detects points where the angle change exceeds ~115 degrees.
    """
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

    # Find peaks: angle change > 2.0 rad (~115 deg), greedy with min distance
    min_contact_distance = 15
    threshold_rad = 2.0

    contacts = []
    sorted_indices = np.argsort(-angle_changes)
    for idx in sorted_indices:
        if angle_changes[idx] < threshold_rad:
            break
        if idx < window or idx >= n - window:
            continue
        if all(abs(idx - c) >= min_contact_distance for c in contacts):
            contacts.append(idx)

    contacts.sort()
    return contacts


def main():
    db_url = os.getenv("DATABASE_URL")
    cloud_name = os.getenv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME")

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute(
        'SELECT name, "cloudinaryFolder", "totalFrames", width, height '
        'FROM "pg-drizzle_video" WHERE id = %s',
        (VIDEO_ID,),
    )
    name, folder, total_frames, width, height = cur.fetchone()

    cur.execute(
        """
        SELECT a."frameNumber", a.x, a.y
        FROM "pg-drizzle_annotation" a
        WHERE a."videoId" = %s AND a."ballVisible" = true
          AND a.x IS NOT NULL AND a.y IS NOT NULL
        ORDER BY a."frameNumber"
        """,
        (VIDEO_ID,),
    )
    rows = cur.fetchall()
    conn.close()

    frames = np.array([r[0] for r in rows])
    xs = np.array([r[1] for r in rows])
    ys = np.array([r[2] for r in rows])

    print(f"Video: {name}")
    print(f"Visible annotations: {len(frames)} (frames {frames[0]}-{frames[-1]})")

    # Detect contacts
    contacts = detect_contacts(frames, xs, ys)
    print(f"\nDetected {len(contacts)} contact points:")
    for i, c in enumerate(contacts):
        print(f"  Contact {i+1}: frame {frames[c]} (index {c}), "
              f"pos=({xs[c]:.3f}, {ys[c]:.3f})")

    # Build trajectory segments
    boundaries = [0] + contacts + [len(frames)]
    segments = []
    for i in range(len(boundaries) - 1):
        start = boundaries[i]
        end = boundaries[i + 1]
        if end - start >= 2:
            segments.append((start, end))

    print(f"\nTrajectory segments: {len(segments)}")
    for i, (s, e) in enumerate(segments):
        label = TRAJECTORY_LABELS[i] if i < len(TRAJECTORY_LABELS) else f"Traj {i+1}"
        print(f"  {label}: frames {frames[s]}-{frames[e-1]} ({e-s} points)")

    # Download a middle frame as background
    mid_frame = frames[len(frames) // 2]
    print(f"\nDownloading background frame {mid_frame}...")
    bg_url = get_frame_url(cloud_name, folder, mid_frame)
    bg_img = download_image(bg_url)

    # Darken background for better visibility
    bg_array = np.array(bg_img, dtype=np.float32)
    bg_array *= 0.3
    bg_img = Image.fromarray(bg_array.astype(np.uint8))

    draw = ImageDraw.Draw(bg_img)
    img_w, img_h = bg_img.size

    # Draw each trajectory segment with quadratic fit
    for seg_i, (s, e) in enumerate(segments):
        color = TRAJECTORY_COLORS[seg_i % len(TRAJECTORY_COLORS)]
        seg_frames = frames[s:e]
        seg_xs = xs[s:e]
        seg_ys = ys[s:e]

        # Fit quadratic: x(t) and y(t) as functions of frame number
        t = seg_frames.astype(float)
        poly_x = np.poly1d(np.polyfit(t, seg_xs, 2))
        poly_y = np.poly1d(np.polyfit(t, seg_ys, 2))

        # Evaluate smooth curve (one point per frame for smoothness)
        t_smooth = np.arange(seg_frames[0], seg_frames[-1] + 1, dtype=float)
        smooth_px = (poly_x(t_smooth) * img_w).astype(int)
        smooth_py = (poly_y(t_smooth) * img_h).astype(int)
        smooth_points = list(zip(smooth_px.tolist(), smooth_py.tolist()))

        # Draw smooth curve
        for j in range(len(smooth_points) - 1):
            draw.line([smooth_points[j], smooth_points[j + 1]], fill=color, width=3)

        # Draw start/end markers
        for px, py in [smooth_points[0], smooth_points[-1]]:
            r = 4
            draw.ellipse([px - r, py - r, px + r, py + r], fill=color, outline="white")

        # Label at segment start
        label = TRAJECTORY_LABELS[seg_i] if seg_i < len(TRAJECTORY_LABELS) else f"Traj {seg_i+1}"
        draw.text((smooth_points[0][0] + 8, smooth_points[0][1] - 15), label, fill=color)

    # Draw contact points using fitted curve positions
    for ci, c in enumerate(contacts):
        # Use the curve ending at this contact for a smooth position
        seg_idx = min(ci, len(segments) - 1)
        s_seg, e_seg = segments[seg_idx]
        seg_t = frames[s_seg:e_seg].astype(float)
        p_x = np.poly1d(np.polyfit(seg_t, xs[s_seg:e_seg], 2))
        p_y = np.poly1d(np.polyfit(seg_t, ys[s_seg:e_seg], 2))
        px = int(p_x(float(frames[c])) * img_w)
        py = int(p_y(float(frames[c])) * img_h)
        r = 8
        draw.ellipse([px - r, py - r, px + r, py + r], outline="white", width=3)
        draw.text((px + 12, py - 8), f"Contact (f{frames[c]})", fill="white")

    # Draw legend
    legend_x = 20
    legend_y = img_h - 30 * min(len(segments), 8) - 20
    draw.rectangle(
        [legend_x - 5, legend_y - 5, legend_x + 250, img_h - 10],
        fill=(0, 0, 0),
        outline="white",
    )
    for i, (s, e) in enumerate(segments):
        color = TRAJECTORY_COLORS[i % len(TRAJECTORY_COLORS)]
        label = TRAJECTORY_LABELS[i] if i < len(TRAJECTORY_LABELS) else f"Traj {i+1}"
        y_pos = legend_y + i * 30
        draw.rectangle([legend_x, y_pos, legend_x + 20, y_pos + 20], fill=color)
        draw.text((legend_x + 28, y_pos + 3), f"{label} (f{frames[s]}-{frames[e-1]})", fill="white")

    # Save
    output_path = Path(__file__).parent.parent / "trajectories_analysis.png"
    bg_img.save(str(output_path), quality=95)
    print(f"\nImage saved to: {output_path}")


if __name__ == "__main__":
    main()
