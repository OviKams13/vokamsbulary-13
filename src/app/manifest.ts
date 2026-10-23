import type { MetadataRoute } from "next";

/** App background token (`--color-bg` in globals.css): splash screen and title bar. */
const BACKGROUND = "#0b0b0c";

/**
 * Web app manifest (11.1, F15), served at `/manifest.webmanifest`. The proxy
 * matcher skips that path and `/icons/`, so the browser can read both without
 * the access cookie (Phase 3).
 *
 * The icons were generated once from `assets/brand/icon.png` in 2.5
 * (`npm run icons`); they are reused as they are. No service worker: Chrome
 * installs without one since version 108 (mobile) / 112 (desktop), and the
 * app has no offline mode.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Vokamsbulary 13",
    // Home-screen label, as on the app icon board ("Vokams 13").
    short_name: "Vokams 13",
    description: "Personal English vocabulary feed, grouped by Team of the Week.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BACKGROUND,
    theme_color: BACKGROUND,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
