/**
 * Script pour extraire les frames d'une vidéo et les uploader sur Cloudinary
 *
 * Prérequis : installer ffmpeg
 *   Ubuntu: sudo apt install ffmpeg
 *   macOS: brew install ffmpeg
 *
 * Usage: npx tsx scripts/extract-and-upload.ts <video-path> <output-folder-name>
 * Exemple: npx tsx scripts/extract-and-upload.ts ./videos/match1.mp4 volleyball/match1
 */

import { exec } from "child_process";
import { promisify } from "util";
import { readdir, mkdir } from "fs/promises";
import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
import { resolve, join, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

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

async function extractFrames(
  videoPath: string,
  outputDir: string,
): Promise<void> {
  console.log("\n🎬 Extraction des frames...");

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  // Extraire toutes les frames au format JPG avec numérotation sur 6 chiffres
  await execAsync(
    `ffmpeg -i "${videoPath}" -vf "scale=1920:-1" -q:v 2 "${outputDir}/frame_%06d.jpg"`,
  );

  console.log("✅ Frames extraites avec succès !");
}

async function uploadToCloudinary(
  framesDir: string,
  cloudinaryFolder: string,
): Promise<void> {
  console.log("\n☁️  Upload vers Cloudinary...");

  const files = (await readdir(framesDir))
    .filter((f) => f.endsWith(".jpg"))
    .sort();

  let uploaded = 0;
  const total = files.length;

  for (const file of files) {
    const filePath = join(framesDir, file);
    const publicId = `${cloudinaryFolder}/${file.replace(".jpg", "")}`;

    await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      folder: cloudinaryFolder,
      resource_type: "image",
    });

    uploaded++;
    if (uploaded % 10 === 0 || uploaded === total) {
      console.log(`   Progression: ${uploaded}/${total} frames uploadées`);
    }
  }

  console.log("✅ Toutes les frames ont été uploadées sur Cloudinary !");
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "❌ Usage: npx tsx scripts/extract-and-upload.ts <video-path> <cloudinary-folder>",
    );
    console.error(
      "   Exemple: npx tsx scripts/extract-and-upload.ts ./video.mp4 volleyball/match1",
    );
    process.exit(1);
  }

  const [videoPath, cloudinaryFolder] = args;

  if (!existsSync(videoPath)) {
    console.error(`❌ Fichier vidéo introuvable : ${videoPath}`);
    process.exit(1);
  }

  try {
    // 1. Obtenir les infos de la vidéo
    const info = await getVideoInfo(videoPath);

    // 2. Extraire les frames localement
    const tempDir = resolve(__dirname, "../temp/frames");
    await extractFrames(videoPath, tempDir);

    // 3. Upload vers Cloudinary
    await uploadToCloudinary(tempDir, cloudinaryFolder);

    // 4. Afficher le résumé pour ajouter à la BDD
    console.log("\n" + "=".repeat(60));
    console.log("🎉 SUCCÈS ! Ajoutez maintenant cette vidéo à la BDD :");
    console.log("=".repeat(60));
    console.log("\nUtilisez ces valeurs dans add-videos.ts :");
    console.log(
      JSON.stringify(
        {
          name: "DONNEZ UN NOM À VOTRE VIDÉO",
          cloudinaryFolder: cloudinaryFolder,
          totalFrames: info.totalFrames,
          fps: info.fps,
          width: info.width,
          height: info.height,
        },
        null,
        2,
      ),
    );
    console.log("\nPuis exécutez : npx tsx scripts/add-videos.ts");
  } catch (error) {
    console.error("❌ Erreur :", error);
    process.exit(1);
  }
}

main();
