import type { ReactNode } from "react";

import { PlusIcon } from "@/components/icons";
import { NetworkLink } from "@/components/offline/network-link";
import { FeedReelButton } from "@/components/reels/feed-reel-button";
import type { TotwOverview } from "@/db/totw";
import { routes } from "@/lib/routes";

import { MobileTopBar } from "./mobile-top-bar";

/**
 * Mobile chrome of the feed pages (4.2, mockups 01-M, 01-drawer): top bar with
 * the drawer, the floating "+" button and the gold ▶ of the reels (16.3).
 * Hidden on desktop. Used by the
 * `(feed)` layout and by the offline app (14.2).
 */
export function FeedChrome({
  overview,
  children,
}: {
  overview: TotwOverview;
  children: ReactNode;
}) {
  return (
    <>
      <MobileTopBar overview={overview} />

      {children}

      {/* 16.3: the TOTW's reels, bottom-left, opposite the "+". */}
      <FeedReelButton currentTotw={overview.current.number} />

      <NetworkLink
        href={routes.newPost}
        action="New post"
        aria-label="New post"
        className="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-20 grid size-15 place-items-center rounded-full bg-fg text-bg shadow-[0_8px_24px_rgb(0_0_0/0.5)] transition hover:bg-white lg:hidden"
      >
        <PlusIcon size={26} />
      </NetworkLink>
    </>
  );
}
