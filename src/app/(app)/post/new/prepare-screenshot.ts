import { MAX_LONG_EDGE, MAX_UPLOAD_BYTES } from "@/lib/upload";

export type PreparedScreenshot = { file: File; width: number; height: number };

/**
 * Resizes and compresses a screenshot in the browser before upload (7.1, D-08):
 * long edge ≤ 1600 px, WebP at quality 0.9 (JPEG where the browser can't
 * encode WebP, e.g. Safari). Transparent areas become white. If the result is
 * still too large, the quality steps down.
 */
export async function prepareScreenshot(original: File): Promise<PreparedScreenshot> {
  // `createImageBitmap` applies the photo's EXIF orientation.
  const bitmap = await createImageBitmap(original);
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't prepare images.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.9, 0.8, 0.65]) {
    const blob = await encode(canvas, quality);
    if (blob.size <= MAX_UPLOAD_BYTES) {
      const extension = blob.type === "image/webp" ? "webp" : "jpg";
      return {
        file: new File([blob], `screenshot.${extension}`, { type: blob.type }),
        width,
        height,
      };
    }
  }
  throw new Error("This screenshot is too large, even after compression.");
}

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const webp = await toBlob(canvas, "image/webp", quality);
  // Browsers that can't encode WebP silently return a PNG instead.
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", quality);
  if (!jpeg) throw new Error("This browser couldn't compress the image.");
  return jpeg;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
