import Link from "next/link";

import { CheckIcon, CloseIcon } from "@/components/icons";
import type { NextSlot } from "@/db/drafts";
import { routes } from "@/lib/routes";

const STEPS = ["Upload", "Read", "Verify"] as const;
export type NewPostStep = 1 | 2 | 3;

/**
 * Mobile bar of the New post flow (mockups 03a-M / 03b-M): ✕, "New post" and
 * "TOTW n · #m", in place of the feed's top bar. Hidden on desktop.
 * The title follows the step ("Check what we found" on Verify, 03c-M).
 */
export function NewPostBar({ slot, title = "New post" }: { slot: NextSlot; title?: string }) {
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur lg:hidden">
      <div className="flex h-15 items-center gap-2 px-4">
        <Link
          href={routes.home}
          aria-label="Close"
          className="-ml-1.5 grid size-10 place-items-center rounded-lg"
        >
          <CloseIcon size={22} />
        </Link>
        <h1 className="text-[1.0625rem] font-bold">{title}</h1>
        <p className="ml-auto font-display text-[0.9375rem] font-extrabold tracking-wide text-gold">
          {slotLabel(slot)}
        </p>
      </div>
    </div>
  );
}

/**
 * Step header, at the top of the page column (mockups 03a / 03b).
 * Mobile: a 3-segment progress line and "Step x of 3 · Label".
 * Desktop: "Next up · TOTW n · #m", "New post" and the 3 step pills.
 */
export function NewPostSteps({
  step,
  slot,
  title = "New post",
}: {
  step: NewPostStep;
  slot: NextSlot;
  title?: string;
}) {
  return (
    <>
      <div className="lg:hidden">
        <ol className="flex gap-1.5" aria-label={`Step ${step} of 3: ${STEPS[step - 1]}`}>
          {STEPS.map((name, index) => (
            <li
              key={name}
              className={`h-1 flex-1 rounded-full ${
                index + 1 < step ? "bg-[#3f8f5a]" : index + 1 === step ? "bg-fg" : "bg-line-strong"
              }`}
            />
          ))}
        </ol>
        <p className="mt-2.5 text-[0.8125rem] text-muted">
          Step {step} of 3 · {STEPS[step - 1]}
        </p>
      </div>

      {/* Desktop */}
      <div className="hidden items-end justify-between gap-6 lg:flex">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
            Next up · {slotLabel(slot)}
          </p>
          <h1 className="mt-2 text-[2.125rem] leading-none font-extrabold tracking-tight">
            {title}
          </h1>
        </div>
        <ol className="flex gap-1.5" aria-label="Steps">
          {STEPS.map((name, index) => {
            const number = index + 1;
            const state = number < step ? "done" : number === step ? "current" : "todo";
            return (
              <li
                key={name}
                aria-current={state === "current" ? "step" : undefined}
                className={`flex h-8 items-center gap-2 rounded-full border pr-3.5 pl-1.5 text-[0.8125rem] font-semibold ${
                  state === "current"
                    ? "border-fg bg-fg text-bg"
                    : state === "done"
                      ? "border-line-strong bg-surface-2 text-fg"
                      : "border-line-strong bg-surface-2 text-muted"
                }`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-full text-[0.6875rem] font-bold ${
                    state === "current"
                      ? "bg-bg text-fg"
                      : state === "done"
                        ? "bg-[#3f8f5a] text-white"
                        : "bg-surface-3 text-muted"
                  }`}
                >
                  {state === "done" ? <CheckIcon size={12} strokeWidth={3} /> : number}
                </span>
                {name}
                {state === "done" ? <span className="sr-only"> (done)</span> : null}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

function slotLabel(slot: NextSlot): string {
  return `TOTW ${slot.totwNumber} · #${slot.position}`;
}
