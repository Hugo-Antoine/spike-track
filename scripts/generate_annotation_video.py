#!/usr/bin/env python3
"""
Generate a video with annotation overlay from database annotations.
Downloads frames from Cloudinary, draws annotation points, and assembles into MP4.
"""

import os
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from io import BytesIO
from urllib.request import urlopen

import psycopg2
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

VIDEO_ID = "d603f983-8906-4072-b319-1dd81a55558b"


def get_frame_url(cloud_name: str, folder: str, frame_number: int) -> str:
    actual = frame_number + 1
    padded = str(actual).zfill(6)
    return f"https://res.cloudinary.com/{cloud_name}/image/upload/q_auto,f_auto/{folder}/{folder}/frame_{padded}.jpg"


def download_image(url: str) -> Image.Image:
    with urlopen(url) as resp:
        return Image.open(BytesIO(resp.read())).convert("RGB")


def draw_annotation_on_image(
    img: Image.Image,
    x_rel: float | None,
    y_rel: float | None,
    ball_visible: bool,
    frame_number: int,
) -> Image.Image:
    draw = ImageDraw.Draw(img)
    w, h = img.size

    # Draw frame number
    draw.text((10, 10), f"Frame {frame_number}", fill="white")

    if ball_visible and x_rel is not None and y_rel is not None:
        x = int(x_rel * w)
        y = int(y_rel * h)
        r = 10

        # Outer circle
        draw.ellipse([x - r, y - r, x + r, y + r], outline="red", width=3)
        # Inner dot
        draw.ellipse([x - 3, y - 3, x + 3, y + 3], fill="red")
        # Crosshair
        draw.line([(x - r - 4, y), (x + r + 4, y)], fill="red", width=2)
        draw.line([(x, y - r - 4), (x, y + r + 4)], fill="red", width=2)

        # Status text
        draw.text((10, 30), f"Ball: ({x_rel:.3f}, {y_rel:.3f})", fill="lime")
    else:
        draw.text((10, 30), "Ball: not visible", fill="gray")

    return img


def main():
    db_url = os.getenv("DATABASE_URL")
    cloud_name = os.getenv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME")

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Get video info
    cur.execute(
        'SELECT name, "cloudinaryFolder", "totalFrames", fps, width, height '
        'FROM "pg-drizzle_video" WHERE id = %s',
        (VIDEO_ID,),
    )
    video = cur.fetchone()
    if not video:
        print("Video not found")
        return

    name, folder, total_frames, fps, width, height = video
    print(f"Video: {name} ({total_frames} frames, {fps}fps, {width}x{height})")

    # Get ALL annotations (including ball not visible)
    cur.execute(
        """
        SELECT a."frameNumber", a.x, a.y, a."ballVisible"
        FROM "pg-drizzle_annotation" a
        WHERE a."videoId" = %s
        ORDER BY a."frameNumber"
        """,
        (VIDEO_ID,),
    )
    rows = cur.fetchall()
    conn.close()

    # Build annotation lookup
    annotations = {}
    for frame_num, x, y, visible in rows:
        annotations[frame_num] = (x, y, visible)

    print(f"Loaded {len(annotations)} annotations")
    visible_count = sum(1 for _, _, v in annotations.values() if v)
    print(f"  Ball visible: {visible_count}, not visible: {len(annotations) - visible_count}")

    # Create temp dir for frames
    tmpdir = tempfile.mkdtemp(prefix="spike_track_video_")
    print(f"Temp directory: {tmpdir}")

    # Download and annotate frames in parallel
    def process_frame(frame_num: int) -> str:
        url = get_frame_url(cloud_name, folder, frame_num)
        img = download_image(url)

        ann = annotations.get(frame_num)
        if ann:
            x, y, visible = ann
            img = draw_annotation_on_image(img, x, y, visible, frame_num)
        else:
            draw = ImageDraw.Draw(img)
            draw.text((10, 10), f"Frame {frame_num}", fill="white")
            draw.text((10, 30), "No annotation", fill="yellow")

        out_path = os.path.join(tmpdir, f"frame_{str(frame_num).zfill(6)}.jpg")
        img.save(out_path, quality=95)
        return out_path

    print(f"\nDownloading and annotating {total_frames} frames...")
    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = {executor.submit(process_frame, i): i for i in range(total_frames)}
        done = 0
        for future in as_completed(futures):
            done += 1
            if done % 30 == 0 or done == total_frames:
                print(f"  {done}/{total_frames} frames processed")
            future.result()  # raise if error

    # Assemble video with ffmpeg
    output_path = Path(__file__).parent.parent / "annotation_video.mp4"
    print(f"\nAssembling video with ffmpeg...")

    cmd = [
        "ffmpeg",
        "-y",
        "-framerate", str(fps),
        "-i", os.path.join(tmpdir, "frame_%06d.jpg"),
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        str(output_path),
    ]
    subprocess.run(cmd, check=True)

    print(f"\nVideo saved to: {output_path}")
    print(f"Cleaning up temp files...")

    # Cleanup
    import shutil
    shutil.rmtree(tmpdir)

    print("Done!")


if __name__ == "__main__":
    main()
