import Link from "next/link";

import { PlusIcon } from "@/components/icons";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { getTotwOverview } from "@/db/totw";
import { routes } from "@/lib/routes";

/**
 * Mobile chrome of the feed pages (4.2, mockups 01-M, 01-drawer): top bar with
 * the drawer, and the floating "+" button. Hidden on desktop.
 */
export default async function FeedLayout({ children }: LayoutProps<"/">) {
  // Same request-cached call as the app layout: no extra database round trip.
  const overview = await getTotwOverview();

  return (
    <>
      <MobileTopBar overview={overview} />

      {children}

      <Link
        href={routes.newPost}
        aria-label="New post"
        className="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-20 grid size-15 place-items-center rounded-full bg-fg text-bg shadow-[0_8px_24px_rgb(0_0_0/0.5)] transition hover:bg-white lg:hidden"
      >
        <PlusIcon size={26} />
      </Link>
    </>
  );
}
