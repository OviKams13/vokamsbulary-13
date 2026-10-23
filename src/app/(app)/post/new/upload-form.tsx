"use client";

import {
  type DragEvent,
  type ReactNode,
  startTransition,
  useActionState,
  useRef,
  useState,
} from "react";

import { ImageIcon, UploadIcon } from "@/components/icons";
import { ACCEPTED_IMAGE_TYPES, isAcceptedImageType } from "@/lib/upload";

import { type UploadState, uploadScreenshot } from "./actions";
import { prepareScreenshot } from "./prepare-screenshot";

const initialState: UploadState = { error: null };

/**
 * Drop zone + "Choose screenshot" (7.1, mockup 03a). The file is resized and
 * compressed in the browser, then sent to the upload Server Action, which
 * opens the processing screen.
 */
export function UploadForm() {
  const input = useRef<HTMLInputElement>(null);
  const [state, upload, uploading] = useActionState(uploadScreenshot, initialState);
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const busy = preparing || uploading;
  const error = localError ?? (busy ? null : state.error);

  async function handleFile(file: File | undefined) {
    if (!file || busy) return;
    setLocalError(null);
    if (!isAcceptedImageType(file.type)) {
      setLocalError("Use a PNG, JPG or WebP image.");
      return;
    }

    setPreparing(true);
    try {
      const prepared = await prepareScreenshot(file);
      const form = new FormData();
      form.set("screenshot", prepared.file);
      form.set("width", String(prepared.width));
      form.set("height", String(prepared.height));
      startTransition(() => upload(form));
    } catch (problem) {
      setLocalError(problem instanceof Error ? problem.message : "This image couldn't be read.");
    } finally {
      setPreparing(false);
      if (input.current) input.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center rounded-[1.375rem] border-[1.5px] border-dashed px-5 py-12 text-center transition sm:rounded-3xl lg:py-15 ${
        dragging ? "border-gold bg-gold/6" : "border-[#3a3a40] bg-surface"
      }`}
    >
      <span className="grid size-15 place-items-center rounded-2xl bg-surface-3 text-fg lg:size-16">
        <ImageIcon size={26} className="lg:hidden" />
        <UploadIcon size={24} className="hidden lg:block" />
      </span>

      <h2 className="mt-5 text-[1.375rem] font-extrabold tracking-tight lg:text-[1.5rem]">
        <span className="lg:hidden">Add a screenshot</span>
        <span className="hidden lg:inline">Drop your screenshot here</span>
      </h2>
      <p className="mt-2.5 max-w-80 text-[0.9375rem] leading-relaxed text-fg-soft lg:max-w-none">
        <span className="lg:hidden">
          Underline the words you don&apos;t know <RedUnderline>in red</RedUnderline>, then pick it
          from your gallery.
        </span>
        <span className="hidden lg:inline">
          PNG, JPG or WebP. Underline the words you don&apos;t know{" "}
          <RedUnderline>in red</RedUnderline>.
        </span>
      </p>

      <input
        ref={input}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="mt-7 flex h-13 w-full items-center justify-center gap-2.5 rounded-full bg-fg px-6 text-[1.0625rem] font-semibold text-bg transition hover:bg-white disabled:opacity-70 lg:mt-6 lg:h-11 lg:w-auto lg:text-base"
      >
        <ImageIcon size={18} className="hidden lg:block" />
        {preparing ? "Preparing…" : uploading ? "Uploading…" : "Choose screenshot"}
      </button>

      <p role="alert" className="mt-4 min-h-5 text-sm font-medium text-red-400">
        {error}
      </p>
    </div>
  );
}

function RedUnderline({ children }: { children: ReactNode }) {
  return (
    <span className="font-semibold text-fg underline decoration-[#e5484d] decoration-2 underline-offset-4">
      {children}
    </span>
  );
}
