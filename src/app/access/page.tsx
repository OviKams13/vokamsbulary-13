import type { Metadata } from "next";

import { BrandLogo } from "@/components/brand-logo";
import { safeNextPath } from "@/lib/access";

import { AccessForm } from "./access-form";

export const metadata: Metadata = {
  title: "Access · Vokamsbulary 13",
  robots: { index: false, follow: false },
};

/**
 * Access code screen (F1, mockup 06b). Desktop: a centered card on the
 * football pattern. Mobile: full screen, "Private app" pinned at the bottom.
 * The proxy sends visitors here when they have no valid access cookie.
 */
export default async function AccessPage({ searchParams }: PageProps<"/access">) {
  const { next } = await searchParams;

  return (
    <main className="relative flex min-h-dvh flex-col sm:items-center sm:justify-center sm:p-6">
      <FootballPattern />

      <div className="relative flex flex-1 flex-col items-center px-6 pt-28 pb-10 sm:w-full sm:max-w-105 sm:flex-none sm:rounded-4xl sm:border sm:border-white/6 sm:bg-surface/85 sm:px-11 sm:pt-12 sm:pb-10 sm:shadow-[0_30px_80px_rgb(0_0_0/0.6)] sm:backdrop-blur-sm">
        <div className="w-21 drop-shadow-[0_0_22px_rgb(232_184_75/0.35)] sm:w-24 [&_img]:h-auto [&_img]:w-full">
          <BrandLogo size={96} priority />
        </div>

        <h1 className="mt-7 mb-6 text-[1.65rem] font-extrabold tracking-tight sm:mt-6">
          Vokamsbulary 13
        </h1>

        <AccessForm next={safeNextPath(next)} />

        <p className="mt-auto flex items-center gap-2 pt-10 text-[0.8125rem] text-muted sm:mt-5 sm:pt-0">
          <LockIcon />
          Private app
        </p>
      </div>
    </main>
  );
}

/**
 * Background of faint football badges (circle + pentagon), staggered, as in
 * the mockup. Fainter on mobile, where it fills the whole screen.
 */
function FootballPattern() {
  return (
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-35 sm:opacity-100">
      <defs>
        <g id="football-badge" fill="none" stroke="#2f2f33" strokeWidth="2.5">
          <circle r="17" />
          <path d="M0 -7 L6.7 -2.2 L4.1 5.7 L-4.1 5.7 L-6.7 -2.2 Z" fill="#2f2f33" stroke="none" />
        </g>
        <pattern id="football-pattern" width="160" height="160" patternUnits="userSpaceOnUse">
          <use href="#football-badge" x="40" y="42" />
          <use href="#football-badge" x="115" y="112" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#football-pattern)" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="13"
      viewBox="0 0 12 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <rect x="1.5" y="5.5" width="9" height="6.5" rx="1.5" />
      <path d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" />
    </svg>
  );
}
