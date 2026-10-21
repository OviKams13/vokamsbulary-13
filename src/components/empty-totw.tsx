import Link from "next/link";
import type { ReactNode } from "react";

import { UploadIcon } from "@/components/icons";
import { routes } from "@/lib/routes";
import { TOTW_SIZE } from "@/lib/totw";

/**
 * Empty TOTW state (4.4, mockup 06a): 15 spots (the first one is "+"), a title,
 * an upload button, and 3 steps on desktop. Shown on first launch and for any
 * new TOTW at 0/15.
 */
export function EmptyTotw({ number }: { number: number }) {
  const first = number === 1;

  return (
    <main className="mx-auto flex w-full max-w-160 flex-col items-center px-6 pt-12 pb-28 text-center lg:min-h-dvh lg:justify-center lg:py-12">
      <p className="mb-4 font-display text-[0.9375rem] font-extrabold tracking-[0.12em] text-gold lg:hidden">
        TOTW {number} · 0/{TOTW_SIZE}
      </p>

      <ol
        aria-label={`TOTW ${number}: ${TOTW_SIZE} empty spots`}
        className="grid grid-cols-5 gap-2.5 lg:gap-x-3 lg:gap-y-3.5"
      >
        {Array.from({ length: TOTW_SIZE }, (_, index) =>
          index === 0 ? (
            <li key={index}>
              <Link
                href={routes.newPost}
                aria-label="Upload a screenshot into spot 1"
                className="grid h-15 w-12.5 place-items-center rounded-xl border-[1.5px] border-dashed border-gold bg-gold/6 font-display text-base font-extrabold text-gold transition hover:bg-gold/12 lg:h-21 lg:w-17.5 lg:rounded-2xl"
              >
                +
              </Link>
            </li>
          ) : (
            <li
              key={index}
              className="grid h-15 w-12.5 place-items-center rounded-xl border border-dashed border-line-strong font-display text-[0.9375rem] font-bold text-[#4b4b52] lg:h-21 lg:w-17.5 lg:rounded-2xl lg:text-xl"
            >
              {index + 1}
            </li>
          ),
        )}
      </ol>

      <h1 className="mt-8 text-[1.6rem] leading-tight font-extrabold tracking-tight lg:mt-11 lg:text-[2.125rem]">
        {first ? "Your first team starts here" : `TOTW ${number} starts here`}
      </h1>

      <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-soft lg:hidden">
        <RedUnderline>Underline</RedUnderline> the words you don&apos;t know in red, take a
        screenshot, and drop it in. Each one fills a spot.
      </p>
      <p className="mt-3 hidden max-w-152 text-[1.0625rem] leading-relaxed text-fg-soft lg:block">
        TOTW {number} has {TOTW_SIZE} empty spots. Every screenshot you upload becomes a post and
        takes one of them.
      </p>

      <Link
        href={routes.newPost}
        className="mt-7 flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-fg px-8 font-semibold text-bg transition hover:bg-white lg:mt-8 lg:w-auto"
      >
        <UploadIcon size={19} className="hidden lg:block" />
        {first ? "Upload your first screenshot" : "Upload a screenshot"}
      </Link>

      <ol className="mt-8 hidden w-160 grid-cols-3 gap-3 text-left lg:grid">
        <Step number={1}>
          <RedUnderline>Underline</RedUnderline> the words you don&apos;t know in red
        </Step>
        <Step number={2}>Screenshot the text and upload it here</Step>
        <Step number={3}>Open the post to read each explanation</Step>
      </ol>
    </main>
  );
}

function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <li className="min-h-26.5 rounded-2xl border border-line bg-surface px-4 py-4">
      <span className="font-display text-2xl leading-none font-extrabold text-gold">{number}</span>
      <p className="mt-2.5 text-sm leading-snug text-fg-soft">{children}</p>
    </li>
  );
}

function RedUnderline({ children }: { children: ReactNode }) {
  return (
    <span className="underline decoration-[#e5484d] decoration-2 underline-offset-4">
      {children}
    </span>
  );
}
