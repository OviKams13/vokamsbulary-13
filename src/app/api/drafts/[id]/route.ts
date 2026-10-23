import { getDraftStatus } from "@/db/drafts";
import { isPostId } from "@/db/post-detail";
import { hasAccess } from "@/lib/access";

/**
 * Status of a draft, polled by the processing screen (7.4):
 * `{ status, lastError }`. Never cached.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/drafts/[id]">) {
  // The proxy already returns 401 without the cookie; route handlers check again (3.2).
  if (!(await hasAccess())) {
    return Response.json({ error: "Access code required." }, { status: 401 });
  }

  const { id } = await params;
  const draft = isPostId(id) ? await getDraftStatus(id) : null;
  if (!draft) return Response.json({ error: "Not found." }, { status: 404 });

  return Response.json(draft, { headers: { "Cache-Control": "no-store" } });
}
