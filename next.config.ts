import type { NextConfig } from "next";

/**
 * Version of the service worker (14.1): one per deployment, so each deployment
 * registers `/sw.js?v=<version>` and the browser installs a new worker that
 * stores that deployment's offline app. Vercel gives the deployment id at
 * build time; elsewhere (local `next build`) a build timestamp, kept in the
 * environment so every build worker reads the same value.
 */
const swVersion =
  process.env.VERCEL_DEPLOYMENT_ID ??
  (process.env.VK13_SW_VERSION ??= `local-${Date.now().toString(36)}`);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SW_VERSION: swVersion,
  },
  experimental: {
    serverActions: {
      // The upload Server Action (7.1) receives the resized screenshot: up to
      // 4 MB (MAX_UPLOAD_BYTES) plus form overhead. Vercel's own cap is 4.5 MB.
      bodySizeLimit: "4.5mb",
    },
    // No on-disk Turbopack cache for `next dev` (on by default since 16.1):
    // twice a dev session served a stale compiled module (the /access styles
    // in 3.1, `ImageIcon` undefined in 7.1) although the source was correct.
    // A cold dev start costs a few seconds on this app; builds keep their cache.
    turbopackFileSystemCacheForDev: false,
  },
  async headers() {
    return [
      {
        // The service worker (14.1): always checked again, so a new version is
        // picked up on the next visit (Next.js PWA guide).
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
