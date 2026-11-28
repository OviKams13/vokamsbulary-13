"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { prepareInBackground } from "./reel-store";

/**
 * The background run (16.3): while the app is open and online, the words of
 * new posts that the publish run didn't reach are prepared one by one. Checked
 * when the app opens, on each page change, and when the connection is back.
 */
export function ReelBackground() {
  const pathname = usePathname();

  useEffect(() => {
    const start = () => void prepareInBackground();
    const timer = window.setTimeout(start, 2_000);
    window.addEventListener("online", start);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", start);
    };
  }, [pathname]);

  return null;
}
