import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { CloseIcon, SearchIcon } from "@/components/icons";
import type { TotwOverview } from "@/db/totw";
import { routes } from "@/lib/routes";

import { AppNav } from "./app-nav";
import { MobileDrawer } from "./mobile-drawer";

/** Mobile top bar (4.2, mockup 01-M): menu, logo, search icon. Hidden on desktop. */
export function MobileTopBar({ overview }: { overview: TotwOverview }) {
  return (
    <header className="sticky top-0 z-30 flex h-15 items-center gap-2 border-b border-line bg-bg/95 px-4 backdrop-blur lg:hidden">
      <MobileDrawer>
        <AppNav
          overview={overview}
          variant="drawer"
          action={
            <form method="dialog">
              <button
                type="submit"
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-lg text-fg-soft"
              >
                <CloseIcon size={20} />
              </button>
            </form>
          }
        />
      </MobileDrawer>

      <Link href={routes.home} className="rounded-lg">
        <BrandLogo withName size={26} nameClassName="text-[1.0625rem]" />
      </Link>

      {/* The mobile search page (10.2, 05-M). */}
      <Link
        href={routes.search()}
        aria-label="Search"
        className="-mr-1.5 ml-auto grid size-10 place-items-center rounded-lg text-fg"
      >
        <SearchIcon size={20} />
      </Link>
    </header>
  );
}
