import type { Metadata } from "next";
import { Suspense } from "react";

import { BrandLogo } from "@/components/brand-logo";

import { OfflineApp } from "./offline-app";

export const metadata: Metadata = {
  title: "Vokamsbulary 13",
  robots: { index: false, follow: false },
};

// Built once, with no data: the posts come from the copy on the device. The
// proxy still asks for the access cookie, so only a device that entered the
// code can download it (the service worker stores it, 14.1).
export const dynamic = "force-static";

/** Logo sizes the app draws: sidebar 36, drawer 28, top bar 26, "no copy" screen 56. */
const LOGO_SIZES = [26, 28, 36, 56];

/** The offline app (14.2): served by the service worker when the server can't be reached. */
export default function OfflinePage() {
  return (
    <>
      {/* `useSearchParams` in a static page needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <OfflineApp />
      </Suspense>

      {/*
        The app's content is drawn only once the copy is read, so the logo
        isn't in this page's HTML by itself. These hidden copies put its image
        addresses there: the service worker stores what the page lists (14.1).
      */}
      <div hidden>
        {LOGO_SIZES.map((size) => (
          <BrandLogo key={size} size={size} />
        ))}
      </div>
    </>
  );
}
