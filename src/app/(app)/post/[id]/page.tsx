import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { getPostDetail } from "@/db/post-detail";
import { getTotwOverview } from "@/db/totw";

import { PostDetailView, selectedWord } from "./post-detail-view";

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
 * Post detail (6.1–6.4, mockups 02-D / 02-M), from the database. Only
 * published posts have a detail page. The page itself is `PostDetailView`,
 * shared with the offline app (14.2).
 */
export default async function PostPage({ params, searchParams }: PageProps<"/post/[id]">) {
  const [{ id }, { w }] = await Promise.all([params, searchParams]);
  const [post, { current }] = await Promise.all([loadPost(id), getTotwOverview()]);
  if (!post) notFound();

  return (
    <PostDetailView
      post={post}
      currentTotw={current.number}
      selected={selectedWord(w, post.terms.length)}
    />
  );
}
