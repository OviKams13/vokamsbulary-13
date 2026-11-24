"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useConnection, useNetworkAction } from "./connection";

/**
 * A link to a page that needs the server (New post, 14.3). Offline, or in the
 * offline copy, it becomes a dimmed button that shows a short message instead
 * of opening a page that can't load.
 */
export function NetworkLink({
  href,
  action,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  href: string;
  /** "New post": the message reads "New post needs a connection." */
  action: string;
  className: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const { available, reason } = useNetworkAction(action);
  const { notify } = useConnection();

  if (available) {
    return (
      <Link href={href} aria-label={ariaLabel} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-disabled="true"
      title={reason ?? undefined}
      onClick={(event) => {
        // In the drawer: close it, or the message would sit behind it.
        event.currentTarget.closest("dialog")?.close();
        if (reason) notify(reason);
      }}
      className={`${className} cursor-not-allowed opacity-45`}
    >
      {children}
    </button>
  );
}
