import { createHash } from "node:crypto";

import { connection } from "next/server";

import { getOfflineCopy } from "@/db/offline-copy";
import { hasAccess } from "@/lib/access";

/**
 * The offline copy (14.2): `OfflineCopy` as JSON, downloaded in the background
 * each time the app opens online, and saved on the device.
 *
 * - Without the access cookie: 401 (the proxy already answers it; checked
 *   again here, 3.2). The device then deletes any copy it holds.
 * - `If-None-Match` with the current ETag: 304, nothing to download. The ETag
 *   is a hash of the posts, so it changes with any publish, delete,
 *   translation or new examples.
 * - Never stored by the browser or a proxy (`private, no-store`): the device's
 *   copy lives in IndexedDB, under the app's control.
 */
export async function GET(request: Request) {
  await connection();
  if (!(await hasAccess())) {
    return Response.json({ error: "Access code required." }, { status: 401 });
  }

  const copy = await getOfflineCopy();
  const etag = `"${createHash("sha256").update(JSON.stringify(copy.posts)).digest("base64url")}"`;
  const headers = { "Cache-Control": "private, no-store", ETag: etag };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return Response.json(copy, { headers });
}
