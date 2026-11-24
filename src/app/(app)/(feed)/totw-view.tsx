import { TotwFeed } from "@/components/totw-feed";
import { getTotwFeed } from "@/db/feed";
import type { TotwSummary } from "@/lib/totw";

/**
 * Feed of one TOTW (5.3), used by `/` (current TOTW) and `/totw/[n]`:
 * header, then the posts newest first. An empty TOTW shows the empty state (4.4).
 */
export async function TotwView({ totw }: { totw: TotwSummary }) {
  const feed = totw.count === 0 ? [] : await getTotwFeed(totw.number);
  // One "now" for the whole page, so every card's date is measured the same way.
  return <TotwFeed totw={totw} feed={feed} now={new Date()} />;
}
