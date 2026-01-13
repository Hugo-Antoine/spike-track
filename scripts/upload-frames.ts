/**
 * Script pour uploader des frames déjà extraites vers Cloudinary
 *
 * Usage: npx tsx scripts/upload-frames.ts <frames-dir> <cloudinary-folder>
 * Exemple: npx tsx scripts/upload-frames.ts ./frames_reims_amiens_10s reims-amiens-10s
 */

import { readdir } from "fs/promises";
import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
import { resolve, join, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
config({ path: resolve(__dirname, "../.env") });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

async function uploadFramesToCloudinary(
  framesDir: string,
  cloudinaryFolder: string,
): Promise<void> {
  console.log("☁️  Upload vers Cloudinary...");
  console.log(`   Dossier local: ${framesDir}`);
  console.log(`   Dossier Cloudinary: ${cloudinaryFolder}\n`);

  const files = (await readdir(framesDir))
    .filter((f) => f.endsWith(".png") || f.endsWith(".jpg"))
    .sort();

  if (files.length === 0) {
    console.error("❌ Aucune image trouvée dans le dossier");
    process.exit(1);
  }

  console.log(`📦 ${files.length} frames à uploader\n`);

  let uploaded = 0;
  const total = files.length;
  const startTime = Date.now();

  for (const file of files) {
    const filePath = join(framesDir, file);
    // Create duplicated path structure as expected by getFrameUrl
    const publicId = `${cloudinaryFolder}/${file.replace(/\.(png|jpg)$/, "")}`;

    try {
      await cloudinary.uploader.upload(filePath, {
        public_id: publicId,
        folder: cloudinaryFolder, // This creates the duplicated path
        resource_type: "image",
      });

      uploaded++;
      if (uploaded % 10 === 0 || uploaded === total) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (uploaded / parseFloat(elapsed)).toFixed(1);
        console.log(
          `   Progression: ${uploaded}/${total} frames (${rate} frames/s)`,
        );
      }
    } catch (error) {
      console.error(`❌ Erreur lors de l'upload de ${file}:`, error);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Upload terminé en ${totalTime}s !`);
  console.log(`\n📁 Dossier Cloudinary: ${cloudinaryFolder}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "❌ Usage: npx tsx scripts/upload-frames.ts <frames-dir> <cloudinary-folder>",
    );
    console.error(
      "   Exemple: npx tsx scripts/upload-frames.ts ./frames_reims_amiens_10s reims-amiens-10s",
    );
    process.exit(1);
  }

  const [framesDir, cloudinaryFolder] = args;

  if (!existsSync(framesDir)) {
    console.error(`❌ Dossier introuvable : ${framesDir}`);
    process.exit(1);
  }

  try {
    await uploadFramesToCloudinary(framesDir, cloudinaryFolder);
  } catch (error) {
    console.error("❌ Erreur :", error);
    process.exit(1);
  }
}

main();
