import { z } from "zod";

import { prepareReel } from "@/ai/prepare-reel";
import { isPostId } from "@/db/post-detail";
import { hasAccess } from "@/lib/access";
import { isSameOrigin } from "@/lib/same-origin";

// One word: its missing French texts, one Claude call (up to 240 s) and the voice.
export const maxDuration = 300;

const BodySchema = z.object({ termId: z.string().refine(isPostId, "Not an id.") });

/**
 * Prepares the reel of one word (16.1): `{ termId }` in, `{ status }` out
 * ("ready", "pending" = call again, "busy", "failed" with `error`, "missing").
 * Called word by word by the browser in the background, by "Prepare TOTW
 * reels" and by the player for a reel that isn't ready yet (16.3).
 */
export async function POST(request: Request) {
  const startedAt = performance.now();
  // The proxy already returns 401 without the cookie; route handlers check again (3.2).
  if (!(await hasAccess())) {
    return Response.json({ error: "Access code required." }, { status: 401 });
  }
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid word." }, { status: 400 });

  const result = await prepareReel(parsed.data.termId, startedAt);
  return Response.json(result, {
    status: result.status === "missing" ? 404 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
