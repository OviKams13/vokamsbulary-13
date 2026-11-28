import { listPendingReels } from "@/db/reels";
import { hasAccess } from "@/lib/access";

/** Words of new posts whose reel is still waiting (16.3): the browser's background run. */
export async function GET() {
  if (!(await hasAccess())) {
    return Response.json({ error: "Access code required." }, { status: 401 });
  }
  const words = await listPendingReels();
  return Response.json({ words }, { headers: { "Cache-Control": "no-store" } });
}
