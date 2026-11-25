import { z } from "zod";

import { isPostId } from "@/db/post-detail";
import { saveReviewChange } from "@/db/review";
import { hasAccess } from "@/lib/access";
import { REVIEW_COLORS, type ReviewChange } from "@/lib/review";

/** Changes per request: the device sends its whole queue at once. */
const MAX_CHANGES = 200;
/** Units per definition: far more than any definition has words. */
const MAX_MARKS = 2000;
/** 2020-01-01: older times are a broken clock, not a real change. */
const OLDEST = Date.UTC(2020, 0, 1);

const id = z.string().refine(isPostId, "Not an id.");
const changedAt = z.number().int().min(OLDEST);

const ChangesSchema = z.object({
  changes: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({
          kind: z.literal("color"),
          postId: id,
          color: z.enum(REVIEW_COLORS).nullable(),
          changedAt,
        }),
        z.object({
          kind: z.literal("marks"),
          termId: id,
          language: z.enum(["en", "fr"]),
          marks: z.array(z.number().int().min(0).max(32_767)).max(MAX_MARKS),
          changedAt,
        }),
      ]),
    )
    .min(1)
    .max(MAX_CHANGES),
});

/**
 * Personal review tools (Phase 15): saves review colours (15.2) and definition
 * highlights (15.1). The device sends `{ changes: ReviewChange[] }`, right away
 * when online, or later from its queue when the change was made offline. The
 * answer lists what the database holds afterwards for each change
 * (`ReviewResult`), so the device shows the change that won.
 *
 * A route rather than a Server Action: its address never changes, so the
 * offline app of an older deployment can still send its queue.
 */
export async function POST(request: Request) {
  // The proxy already returns 401 without the cookie; route handlers check again (3.2).
  if (!(await hasAccess())) {
    return Response.json({ error: "Access code required." }, { status: 401 });
  }
  // The access cookie is SameSite=Lax, so another site can't send it here; checked anyway.
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = ChangesSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid changes." }, { status: 400 });

  try {
    const results = await Promise.all(
      parsed.data.changes.map((change) => saveReviewChange(change as ReviewChange)),
    );
    return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Review save failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Couldn't save." }, { status: 500 });
  }
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-origin fetches may omit it; the cookie rule still applies.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
