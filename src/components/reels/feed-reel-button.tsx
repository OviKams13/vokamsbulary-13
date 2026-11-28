"use client";

import { usePathname } from "next/navigation";

import { ReelButton } from "./reel-button";

/**
 * The phone feed's round gold ▶ (16.3), bottom-left, the size of the white
 * "+": plays every reel of the TOTW on screen (`/` = the current TOTW,
 * `/totw/n`), from its first word.
 */
export function FeedReelButton({ currentTotw }: { currentTotw: number }) {
  const pathname = usePathname();
  const match = /^\/totw\/([1-9]\d*)$/.exec(pathname);
  const totwNumber = pathname === "/" ? currentTotw : match ? Number(match[1]) : null;
  if (!totwNumber) return null;
  return <ReelButton key={totwNumber} scope={{ kind: "totw", totwNumber }} variant="fab" />;
}
