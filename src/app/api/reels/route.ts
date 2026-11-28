import { listReelWords, ttsCharactersThisMonth } from "@/db/reels";
import { hasAccess } from "@/lib/access";
import { readScope } from "@/lib/reels/data";

/**
 * The words of a post (`?post=<id>`) or a TOTW (`?totw=<n>`), in reel order,
 * with whether each reel is ready (16.2, 16.3), and the TTS characters used
 * this month (16.3, "Prepare TOTW reels").
 */
export async function GET(request: Request) {
  // The proxy already returns 401 without the cookie; route handlers check again (3.2).
  if (!(await hasAccess())) {
    return Response.json({ error: "Access code required." }, { status: 401 });
  }
  const scope = readScope(new URL(request.url).searchParams);
  if (!scope) return Response.json({ error: "Invalid scope." }, { status: 400 });

  const [words, ttsCharacters] = await Promise.all([
    listReelWords(scope),
    ttsCharactersThisMonth(),
  ]);
  return Response.json({ words, ttsCharacters }, { headers: { "Cache-Control": "no-store" } });
}
