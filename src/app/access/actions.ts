"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  ACCESS_COOKIE,
  accessCookieOptions,
  createAccessToken,
  isCorrectCode,
  safeNextPath,
} from "@/lib/access";
import { clearFailures, delayWrongCode } from "@/lib/access-throttle";

export type AccessState = { error: string | null };

/** Checks the typed code against ACCESS_CODE and, if it matches, sets the access cookie. */
export async function submitAccessCode(
  _previous: AccessState,
  formData: FormData,
): Promise<AccessState> {
  const raw = formData.get("code");
  // Trimmed: phone keyboards and password managers sometimes add a space.
  const code = typeof raw === "string" ? raw.trim() : "";
  if (!code) return { error: "Enter the access code." };

  const ip = clientIp(await headers());

  if (!isCorrectCode(code)) {
    await delayWrongCode(ip);
    return { error: "Wrong code. Try again." };
  }

  clearFailures(ip);
  const store = await cookies();
  store.set(ACCESS_COOKIE, createAccessToken(), accessCookieOptions);
  redirect(safeNextPath(formData.get("next")));
}

function clientIp(requestHeaders: Headers): string {
  // On Vercel the first x-forwarded-for entry is the visitor's address.
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip") || "unknown";
}
