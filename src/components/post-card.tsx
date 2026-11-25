import Link from "next/link";

import { PostReview } from "@/components/review/post-review";
import { TermChip } from "@/components/term-chip";
import { ThemedPost } from "@/components/themed-post";
import type { FeedPost } from "@/db/feed";
import { formatFullDate, formatPostDate } from "@/lib/relative-date";
import { routes } from "@/lib/routes";

/**
 * One post in the feed (5.2, mockups 01-D / 01-M): the themed post, then the
 * word chips and the publication date. The card opens the post detail page;
 * a chip searches for its word (10.2).
 *
 * The review colour chip (15.3) sits on the card but must not open the post,
 * and a button can't go inside a link: the link is a transparent layer over
 * the whole card, and the chip sits above that layer.
 */
export function PostCard({ post, now }: { post: FeedPost; now: Date }) {
  const headwords = [...new Set(post.terms.map((term) => term.headword))];
  const date = formatPostDate(post.publishedAt, now);

  return (
    <article>
      <div className="relative rounded-[1.375rem] transition has-[>a:hover]:brightness-[1.04] sm:rounded-card">
        <ThemedPost
          text={post.text}
          themeKey={post.themeKey}
          totwNumber={post.totwNumber}
          position={post.position}
          surfaces={post.terms.map((term) => term.surface)}
          review={<PostReview post={post} />}
        />
        <Link
          href={routes.post(post.id)}
          aria-label={`TOTW ${post.totwNumber} · post ${post.position}: open the explanations`}
          className="absolute inset-0 z-[1] rounded-[1.375rem] sm:rounded-card"
        />
      </div>

      <div className="mt-3 flex items-start gap-3 px-0.5 sm:mt-3.5 sm:px-1">
        <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
          {headwords.map((headword) => (
            <li key={headword}>
              <TermChip headword={headword} />
            </li>
          ))}
        </ul>
        <time
          dateTime={post.publishedAt.toISOString()}
          title={formatFullDate(post.publishedAt)}
          className="shrink-0 pt-1.5 text-[0.8125rem] text-muted"
        >
          <span className="sm:hidden">{date.short}</span>
          <span className="hidden sm:inline">{date.long}</span>
        </time>
      </div>
    </article>
  );
}
