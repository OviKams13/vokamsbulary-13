import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
