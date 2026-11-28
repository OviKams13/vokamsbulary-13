import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ConnectionProvider } from "@/components/offline/connection";
import { listReelWords } from "@/db/reels";
import { getTotwOverview } from "@/db/totw";
import { readScope } from "@/lib/reels/data";
import { routes } from "@/lib/routes";

import { ReelPlayer } from "./reel-player";

export const metadata: Metadata = { title: "Reels · Vokamsbulary 13" };

/**
 * The reel player (16.2), full screen, outside the app shell:
 * `/reels?post=<id>&w=<k>` plays the reels of one post from its word k;
 * `/reels?totw=<n>` plays every word of a TOTW from its first word.
 */
export default async function ReelsPage({ searchParams }: PageProps<"/reels">) {
  const params = await searchParams;
  const get = (name: string) => {
    const value = params[name];
    return typeof value === "string" ? value : null;
  };
  const scope = readScope({ get });
  if (!scope) notFound();

  const [words, { current }] = await Promise.all([listReelWords(scope), getTotwOverview()]);
  if (words.length === 0) notFound();

  const w = Number(get("w"));
  const startIndex =
    scope.kind === "post" && Number.isInteger(w) && w >= 1 && w <= words.length ? w - 1 : 0;
  const first = words[0]!;
  const closeHref =
    scope.kind === "post"
      ? routes.post(scope.postId, startIndex + 1)
      : first.totwNumber === current.number
        ? routes.home
        : routes.totw(first.totwNumber);

  return (
    <ConnectionProvider>
      <ReelPlayer
        scope={scope}
        initialWords={words}
        startIndex={startIndex}
        closeHref={closeHref}
      />
    </ConnectionProvider>
  );
}
