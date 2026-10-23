import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getDraft, getNextSlot } from "@/db/drafts";
import { isPostId } from "@/db/post-detail";
import { formatInlineDate } from "@/lib/relative-date";
import { routes } from "@/lib/routes";

import { NewPostBar, NewPostSteps } from "../new-post-header";
import { ProcessingView } from "./processing-view";
import { ReadError } from "./read-error";

export const metadata: Metadata = { title: "Reading your text · Vokamsbulary 13" };

// Retry (7.10) runs on this page and extraction continues in `after()`.
export const maxDuration = 300;

/**
 * Processing screen of a draft (7.4, mockup 03b), or the error screen when
 * extraction failed (7.10, mockup 03d). A draft that is already past this
 * step goes straight to where it belongs.
 */
export default async function DraftPage({ params }: PageProps<"/post/new/[id]">) {
  const { id } = await params;
  if (!isPostId(id)) notFound();
  const [draft, slot] = await Promise.all([getDraft(id), getNextSlot()]);
  if (!draft) notFound();
  if (draft.status === "published") redirect(routes.post(id));
  if (draft.status !== "uploaded") redirect(routes.draftVerify(id));

  if (draft.lastError) {
    return (
      <>
        <NewPostBar slot={slot} />
        <ReadError
          postId={draft.id}
          lastError={draft.lastError}
          savedLabel={formatInlineDate(draft.createdAt)}
        />
      </>
    );
  }

  return (
    <>
      <NewPostBar slot={slot} />
      <main className="mx-auto w-full max-w-190 px-4 pt-4 pb-16 lg:px-0 lg:pt-10">
        <NewPostSteps step={2} slot={slot} />
        <div className="mt-5 lg:mt-7">
          <ProcessingView
            postId={draft.id}
            imageUrl={draft.imageUrl}
            imageWidth={draft.imageWidth}
            imageHeight={draft.imageHeight}
          />
        </div>
      </main>
    </>
  );
}
