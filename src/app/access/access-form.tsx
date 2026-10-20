"use client";

import { useActionState } from "react";

import { type AccessState, submitAccessCode } from "./actions";

const initialState: AccessState = { error: null };

/** Access code field + Enter button (mockup 06b). */
export function AccessForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(submitAccessCode, initialState);
  const hasError = Boolean(state.error) && !pending;

  return (
    <form action={formAction} className="flex w-full flex-col" noValidate>
      <input type="hidden" name="next" value={next} />

      <label htmlFor="access-code" className="mb-2 text-sm font-semibold text-fg-soft">
        Access code
      </label>
      <input
        id="access-code"
        name="code"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        aria-invalid={hasError}
        aria-describedby={hasError ? "access-error" : undefined}
        className="h-15 w-full rounded-2xl border-[1.5px] border-gold/70 bg-bg px-5 text-center text-2xl tracking-[0.35em] text-fg shadow-[0_0_14px_rgb(232_184_75/0.18)] transition outline-none focus:border-gold focus:shadow-[0_0_18px_rgb(232_184_75/0.35)] aria-invalid:border-red-400/80 aria-invalid:shadow-[0_0_14px_rgb(248_113_113/0.18)] aria-invalid:focus:border-red-400"
      />

      {/* Fixed 22 px slot (the field-to-button gap in 06b): no layout jump on error. */}
      <p
        id="access-error"
        role="alert"
        className="h-5.5 text-center text-[0.8125rem] leading-5.5 text-red-300"
      >
        {hasError ? state.error : null}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="h-13 w-full rounded-full bg-fg text-base font-semibold text-ink transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
