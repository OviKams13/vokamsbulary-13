import type { ReactNode } from "react";

/** Small rounded chip listing one term (headword) under a post card in the feed. */
export function TermChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line-strong bg-surface-2 px-3 py-1 text-sm font-medium text-fg-soft">
      {children}
    </span>
  );
}
