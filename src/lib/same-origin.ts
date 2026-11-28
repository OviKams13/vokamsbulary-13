/**
 * True when a POST comes from the app's own pages. The access cookie is
 * SameSite=Lax, so another site can't send it anyway; routes check this too.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-origin fetches may omit it; the cookie rule still applies.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
