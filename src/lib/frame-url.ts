import { env } from "~/env";

/**
 * Generate CloudFront URL for a frame image.
 * @param s3FramesPrefix - S3 prefix, e.g. "frames/{segmentId}/"
 * @param frameNumber - 1-indexed frame number
 * @returns Full CloudFront URL to the frame JPEG
 */
export function getFrameUrl(
  s3FramesPrefix: string,
  frameNumber: number,
): string {
  const padded = String(frameNumber).padStart(6, "0");
  return `https://${env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN}/${s3FramesPrefix}frame_${padded}.jpg`;
}
