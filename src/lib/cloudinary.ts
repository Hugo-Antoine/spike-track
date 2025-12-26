import { env } from "~/env";

/**
 * Client-side URL generation (for preloading in browser)
 * @param cloudinaryFolder - e.g., "volleyball/matches/match_1"
 * @param frameNumber - 0-indexed frame number
 * @returns URL string
 */
export function getFrameUrlClient(
  cloudinaryFolder: string,
  frameNumber: number
): string {
  const paddedFrameNumber = frameNumber.toString().padStart(6, "0");
  const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  // Note: Due to upload script using both public_id AND folder params,
  // the path is duplicated in Cloudinary
  return `https://res.cloudinary.com/${cloudName}/image/upload/q_auto,f_auto/${cloudinaryFolder}/${cloudinaryFolder}/frame_${paddedFrameNumber}.jpg`;
}
