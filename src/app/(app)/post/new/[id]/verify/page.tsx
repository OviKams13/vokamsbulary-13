import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { findAlreadySeen } from "@/db/already-seen";
import { getDraft, getNextSlot } from "@/db/drafts";
import { isPostId } from "@/db/post-detail";
import { formatInlineDate } from "@/lib/relative-date";
import { routes } from "@/lib/routes";

import { NewPostBar, NewPostSteps } from "../../new-post-header";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Check what we found · Vokamsbulary 13" };

// "Explain & publish" runs on this page and the explanation continues in
// `after()`: one Claude call (120 s timeout + 1 retry) must fit in the time.
export const maxDuration = 300;

/**
 * Verify (7.6–7.9, mockups 03c-D / 03c-M): the original screenshot next to
 * the editable text and word list, already-seen warnings, then "Explain &
 * publish" or "Save draft".
 */
export default async function VerifyPage({ params }: PageProps<"/post/new/[id]/verify">) {
  const { id } = await params;
  if (!isPostId(id)) notFound();
  const [draft, slot] = await Promise.all([getDraft(id), getNextSlot()]);
  if (!draft) notFound();
  if (draft.status === "published") redirect(routes.post(id));
  if (draft.status === "uploaded") redirect(routes.draft(id));
  const seen = await findAlreadySeen(draft.terms.map((term) => term.headword));

  const screenshot = (
    <Image
      src={draft.imageUrl}
      alt="Your screenshot"
      width={draft.imageWidth}
      height={draft.imageHeight}
      unoptimized
      priority
      className="max-h-66 w-full object-cover object-top lg:max-h-125"
    />
  );

  return (
    <>
      <NewPostBar slot={slot} title="Check what we found" />
      <main className="mx-auto w-full max-w-255 px-4 pt-4 pb-32 lg:px-8 lg:pt-10 lg:pb-16 xl:px-0">
        <NewPostSteps step={3} slot={slot} title="Check what we found" />

        <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[21.25rem_1fr] lg:items-start lg:gap-7">
          <section aria-labelledby="original-label">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 id="original-label" className={LABEL}>
                Original screenshot
              </h2>
              <a
                href={draft.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-gold lg:hidden"
              >
                View full
              </a>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white lg:rounded-[1.125rem]">
              {screenshot}
            </div>
            <p className="mt-3 hidden text-[0.8125rem] text-muted lg:block">
              Uploaded {formatInlineDate(draft.createdAt)} ·{" "}
              <a
                href={draft.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-fg"
              >
                Open full size
              </a>
            </p>
          </section>

          <VerifyForm
            postId={draft.id}
            initialStatus={draft.status}
            initialError={draft.lastError}
            initialText={draft.text ?? draft.extractedText ?? ""}
            initialTerms={draft.terms}
            initialSeen={seen}
            slotLabel={`TOTW ${slot.totwNumber} · #${slot.position}`}
          />
        </div>
      </main>
    </>
  );
}

const LABEL = "text-xs font-semibold tracking-[0.12em] text-muted uppercase";
