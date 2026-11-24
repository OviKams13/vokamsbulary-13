import type { ReactNode } from "react";

import type { TotwOverview } from "@/db/totw";

import { AppNav } from "./app-nav";

/**
 * Desktop sidebar (≥ lg, 4.1, mockup 01-D) and the column beside it. Used by
 * the `(app)` layout and by the offline app (14.2).
 */
export function AppShell({ overview, children }: { overview: TotwOverview; children: ReactNode }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-sidebar border-r border-line bg-bg lg:flex">
        <AppNav overview={overview} variant="sidebar" />
      </aside>

      <div className="lg:pl-sidebar">{children}</div>
    </>
  );
}
