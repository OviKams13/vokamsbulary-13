"use client";

import { type MouseEvent, type ReactNode, useRef } from "react";

import { MenuIcon } from "@/components/icons";

/**
 * Hamburger button + left drawer of the mobile layout (4.2, mockup 01-drawer).
 *
 * A native modal <dialog>: it traps focus, closes on Escape and makes the page
 * behind it inert. It also closes on a backdrop tap and when a link inside it
 * is followed. The close button inside is a `<form method="dialog">`.
 */
export function MobileDrawer({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const target = event.target as Element;
    // The dialog box itself is only hit outside its content: the backdrop.
    if (target === event.currentTarget || target.closest("a")) event.currentTarget.close();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className="-ml-1.5 grid size-10 place-items-center rounded-lg text-fg"
      >
        <MenuIcon size={22} />
      </button>

      <dialog
        ref={dialog}
        aria-label="Menu"
        onClick={handleClick}
        className="drawer fixed inset-y-0 right-auto left-0 m-0 h-dvh max-h-none w-[19.875rem] max-w-[85vw] border-r border-line bg-surface p-0 text-fg backdrop:bg-black/65"
      >
        {children}
      </dialog>
    </>
  );
}
