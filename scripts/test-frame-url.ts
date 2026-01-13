/**
 * Test rapide de l'URL générée
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

function getFrameUrl(cloudinaryFolder: string, frameNumber: number): string {
  // FFmpeg starts frame numbering at 1, but application uses 0-indexed frames
  const actualFrameNumber = frameNumber + 1;
  const paddedFrameNumber = actualFrameNumber.toString().padStart(6, "0");
  const publicId = `${cloudinaryFolder}/${cloudinaryFolder}/frame_${paddedFrameNumber}`;

  return cloudinary.url(publicId, {
    quality: "auto",
    fetch_format: "auto",
    secure: true,
    transformation: [{ width: 1280, height: 720, crop: "limit" }],
  });
}

console.log("\n🧪 Test de l'URL générée pour frame 0 (devrait pointer vers frame_000001):\n");
console.log(getFrameUrl("reims-amiens-10s", 0));
console.log("\n📌 URL attendue:");
console.log("https://res.cloudinary.com/dy9wzccjs/image/upload/v1768320546/reims-amiens-10s/reims-amiens-10s/frame_000001.jpg");
