import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Access code (F1, D-05, feasibility §9.1).
 *
 * A correct code sets a signed cookie that is valid for about a year. The
 * cookie holds no secret: only its issue time and an HMAC-SHA256 signature over
 * that time and the current access code, keyed with ACCESS_COOKIE_SECRET.
 * Changing either ACCESS_CODE or ACCESS_COOKIE_SECRET in Vercel therefore
 * signs every device out.
 */
export const ACCESS_COOKIE = "vk13_access";
export const ACCESS_PATH = "/access";

const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
const TOKEN_VERSION = "v1";

function sign(issuedAt: number): string {
  return createHmac("sha256", env.ACCESS_COOKIE_SECRET)
    .update(`${TOKEN_VERSION}:${issuedAt}:${env.ACCESS_CODE}`)
    .digest("base64url");
}

/** True when `a` and `b` are equal, in a time that doesn't depend on where they differ. */
function safeEqual(a: string, b: string): boolean {
  // Hashing first gives both sides the same length, whatever was typed.
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function isCorrectCode(code: string): boolean {
  return safeEqual(code, env.ACCESS_CODE);
}

/** Cookie value: `v1.<issued at, unix seconds>.<signature>`. */
export function createAccessToken(now = Date.now()): string {
  const issuedAt = Math.floor(now / 1000);
  return `${TOKEN_VERSION}.${issuedAt}.${sign(issuedAt)}`;
}

export function isValidAccessToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [version, issuedAtText, signature, ...rest] = token.split(".");
  if (version !== TOKEN_VERSION || !issuedAtText || !signature || rest.length > 0) return false;
  if (!/^\d{1,12}$/.test(issuedAtText)) return false;

  const issuedAt = Number(issuedAtText);
  const age = Math.floor(now / 1000) - issuedAt;
  // A small negative age tolerates clock differences between servers.
  if (age < -300 || age > MAX_AGE_SECONDS) return false;

  return safeEqual(signature, sign(issuedAt));
}

export const accessCookieOptions = {
  httpOnly: true,
  // Vercel (Production and Preview) runs with NODE_ENV=production, so the
  // cookie is always `secure` there. Locally it also works over plain http,
  // e.g. when testing from a phone on the LAN.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
} as const;

/**
 * Check for Server Functions and route handlers. The proxy already blocks
 * requests without a valid cookie, but Next.js recommends checking again
 * inside every Server Function, so a matcher change can't silently open one.
 */
export async function hasAccess(): Promise<boolean> {
  const store = await cookies();
  return isValidAccessToken(store.get(ACCESS_COOKIE)?.value);
}

/**
 * Where to go after a correct code: the page the visitor first asked for,
 * if it is a path on this site; otherwise the home page.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  // Only same-site paths: "/x" but not "//evil.com" or "/\evil.com".
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next === ACCESS_PATH || next.startsWith(`${ACCESS_PATH}?`)) return "/";
  return next;
}
