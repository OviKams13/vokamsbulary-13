import Link from "next/link";

import { PlusIcon } from "@/components/icons";
import { AppNav } from "@/components/shell/app-nav";
import { MobileTopBar } from "@/components/shell/mobile-top-bar";
import { getTotwOverview } from "@/db/totw";
import { routes } from "@/lib/routes";

/**
 * App shell for every page behind the access code (Phase 4).
 * Desktop (≥ lg): fixed left sidebar (4.1, mockup 01-D).
 * Mobile: top bar + drawer + floating "+" button (4.2, mockups 01-M, 01-drawer).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const overview = await getTotwOverview();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-sidebar border-r border-line bg-bg lg:flex">
        <AppNav overview={overview} variant="sidebar" />
      </aside>

      <MobileTopBar overview={overview} />

      <div className="lg:pl-sidebar">{children}</div>

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
