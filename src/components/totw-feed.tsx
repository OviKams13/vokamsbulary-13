import { EmptyTotw } from "@/components/empty-totw";
import { PostCard } from "@/components/post-card";
import { TotwHeader } from "@/components/totw-header";
import type { FeedPost } from "@/db/feed";
import type { TotwSummary } from "@/lib/totw";

/**
 * Feed of one TOTW (5.3): header, then the posts newest first; an empty TOTW
 * shows the empty state (4.4). Rendered from the database (`TotwView`) or
 * from the offline copy (14.2).
 */
export function TotwFeed({ totw, feed, now }: { totw: TotwSummary; feed: FeedPost[]; now: Date }) {
  if (totw.count === 0) return <EmptyTotw number={totw.number} />;

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
