import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { HighlightedText } from "@/components/highlighted-text";
import { getDraft, getNextSlot } from "@/db/drafts";
import { isPostId } from "@/db/post-detail";
import { routes } from "@/lib/routes";

import { NewPostBar, NewPostSteps } from "../../new-post-header";

export const metadata: Metadata = { title: "Verify · Vokamsbulary 13" };

/**
 * Verify step — TEMPORARY read-only view, so the processing screen (7.4) has
 * somewhere to land. It shows what extraction found. The real Verify screen
 * (editable text and terms, Save draft) is 7.6, in the next block.
 */
export default async function VerifyPage({ params }: PageProps<"/post/new/[id]/verify">) {
  const { id } = await params;
  if (!isPostId(id)) notFound();
  const [draft, slot] = await Promise.all([getDraft(id), getNextSlot()]);
  if (!draft) notFound();
  if (draft.status === "published") redirect(routes.post(id));
  if (draft.status === "uploaded") redirect(routes.draft(id));

  return (
    <>
      <NewPostBar slot={slot} />
      <main className="mx-auto w-full max-w-190 px-4 pt-4 pb-16 lg:px-0 lg:pt-10">
        <NewPostSteps step={3} slot={slot} />
        <div className="mt-5 grid gap-6 lg:mt-7 lg:grid-cols-[17rem_1fr]">
          <Image
            src={draft.imageUrl}
            alt="Your screenshot"
            width={draft.imageWidth}
            height={draft.imageHeight}
            unoptimized
            className="mx-auto w-full max-w-72.5 rounded-2xl bg-white lg:max-w-none"
          />

          <div>
            <h2 className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
              Text read by Claude
            </h2>
            <p className="mt-2.5 rounded-paper bg-paper px-5 py-4 leading-[1.7] whitespace-pre-line text-ink">
              <HighlightedText
                text={draft.extractedText ?? ""}
                surfaces={draft.terms.map((term) => term.surface)}
              />
            </p>

            <h2 className="mt-7 text-xs font-semibold tracking-[0.12em] text-muted uppercase">
              Underlined words ({draft.terms.length})
            </h2>
            {draft.terms.length > 0 ? (
              <ul className="mt-2.5 divide-y divide-line rounded-2xl border border-line bg-surface">
                {draft.terms.map((term) => (
                  <li key={term.position} className="flex items-center gap-3 px-4 py-3">
                    <span className="font-semibold">{term.surface}</span>
                    <span className="text-muted">→</span>
                    <span className="text-fg-soft">{term.headword}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2.5 text-fg-soft">No red underline was found.</p>
            )}

            <p className="mt-6 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
              Editing the text and the words, then publishing, arrive with the next steps (7.6 →
              7.9).
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
