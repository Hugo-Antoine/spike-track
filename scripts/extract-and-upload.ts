/**
 * Script unifié pour importer une vidéo dans spike-track :
 * upload de la vidéo entière sur Cloudinary et insertion en base de données.
 * Les frames sont extraites à la demande via la transformation `so_` de Cloudinary.
 *
 * Prérequis : installer ffmpeg (pour ffprobe)
 *   Ubuntu: sudo apt install ffmpeg
 *   macOS: brew install ffmpeg
 *
 * Usage: npx tsx scripts/extract-and-upload.ts <video-path> <cloudinary-folder> [video-name]
 * Exemples:
 *   npx tsx scripts/extract-and-upload.ts ./match2.mp4 reims-amiens-set2
 *   npx tsx scripts/extract-and-upload.ts ./match2.mp4 reims-amiens-set2 "Match Reims vs Amiens - Set 2"
 */

import { exec } from "child_process";
import { promisify } from "util";
import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
import { resolve, dirname, basename } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/server/db/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

// Charger les variables d'environnement
config({ path: resolve(__dirname, "../.env") });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

interface VideoInfo {
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
}

async function getVideoInfo(videoPath: string): Promise<VideoInfo> {
  console.log("📊 Récupération des informations de la vidéo...");

  // Obtenir le nombre de frames
  const { stdout: framesOut } = await execAsync(
    `ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "${videoPath}"`,
  );
  const totalFrames = parseInt(framesOut.trim());

  // Obtenir FPS
  const { stdout: fpsOut } = await execAsync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
  );
  const [num, den] = fpsOut.trim().split("/").map(Number);
  const fps = Math.round(num / den);

  // Obtenir largeur et hauteur
  const { stdout: sizeOut } = await execAsync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${videoPath}"`,
  );
  const [width, height] = sizeOut.trim().split(",");

  console.log(`   Frames: ${totalFrames}`);
  console.log(`   FPS: ${fps}`);
  console.log(`   Résolution: ${width}x${height}`);

  return {
    totalFrames,
    fps,
    width: parseInt(width),
    height: parseInt(height),
  };
}

async function uploadVideoToCloudinary(
  videoPath: string,
  cloudinaryFolder: string,
): Promise<string> {
  console.log("\n☁️  Upload de la vidéo vers Cloudinary...");

  const publicId = `${cloudinaryFolder}/${basename(videoPath, ".mp4")}`;

  const result = await cloudinary.uploader.upload(videoPath, {
    resource_type: "video",
    public_id: publicId,
    overwrite: true,
  });

  console.log(`✅ Vidéo uploadée ! Public ID: ${result.public_id}`);
  return result.public_id;
}

async function insertIntoDatabase(videoData: {
  name: string;
  cloudinaryPublicId: string;
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
}): Promise<string> {
  console.log("\n💾 Insertion en base de données...");

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const [inserted] = await db
    .insert(schema.videos)
    .values(videoData)
    .returning();

  console.log(`✅ Vidéo ajoutée : ${inserted.name} (ID: ${inserted.id})`);
  return inserted.id;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "❌ Usage: npx tsx scripts/extract-and-upload.ts <video-path> <cloudinary-folder> [video-name]",
    );
    console.error(
      "   Exemple: npx tsx scripts/extract-and-upload.ts ./match2.mp4 reims-amiens-set2",
    );
    console.error(
      '   Exemple: npx tsx scripts/extract-and-upload.ts ./match2.mp4 reims-amiens-set2 "Match Reims vs Amiens - Set 2"',
    );
    process.exit(1);
  }

  const [videoPath, cloudinaryFolder, videoNameArg] = args;

  if (!existsSync(videoPath)) {
    console.error(`❌ Fichier vidéo introuvable : ${videoPath}`);
    process.exit(1);
  }

  // Dériver le nom de la vidéo du nom de fichier si non fourni
  const videoName =
    videoNameArg ?? basename(videoPath, ".mp4").replace(/[_-]/g, " ");

  try {
    // 1. Obtenir les infos de la vidéo
    const info = await getVideoInfo(videoPath);

    // 2. Upload la vidéo entière vers Cloudinary
    const cloudinaryPublicId = await uploadVideoToCloudinary(
      videoPath,
      cloudinaryFolder,
    );

    // 3. Insérer en base de données
    const videoId = await insertIntoDatabase({
      name: videoName,
      cloudinaryPublicId,
      totalFrames: info.totalFrames,
      fps: info.fps,
      width: info.width,
      height: info.height,
    });

    // 4. Résumé final
    console.log("\n" + "=".repeat(60));
    console.log("🎉 IMPORT TERMINÉ AVEC SUCCÈS !");
    console.log("=".repeat(60));
    console.log(`   Nom       : ${videoName}`);
    console.log(`   Public ID : ${cloudinaryPublicId}`);
    console.log(`   Frames    : ${info.totalFrames}`);
    console.log(`   FPS       : ${info.fps}`);
    console.log(`   Taille    : ${info.width}x${info.height}`);
    console.log(`   ID        : ${videoId}`);
  } catch (error) {
    console.error("❌ Erreur :", error);
    process.exit(1);
  }
}

main();
