import { EmptyTotw } from "@/components/empty-totw";
import { PostCard } from "@/components/post-card";
import { TotwHeader } from "@/components/totw-header";
import { getTotwFeed } from "@/db/feed";
import type { TotwSummary } from "@/lib/totw";

/**
 * Feed of one TOTW (5.3), used by `/` (current TOTW) and `/totw/[n]`:
 * header, then the posts newest first. An empty TOTW shows the empty state (4.4).
 */
export async function TotwView({ totw }: { totw: TotwSummary }) {
  if (totw.count === 0) return <EmptyTotw number={totw.number} />;

  const feed = await getTotwFeed(totw.number);
  // One "now" for the whole page, so every card's date is measured the same way.
  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-feed px-4 pt-4 pb-28 lg:px-0 lg:pb-14">
      <TotwHeader number={totw.number} count={totw.count} current={totw.current} />
      <ol className="mt-8 space-y-6 sm:mt-7 sm:space-y-7">
        {feed.map((post) => (
          <li key={post.id}>
            <PostCard post={post} now={now} />
          </li>
        ))}
      </ol>
    </main>
  );
}
