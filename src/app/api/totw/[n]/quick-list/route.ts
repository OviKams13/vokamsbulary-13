import { getQuickList } from "@/db/quick-list";
import { hasAccess } from "@/lib/access";
import { parseTotwNumber } from "@/lib/totw";

/**
 * Quick list of one TOTW (9.1): `{ items: [{ position, postId, headwords }] }`,
 * read when the popover (9.2) or the bottom sheet (9.3) opens. Never cached:
 * a publish or a delete moves posts between positions.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/totw/[n]/quick-list">) {
  // The proxy already returns 401 without the cookie; route handlers check again (3.2).
  if (!(await hasAccess())) {
    return Response.json({ error: "Access code required." }, { status: 401 });
  }

  const { n } = await params;
  const number = parseTotwNumber(n);
  if (number === null) return Response.json({ error: "Not found." }, { status: 404 });

  const items = await getQuickList(number);
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
