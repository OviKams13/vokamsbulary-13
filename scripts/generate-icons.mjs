// Generates every app icon from the brand source `assets/brand/icon.png` (X-07).
// The source is never redrawn: it is only resized, cropped, flattened or padded.
//
// Run: npm run icons
//
// Output:
//   src/app/favicon.ico                 16 / 32 / 48 (Next.js file convention)
//   src/app/apple-icon.png              180, flattened on the app background
//   public/icons/icon-192.png           manifest "any"
//   public/icons/icon-512.png           manifest "any"
//   public/icons/icon-512-maskable.png  manifest "maskable" (shield inside the safe zone)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "assets/brand/icon.png");
const appDir = path.join(root, "src/app");
const iconsDir = path.join(root, "public/icons");

// App background token (--color-bg in globals.css).
const BACKGROUND = "#0b0b0c";

const png = (input, size) =>
  sharp(input).resize(size, size, { fit: "contain", background: BACKGROUND }).png();

async function main() {
  await mkdir(iconsDir, { recursive: true });

  // Favicon keeps the transparent rounded corners of the source.
  const icoSizes = await Promise.all(
    [16, 32, 48].map((size) => sharp(source).resize(size, size).png().toBuffer()),
  );
  await writeFile(path.join(appDir, "favicon.ico"), await pngToIco(icoSizes));

  // iOS fills transparency with black and applies its own corner mask: flatten first.
  await png(source, 180)
    .flatten({ background: BACKGROUND })
    .toFile(path.join(appDir, "apple-icon.png"));

  await png(source, 192).toFile(path.join(iconsDir, "icon-192.png"));
  await png(source, 512).toFile(path.join(iconsDir, "icon-512.png"));

  // Maskable: crop away the rounded outer frame (10% each side), scale the inner
  // square to 72%, then grow it back to 512 by repeating its edge pixels, so
  // there is no seam. The shield then sits inside the circular safe zone
  // (radius 40%) that Android masks to.
  const meta = await sharp(source).metadata();
  const inset = Math.round(meta.width * 0.1);
  const innerSize = Math.round(512 * 0.72);
  const inner = await sharp(source)
    .extract({
      left: inset,
      top: inset,
      width: meta.width - 2 * inset,
      height: meta.height - 2 * inset,
    })
    .resize(innerSize, innerSize)
    .flatten({ background: BACKGROUND })
    .toBuffer();
  const pad = (512 - innerSize) / 2;
  await sharp(inner)
    .extend({
      top: Math.floor(pad),
      bottom: Math.ceil(pad),
      left: Math.floor(pad),
      right: Math.ceil(pad),
      extendWith: "copy",
    })
    .png()
    .toFile(path.join(iconsDir, "icon-512-maskable.png"));

  console.log("Icons generated from assets/brand/icon.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
