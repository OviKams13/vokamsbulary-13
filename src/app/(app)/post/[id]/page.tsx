import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { Explanation } from "@/components/explanation";
import { ArrowLeftIcon } from "@/components/icons";
import { ThemedPost } from "@/components/themed-post";
import { getPostDetail } from "@/db/post-detail";
import { getTotwOverview } from "@/db/totw";
import { routes } from "@/lib/routes";
import { capitalize } from "@/lib/text";

import { PostMenu } from "./post-menu";
import { WordTabs } from "./word-tabs";

// Shared by generateMetadata and the page: one database round trip.
const loadPost = cache(getPostDetail);

export async function generateMetadata({ params }: PageProps<"/post/[id]">): Promise<Metadata> {
  const post = await loadPost((await params).id);
  return {
    title: post
      ? `TOTW ${post.totwNumber} · #${post.position} · Vokamsbulary 13`
      : "Vokamsbulary 13",
  };
}

/**
 * Post detail (6.1–6.4, mockups 02-D / 02-M): back link, the themed post,
 * one tab per word, the selected word's explanation, and the ⋯ menu with
 * "Delete post". Only published posts have a detail page.
 */
export default async function PostPage({ params, searchParams }: PageProps<"/post/[id]">) {
  const [{ id }, { w }] = await Promise.all([params, searchParams]);
  const [post, { current }] = await Promise.all([loadPost(id), getTotwOverview()]);
  if (!post) notFound();

  const back = post.totwNumber === current.number ? routes.home : routes.totw(post.totwNumber);
  const label = `TOTW ${post.totwNumber} · #${post.position}`;
  const menu = <PostMenu postId={post.id} label={label} wordCount={post.terms.length} />;

  return (
    <>
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
        <p className="ml-auto font-display text-[0.9375rem] font-extrabold tracking-wide text-fg-soft">
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
          {menu}
        </div>

        <ThemedPost
          text={post.text}
          themeKey={post.themeKey}
          totwNumber={post.totwNumber}
          position={post.position}
          surfaces={post.terms.map((term) => term.surface)}
        />

        {post.terms.length > 0 ? (
          <div className="mt-5 sm:mt-6">
            <WordTabs
              key={post.id}
              labels={post.terms.map((term) => capitalize(term.headword))}
              panels={post.terms.map((term) => (
                <Explanation key={term.position} term={term} />
              ))}
              initial={selectedWord(w, post.terms.length)}
            />
          </div>
        ) : null}
      </main>
    </>
  );
}

/** `?w=n` → 1 … count; anything else selects the first word. */
function selectedWord(value: string | string[] | undefined, count: number): number {
  const word = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 1;
  return word >= 1 && word <= count ? word : 1;
}
