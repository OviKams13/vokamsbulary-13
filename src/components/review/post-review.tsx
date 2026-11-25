import { getTheme } from "@/themes";
import type { ReviewColor } from "@/lib/review";

import { ReviewCircle } from "./review-circle";

/**
 * The review colour chip of a post card (15.3), right after the "TOTW n | #m"
 * ribbon: the same circle and choices as the quick list (15.2), in a chip of
 * the theme pill's colour. Above the feed card's link layer (`z-[2]`), so a
 * tap on it never opens the post.
 */
export function PostReview({
  post,
}: {
  post: {
    id: string;
    themeKey: string;
    totwNumber: number;
    position: number;
    reviewColor?: ReviewColor | null;
    reviewChangedAt?: number | null;
  };
}) {
  return (
    <ReviewCircle
      postId={post.id}
      color={post.reviewColor ?? null}
      changedAt={post.reviewChangedAt ?? null}
      label={`TOTW ${post.totwNumber} · #${post.position}`}
      chip={getTheme(post.themeKey).pill.background}
      className="relative z-[2]"
    />
  );
}
