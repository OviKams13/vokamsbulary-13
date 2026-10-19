import type { CSSProperties } from "react";

// Ribbon shape: notched left edge, arrow point on the right (mockups 01, 02).
const RIBBON: CSSProperties = {
  clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 7px 50%)",
};

type PostTagProps = {
  totwNumber: number;
  /** Position of the post in its TOTW (1–15). */
  position: number;
};

/** "TOTW 3 | #7" ribbon shown in the top-left corner of a post card. */
export function PostTag({ totwNumber, position }: PostTagProps) {
  return (
    <span className="relative inline-flex h-7 items-stretch font-display text-[15px] leading-none font-extrabold tracking-[0.08em] text-gold-light">
      <span aria-hidden className="absolute inset-0 bg-gold" style={RIBBON} />
      <span aria-hidden className="absolute inset-[1.5px] bg-[#141416]" style={RIBBON} />
      <span className="relative flex items-center pr-5 pl-4">TOTW {totwNumber}</span>
      <span aria-hidden className="relative my-[1.5px] w-px bg-gold" />
      <span className="relative flex items-center pr-6 pl-2.5">#{position}</span>
    </span>
  );
}
