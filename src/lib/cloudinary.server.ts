import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { env } from "~/env";

// Configure Cloudinary (server-side only)
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Generate Cloudinary URL for a specific frame (server-side)
 * @param cloudinaryFolder - e.g., "volleyball/matches/match_1"
 * @param frameNumber - 0-indexed frame number
 * @returns HTTPS URL to the frame image
 */
export function getFrameUrl(
  cloudinaryFolder: string,
  frameNumber: number
): string {
  const paddedFrameNumber = frameNumber.toString().padStart(6, "0");
  // Note: Due to upload script using both public_id AND folder params,
  // the path is duplicated in Cloudinary
  const publicId = `${cloudinaryFolder}/${cloudinaryFolder}/frame_${paddedFrameNumber}`;

  return cloudinary.url(publicId, {
    quality: "auto",
    fetch_format: "auto",
    secure: true,
    transformation: [
      { width: 1280, height: 720, crop: "limit" }, // 720p for better performance
    ],
  });
}
