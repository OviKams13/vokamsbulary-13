/**
 * Dev-seed posts (2.11) are marked by an `image_pathname` starting with this
 * prefix. They have no file in Vercel Blob (their image is a static app icon),
 * so nothing may ever call the Blob API for them.
 */
export const SEED_IMAGE_PREFIX = "seed/";

export function isSeedImage(imagePathname: string): boolean {
  return imagePathname.startsWith(SEED_IMAGE_PREFIX);
}
