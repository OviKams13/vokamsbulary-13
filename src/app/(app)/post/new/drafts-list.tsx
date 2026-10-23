import Image from "next/image";
import Link from "next/link";

import type { UnfinishedDraft } from "@/db/drafts";
import { formatInlineDate } from "@/lib/relative-date";
import { routes } from "@/lib/routes";

import { DeleteDraftButton } from "./delete-draft-button";

type Badge = { label: string; short: string; className: string };

const BADGES = {
  reading: { label: "Reading", short: "Reading", className: "bg-surface-3 text-fg-soft" },
  verify: { label: "Needs verify", short: "Verify", className: "bg-[#3a2e10] text-gold" },
  ready: { label: "Ready", short: "Ready", className: "bg-[#15291c] text-[#8fdba8]" },
  failed: { label: "Failed", short: "Failed", className: "bg-[#3d1618] text-[#ff8f8f]" },
} satisfies Record<string, Badge>;

/** Badge and one-line state of a draft (no "failed" status exists: `last_error` says it). */
function describe(draft: UnfinishedDraft): { badge: Badge; detail: string; short: string } {
  const words = `${draft.termCount} word${draft.termCount === 1 ? "" : "s"}`;
  if (draft.status === "uploaded") {
    return draft.lastError
      ? { badge: BADGES.failed, detail: "Couldn't read the text", short: "Couldn't read" }
      : { badge: BADGES.reading, detail: "Reading the text…", short: "Reading…" };
  }
  if (draft.status === "explained") {
    return { badge: BADGES.ready, detail: `${words} explained · ready to publish`, short: words };
  }
  return draft.lastError
    ? { badge: BADGES.failed, detail: "Couldn't write the explanations", short: words }
    : { badge: BADGES.verify, detail: `${words} detected`, short: words };
}

/**
 * "Unfinished drafts" under the drop zone (7.10, mockups 03a-D / 03a-M):
 * every unpublished post with a thumbnail of its screenshot, when it was last
 * saved, its state, Resume and Delete. Resume opens the draft's own page,
 * which sends it on to its step (processing, error screen or Verify).
 */
export function DraftsList({ drafts }: { drafts: UnfinishedDraft[] }) {
  if (drafts.length === 0) return null;
  const now = new Date();

  return (
    <section aria-labelledby="drafts-label" className="mt-8 lg:mt-9">
      <div className="mb-3 flex items-baseline justify-between">
        <h2
          id="drafts-label"
          className="text-xs font-semibold tracking-[0.12em] text-muted uppercase"
        >
          Unfinished drafts
        </h2>
        <p className="hidden text-[0.8125rem] text-muted lg:block">
          {drafts.length} draft{drafts.length === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="space-y-2.5">
        {drafts.map((draft) => {
          const { badge, detail, short } = describe(draft);
          const saved = `Saved ${formatInlineDate(draft.updatedAt, now)}`;
          return (
            <li
              key={draft.id}
              className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2.5 lg:gap-3 lg:p-3"
            >
              <Link
                href={routes.draft(draft.id)}
                aria-label={`Resume draft, ${saved.toLowerCase()}, ${badge.label}`}
                className="flex min-w-0 flex-1 items-center gap-3.5 rounded-xl lg:gap-4"
              >
                <Image
                  src={draft.imageUrl}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  className="size-12 shrink-0 rounded-lg bg-paper object-cover object-top lg:size-14"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-bold">{saved}</span>
                  <span className="mt-0.5 block truncate text-[0.8125rem] text-muted">
                    <span className="lg:hidden">{short}</span>
                    <span className="hidden lg:inline">{detail}</span>
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}
                >
                  <span className="lg:hidden">{badge.short}</span>
                  <span className="hidden lg:inline">{badge.label}</span>
                </span>
              </Link>
              <Link
                href={routes.draft(draft.id)}
                tabIndex={-1}
                aria-hidden="true"
                className="ml-2 hidden h-10 items-center rounded-full border border-line-strong px-4.5 text-[0.9375rem] font-bold transition hover:bg-surface-3 lg:flex"
              >
                Resume
              </Link>
              <DeleteDraftButton postId={draft.id} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
