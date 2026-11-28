"use client";

import { ReelButton } from "@/components/reels/reel-button";

import { usePostTranslation } from "./post-translation";

/** The post page's ▶ (16.3): this post's reels, from the word whose tab is open. */
export function PostReelButton({ postId }: { postId: string }) {
  const selected = usePostTranslation()?.selected ?? 1;
  return <ReelButton scope={{ kind: "post", postId }} variant="post" startWord={selected} />;
}
