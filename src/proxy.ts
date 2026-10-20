import { type NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE, ACCESS_PATH, isValidAccessToken, safeNextPath } from "@/lib/access";

/**
 * Access gate (3.2): every page and route needs a valid access cookie, except
 * the access page itself and the static / PWA files excluded by the matcher.
 *
 * - page without a cookie → redirect to /access?next=<the page>
 * - anything else without a cookie (API route, POST) → 401
 * - /access with a valid cookie → redirect to where the visitor was going
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasAccess = isValidAccessToken(request.cookies.get(ACCESS_COOKIE)?.value);

  if (pathname === ACCESS_PATH) {
    if (hasAccess && request.method === "GET") {
      const next = safeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(next, request.url));
    }
    // The access page, and the Server Action it posts to, stay open.
    return NextResponse.next();
  }

  if (hasAccess) return NextResponse.next();

  const isPage = request.method === "GET" && !pathname.startsWith("/api/") && pathname !== "/api";
  if (!isPage) {
    return NextResponse.json({ error: "Access code required." }, { status: 401 });
  }

  const url = new URL(ACCESS_PATH, request.url);
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Everything except:
     * - _next/static, _next/image: build assets and optimized images
     * - favicon.ico, apple-icon.png, icons/: app icons (F15)
     * - manifest.webmanifest, robots.txt, sitemap.xml: metadata files
     */
    "/((?!_next/static|_next/image|favicon\\.ico|apple-icon\\.png|icons/|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml).*)",
  ],
};
