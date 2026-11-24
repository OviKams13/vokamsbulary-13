"use client";

import { useRouter } from "next/navigation";
import { createContext, use } from "react";

/** The router methods the app's components use. */
export type AppRouter = {
  push: (href: string, options?: { scroll?: boolean }) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
  back: () => void;
};

/**
 * Set by the offline app (14.2): its pages are drawn on the device from the
 * copy, so moving between them must not ask the server (Next's router would
 * fetch the next page's data, which fails offline).
 */
export const OfflineRouterContext = createContext<AppRouter | null>(null);

/** Next's router on server pages; the offline app's own router inside the copy. */
export function useAppRouter(): AppRouter {
  const router = useRouter();
  return use(OfflineRouterContext) ?? router;
}
