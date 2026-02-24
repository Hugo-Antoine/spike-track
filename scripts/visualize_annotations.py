#!/usr/bin/env python3
"""
Script pour visualiser les annotations sur les images.
Récupère les annotations de la base de données et dessine les points sur les images.
"""

import os
import sys
import argparse
from pathlib import Path
from urllib.request import urlopen
from io import BytesIO

import psycopg2
from PIL import Image, ImageDraw
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


def get_database_url() -> str:
    """Récupère l'URL de la base de données depuis les variables d'environnement."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not found in environment variables")
    return db_url


def get_cloudinary_cloud_name() -> str:
    """Récupère le nom du cloud Cloudinary."""
    cloud_name = os.getenv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME") or os.getenv("CLOUDINARY_CLOUD_NAME")
    if not cloud_name:
        raise ValueError("CLOUDINARY_CLOUD_NAME not found in environment variables")
    return cloud_name


def get_frame_url(cloud_name: str, cloudinary_folder: str, frame_number: int) -> str:
    """
    Génère l'URL Cloudinary pour une frame donnée.
    Note: frame_number est 0-indexed dans l'app, FFmpeg utilise 1-indexed.
    """
    actual_frame = frame_number + 1
    padded = str(actual_frame).zfill(6)
    # Note: Le path est dupliqué à cause du script d'upload
    return f"https://res.cloudinary.com/{cloud_name}/image/upload/q_auto,f_auto/{cloudinary_folder}/{cloudinary_folder}/frame_{padded}.jpg"


def fetch_annotations(conn, video_id: str | None = None, limit: int | None = None):
    """
    Récupère les annotations depuis la base de données.

    Args:
        conn: Connexion PostgreSQL
        video_id: Optionnel - filtrer par vidéo
        limit: Optionnel - limiter le nombre de résultats

    Returns:
        Liste de tuples (video_id, video_name, cloudinary_folder, frame_number, x, y, user_name)
    """
    query = """
        SELECT
            v.id as video_id,
            v.name as video_name,
            v."cloudinaryFolder",
            v.width,
            v.height,
            a."frameNumber",
            a.x,
            a.y,
            u.name as user_name
        FROM "pg-drizzle_annotation" a
        JOIN "pg-drizzle_video" v ON a."videoId" = v.id
        JOIN "user" u ON a."userId" = u.id
        WHERE a."ballVisible" = true
        AND a.x IS NOT NULL
        AND a.y IS NOT NULL
    """

    params = []
    if video_id:
        query += " AND v.id = %s"
        params.append(video_id)

    query += ' ORDER BY v.name, a."frameNumber"'

    if limit:
        query += f" LIMIT {limit}"

    with conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()


def fetch_videos(conn):
    """Récupère la liste des vidéos disponibles."""
    query = """
        SELECT
            v.id,
            v.name,
            v."cloudinaryFolder",
            v."totalFrames",
            COUNT(a.id) as annotation_count
        FROM "pg-drizzle_video" v
        LEFT JOIN "pg-drizzle_annotation" a ON v.id = a."videoId" AND a."ballVisible" = true
        GROUP BY v.id, v.name, v."cloudinaryFolder", v."totalFrames"
        ORDER BY v.name
    """
    with conn.cursor() as cur:
        cur.execute(query)
        return cur.fetchall()


def download_image(url: str) -> Image.Image:
    """Télécharge une image depuis une URL."""
    with urlopen(url) as response:
        return Image.open(BytesIO(response.read()))


def draw_annotation(img: Image.Image, x_rel: float, y_rel: float, radius: int = 8, color: str = "red") -> Image.Image:
    """
    Dessine un point d'annotation sur l'image.

    Args:
        img: Image PIL
        x_rel: Coordonnée X relative (0-1)
        y_rel: Coordonnée Y relative (0-1)
        radius: Rayon du cercle
        color: Couleur du cercle

    Returns:
        Image avec l'annotation dessinée
    """
    img_copy = img.copy()
    draw = ImageDraw.Draw(img_copy)

    # Convertir les coordonnées relatives en pixels
    width, height = img.size
    x = int(x_rel * width)
    y = int(y_rel * height)

    # Dessiner un cercle avec un contour
    draw.ellipse(
        [x - radius, y - radius, x + radius, y + radius],
        fill=color,
        outline="white",
        width=2
    )

    # Dessiner une croix au centre pour plus de précision
    cross_size = radius // 2
    draw.line([(x - cross_size, y), (x + cross_size, y)], fill="white", width=2)
    draw.line([(x, y - cross_size), (x, y + cross_size)], fill="white", width=2)

    return img_copy


def main():
    parser = argparse.ArgumentParser(description="Visualise les annotations sur les images")
    parser.add_argument("--video-id", help="ID de la vidéo (UUID) - si non spécifié, liste les vidéos disponibles")
    parser.add_argument("--output-dir", default="./annotation_visualizations", help="Dossier de sortie")
    parser.add_argument("--limit", type=int, help="Nombre maximum d'images à traiter")
    parser.add_argument("--list-videos", action="store_true", help="Liste les vidéos disponibles")

    args = parser.parse_args()

    # Connexion à la base de données
    db_url = get_database_url()
    cloud_name = get_cloudinary_cloud_name()

    print(f"Connexion à la base de données...")
    conn = psycopg2.connect(db_url)

    try:
        # Mode liste des vidéos
        if args.list_videos or not args.video_id:
            print("\nVidéos disponibles:")
            print("-" * 80)
            videos = fetch_videos(conn)
            for vid_id, name, folder, total_frames, ann_count in videos:
                print(f"ID: {vid_id}")
                print(f"  Nom: {name}")
                print(f"  Dossier: {folder}")
                print(f"  Frames: {total_frames}")
                print(f"  Annotations (balle visible): {ann_count}")
                print()

            if not args.video_id:
                print("Utilisez --video-id <UUID> pour visualiser les annotations d'une vidéo")
                return

        # Récupérer les annotations
        print(f"\nRécupération des annotations...")
        annotations = fetch_annotations(conn, args.video_id, args.limit)

        if not annotations:
            print("Aucune annotation trouvée.")
            return

        print(f"Trouvé {len(annotations)} annotations")

        # Créer le dossier de sortie
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Traiter chaque annotation
        for i, (video_id, video_name, cloudinary_folder, width, height, frame_number, x, y, user_name) in enumerate(annotations):
            # Créer un sous-dossier par vidéo
            video_output_dir = output_dir / video_name.replace(" ", "_").replace("/", "_")
            video_output_dir.mkdir(parents=True, exist_ok=True)

            # Générer l'URL de l'image
            img_url = get_frame_url(cloud_name, cloudinary_folder, frame_number)

            print(f"[{i+1}/{len(annotations)}] Frame {frame_number} - ({x:.4f}, {y:.4f})")

            try:
                # Télécharger l'image
                img = download_image(img_url)

                # Dessiner l'annotation
                img_annotated = draw_annotation(img, x, y)

                # Sauvegarder
                output_path = video_output_dir / f"frame_{str(frame_number).zfill(6)}_annotated.jpg"
                img_annotated.save(output_path, quality=95)

            except Exception as e:
                print(f"  Erreur: {e}")
                continue

        print(f"\nImages sauvegardées dans: {output_dir.absolute()}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
