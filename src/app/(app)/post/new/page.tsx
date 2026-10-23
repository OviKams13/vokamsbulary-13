import type { Metadata } from "next";
import { connection } from "next/server";

import { getNextSlot, getUnfinishedDrafts } from "@/db/drafts";

import { DraftsList } from "./drafts-list";
import { NewPostBar, NewPostSteps } from "./new-post-header";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "New post · Vokamsbulary 13" };

// The upload Server Action runs here and extraction continues in `after()`:
// one Claude call (120 s timeout + 1 retry) must fit in the function's time.
export const maxDuration = 300;

/**
 * Upload page (7.1, mockup 03a): "Next up · TOTW n · #m", the 3-step
 * indicator, the drop zone, and the "Unfinished drafts" list (7.10).
 */
export default async function NewPostPage() {
  await connection();
  const [slot, drafts] = await Promise.all([getNextSlot(), getUnfinishedDrafts()]);

  return (
    <>
      <NewPostBar slot={slot} />
      <main className="mx-auto w-full max-w-180 px-4 pt-4 pb-16 lg:px-0 lg:pt-10">
        <NewPostSteps step={1} slot={slot} />
        <div className="mt-5 lg:mt-7">
          <UploadForm />
        </div>
        <DraftsList drafts={drafts} />
      </main>
    </>
  );
}
