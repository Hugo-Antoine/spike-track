/**
 * Script pour tester la génération d'URL Cloudinary
 */

import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "../.env") });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Test de la fonction getFrameUrl
function getFrameUrl(cloudinaryFolder: string, frameNumber: number): string {
  const paddedFrameNumber = frameNumber.toString().padStart(6, "0");
  const publicId = `${cloudinaryFolder}/${cloudinaryFolder}/frame_${paddedFrameNumber}`;

  return cloudinary.url(publicId, {
    quality: "auto",
    fetch_format: "auto",
    secure: true,
    transformation: [{ width: 1280, height: 720, crop: "limit" }],
  });
}

console.log("\n🧪 Test de génération d'URL Cloudinary\n");
console.log("Dossier: reims-amiens-10s");
console.log("Frame 0:", getFrameUrl("reims-amiens-10s", 0));
console.log("Frame 1:", getFrameUrl("reims-amiens-10s", 1));
console.log("\n💡 Teste ces URLs dans ton navigateur pour voir si les images existent.");
