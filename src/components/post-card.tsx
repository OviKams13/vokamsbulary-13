import Link from "next/link";

import { PostTag } from "@/components/post-tag";
import { TermChip } from "@/components/term-chip";
import { ThemePill } from "@/components/theme-pill";
import type { FeedPost } from "@/db/feed";
import { highlightTerms } from "@/lib/highlight";
import { formatFullDate, formatPostDate } from "@/lib/relative-date";
import { routes } from "@/lib/routes";
import { getTheme } from "@/themes";
import { ThemePattern } from "@/themes/theme-pattern";

/**
 * One post in the feed (5.2, mockups 01-D / 01-M): themed card with the
 * TOTW/#position ribbon and the theme pill, the text with every term
 * highlighted (E-06), then the word chips and the publication date.
 * The card opens the post detail page.
 */
export function PostCard({ post, now }: { post: FeedPost; now: Date }) {
  const theme = getTheme(post.themeKey);
  const segments = highlightTerms(
    post.text,
    post.terms.map((term) => term.surface),
  );
  const headwords = [...new Set(post.terms.map((term) => term.headword))];
  const date = formatPostDate(post.publishedAt, now);

  return (
    <article>
      <Link
        href={routes.post(post.id)}
        aria-label={`TOTW ${post.totwNumber} · post ${post.position}: open the explanations`}
        className="relative block overflow-hidden rounded-[1.375rem] px-3.5 pt-3.5 pb-3.5 transition hover:brightness-[1.04] sm:rounded-card sm:px-4.5 sm:pt-4.5 sm:pb-4"
        style={{
          backgroundColor: theme.background,
          boxShadow: theme.border ? `inset 0 0 0 1px ${theme.border}` : undefined,
        }}
      >
        <ThemePattern themeKey={theme.key} />

        <div className="relative flex items-center justify-between gap-3">
          <PostTag totwNumber={post.totwNumber} position={post.position} />
          <ThemePill themeKey={theme.key} />
        </div>

        <p
          className="relative mt-3.5 rounded-[0.875rem] px-4 py-3.5 text-base leading-[1.7] text-ink sm:mt-4 sm:rounded-paper sm:px-5.5 sm:py-4.5 sm:text-lg sm:leading-[1.72]"
          style={{ backgroundColor: theme.paper }}
        >
          {segments.map((segment, index) =>
            segment.marked ? (
              <mark key={index} className="marker">
                {segment.text}
              </mark>
            ) : (
              segment.text
            ),
          )}
        </p>
      </Link>

      <div className="mt-3 flex items-start gap-3 px-0.5 sm:mt-3.5 sm:px-1">
        <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
          {headwords.map((headword) => (
            <li key={headword}>
              <TermChip>{headword}</TermChip>
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
