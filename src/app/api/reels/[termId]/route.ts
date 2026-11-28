import { isPostId } from "@/db/post-detail";
import { getReelWordData } from "@/db/reels";
import { hasAccess } from "@/lib/access";

/** One ready reel for the player (16.2): media, timings and texts. 404 while it isn't ready. */
export async function GET(_request: Request, { params }: RouteContext<"/api/reels/[termId]">) {
  if (!(await hasAccess())) {
    return Response.json({ error: "Access code required." }, { status: 401 });
  }
  const { termId } = await params;
  if (!isPostId(termId)) return Response.json({ error: "Invalid word." }, { status: 400 });

  const data = await getReelWordData(termId);
  if (!data) return Response.json({ error: "Not ready." }, { status: 404 });
  return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
