import Link from "next/link";

import { routes } from "@/lib/routes";

/**
 * Small rounded chip listing one term (headword) under a post card in the
 * feed. It searches for that headword (10.2): the other posts with the same
 * word, and the texts that contain it.
 */
export function TermChip({ headword }: { headword: string }) {
  return (
    <Link
      href={routes.search(headword)}
      aria-label={`Search for “${headword}”`}
      className="inline-flex items-center rounded-full border border-line-strong bg-surface-2 px-3 py-1 text-sm font-medium text-fg-soft transition hover:border-muted/60 hover:bg-surface-3 hover:text-fg"
    >
      {headword}
    </Link>
  );
}
