/**
 * Screenshot upload rules (7.1, F2, feasibility §6.2), shared by the browser
 * (resize before sending) and the server (checks after receiving).
 */

/** Types the file picker accepts. Claude reads all three. */
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** Long edge after resizing: keeps text readable and halves the image cost (D-08). */
export const MAX_LONG_EDGE = 1600;

/**
 * Largest file the server accepts. Vercel functions take at most 4.5 MB per
 * request; a resized screenshot is usually well under 1 MB.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function isAcceptedImageType(type: string): type is (typeof ACCEPTED_IMAGE_TYPES)[number] {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
}

export const EXTENSION_BY_TYPE: Record<(typeof ACCEPTED_IMAGE_TYPES)[number], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
