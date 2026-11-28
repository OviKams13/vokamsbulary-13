import Link from "next/link";

import { ArrowLeftIcon } from "@/components/icons";
import { PostReview } from "@/components/review/post-review";
import { ThemedPost } from "@/components/themed-post";
import type { CopyTerm } from "@/lib/offline/copy";
import type { ReviewColor } from "@/lib/review";
import { routes } from "@/lib/routes";
import { capitalize } from "@/lib/text";

import { ExplanationPanel } from "./explanation-panel";
import { PostMenu } from "./post-menu";
import { PostReelButton } from "./post-reel-button";
import { FrenchPostText, PostTranslationProvider } from "./post-translation";
import { WordTabs } from "./word-tabs";

/** What the detail page shows: `getPostDetail()` or a post of the offline copy. */
export type PostDetailData = {
  id: string;
  text: string;
  textFr: string | null;
  themeKey: string;
  totwNumber: number;
  position: number;
  /** Review colour (15.2); absent in a copy saved before Phase 15. */
  reviewColor?: ReviewColor | null;
  reviewChangedAt?: number | null;
  terms: CopyTerm[];
};

/**
 * Post detail (6.1–6.4, mockups 02-D / 02-M): back link, the themed post,
 * one tab per word, the selected word's explanation with its Translate
 * toggle (8.2) and examples (13.3), and the ⋯ menu with "Delete post".
 * Rendered by the page from the database, and by the offline app (14.2)
 * from the copy on the device.
 */
export function PostDetailView({
  post,
  currentTotw,
  selected,
}: {
  post: PostDetailData;
  /** Number of the current TOTW: its back link is `/`. */
  currentTotw: number;
  /** Word tab on screen first (1-based). */
  selected: number;
}) {
  const back = post.totwNumber === currentTotw ? routes.home : routes.totw(post.totwNumber);
  const label = `TOTW ${post.totwNumber} · #${post.position}`;
  const menu = <PostMenu postId={post.id} label={label} wordCount={post.terms.length} />;

  return (
    // The provider holds the word tab on screen: the ▶ starts the reels there (16.3).
    <PostTranslationProvider initialTextFr={post.textFr} initialSelected={selected}>
      {/* Mobile header (02-M), in place of the feed's top bar. */}
      <header className="sticky top-0 z-30 flex h-15 items-center gap-2 border-b border-line bg-bg/95 px-4 backdrop-blur lg:hidden">
        <Link
          href={back}
          aria-label={`Back to TOTW ${post.totwNumber}`}
          className="-ml-1.5 grid size-10 place-items-center rounded-lg"
        >
          <ArrowLeftIcon size={22} />
        </Link>
        <h1 className="text-[1.0625rem] font-bold">Post</h1>
        <div className="mx-auto">
          <PostReelButton postId={post.id} />
        </div>
        <p className="font-display text-[0.9375rem] font-extrabold tracking-wide text-fg-soft">
          {label}
        </p>
        <div className="-mr-2">{menu}</div>
      </header>

      <main className="mx-auto w-full max-w-180 px-4 pt-4 pb-16 lg:px-0 lg:pt-8">
        <div className="mb-5 hidden items-center justify-between lg:flex">
          <Link
            href={back}
            className="-ml-1 flex items-center gap-2 rounded-lg px-1 py-1 text-[0.9375rem] font-semibold text-fg-soft transition hover:text-fg"
          >
            <ArrowLeftIcon size={18} />
            Back to TOTW {post.totwNumber}
          </Link>
          <h1 className="sr-only">{label}</h1>
          <PostReelButton postId={post.id} />
          {menu}
        </div>

        <ThemedPost
          text={post.text}
          themeKey={post.themeKey}
          totwNumber={post.totwNumber}
          position={post.position}
          surfaces={post.terms.map((term) => term.surface)}
          translation={<FrenchPostText />}
          // Review colour on the card (15.3): set it right after reading.
          review={<PostReview post={post} />}
        />

        {post.terms.length > 0 ? (
          <div className="mt-5 sm:mt-6">
            <WordTabs
              key={post.id}
              labels={post.terms.map((term) => capitalize(term.headword))}
              panels={post.terms.map((term) => (
                <ExplanationPanel
                  key={term.position}
                  termId={term.id}
                  position={term.position}
                  headword={term.headword}
                  surface={term.surface}
                  english={term.explanation}
                  french={term.french}
                  examples={term.examples}
                  examplesFr={term.examplesFr}
                />
              ))}
              initial={selected}
            />
          </div>
        ) : null}
      </main>
    </PostTranslationProvider>
  );
}

/** `?w=n` → 1 … count; anything else selects the first word. */
export function selectedWord(value: string | string[] | null | undefined, count: number): number {
  const word = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 1;
  return word >= 1 && word <= count ? word : 1;
}
