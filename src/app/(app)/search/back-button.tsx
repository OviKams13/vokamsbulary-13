"use client";

import { useRouter } from "next/navigation";

import { ArrowLeftIcon } from "@/components/icons";
import { routes } from "@/lib/routes";

/**
 * Back arrow of the mobile search header (05-M): back to the page you came
 * from (feed, post), or the home page when search was opened directly.
 */
export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(routes.home))}
      className="-ml-1.5 grid size-10 shrink-0 place-items-center rounded-lg"
    >
      <ArrowLeftIcon size={22} />
    </button>
  );
}
