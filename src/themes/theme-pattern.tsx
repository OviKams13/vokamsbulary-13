import { useId, type ReactNode } from "react";

import { getTheme } from "@/themes";

/**
 * Repeating background art of a theme (5.1): strawberries, bananas, waves and
 * fish, footballs… Drawn in SVG (no image files), in the theme's `pattern`
 * color, on a staggered 120 × 96 grid. Fills its positioned parent.
 */
export function ThemePattern({ themeKey }: { themeKey: string }) {
  const theme = getTheme(themeKey);
  const id = `pattern-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const motif = MOTIFS[theme.key] ?? MOTIFS.strawberry;

  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <pattern id={id} width="120" height="96" patternUnits="userSpaceOnUse">
          <g fill={theme.pattern} stroke={theme.pattern}>
            <g transform="translate(30 26)">{motif}</g>
            <g transform="translate(90 74)">{motif}</g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

// Each motif is centered on (0, 0) and about 30 px tall.
const MOTIFS: Record<string, ReactNode> = {
  strawberry: (
    <g strokeWidth="0">
      <path d="M0 15 C-9 9 -13 0 -11 -6 C-9 -11 -3 -11 0 -9 C3 -11 9 -11 11 -6 C13 0 9 9 0 15 Z" />
      <path d="M-6 -10 L0 -15 L6 -10 L2 -11 L0 -8 L-2 -11 Z" opacity="0.8" />
      <g fill="#ffffff" opacity="0.35">
        <circle cx="-4" cy="-2" r="1" />
        <circle cx="4" cy="-2" r="1" />
        <circle cx="0" cy="4" r="1" />
        <circle cx="-5" cy="5" r="0.9" />
        <circle cx="5" cy="5" r="0.9" />
      </g>
    </g>
  ),
  banana: (
    <path
      d="M-18 -4 C-10 8 10 8 18 -4"
      fill="none"
      strokeWidth="6"
      strokeLinecap="round"
      opacity="0.9"
    />
  ),
  ocean: (
    <g>
      <path
        d="M-22 -8 C-17 -13 -12 -13 -7 -8 C-2 -3 3 -3 8 -8"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g strokeWidth="0" transform="translate(4 8)">
        <ellipse cx="0" cy="0" rx="8" ry="4.5" />
        <path d="M7 0 L13 -4.5 L13 4.5 Z" />
      </g>
    </g>
  ),
  football: (
    <g>
      <circle r="13" fill="none" strokeWidth="2.2" />
      <path d="M0 -5.5 L5.2 -1.7 L3.2 4.5 L-3.2 4.5 L-5.2 -1.7 Z" strokeWidth="0" />
    </g>
  ),
  mint: (
    <g>
      <path d="M0 14 C-12 6 -12 -8 0 -14 C12 -8 12 6 0 14 Z" strokeWidth="0" />
      <path d="M0 -10 L0 12" fill="none" strokeWidth="1.4" stroke="#ffffff" opacity="0.3" />
    </g>
  ),
  grape: (
    <g strokeWidth="0">
      <circle cx="-6" cy="-6" r="4.6" />
      <circle cx="3" cy="-6" r="4.6" />
      <circle cx="-1.5" cy="1.5" r="4.6" />
      <circle cx="7.5" cy="1.5" r="4.2" />
      <circle cx="3" cy="9" r="4.2" />
      <path d="M-1 -11 C0 -15 3 -16 6 -16" fill="none" strokeWidth="1.8" />
    </g>
  ),
  orange: (
    <g>
      <circle r="12" fill="none" strokeWidth="2.4" />
      <g strokeWidth="1.6">
        <path d="M0 -9 L0 9 M-9 0 L9 0 M-6.4 -6.4 L6.4 6.4 M-6.4 6.4 L6.4 -6.4" />
      </g>
    </g>
  ),
  sky: (
    <path
      d="M-14 8 C-20 8 -20 0 -14 -1 C-14 -8 -5 -10 -2 -5 C1 -11 11 -10 11 -2 C18 -2 18 8 12 8 Z"
      strokeWidth="0"
    />
  ),
};
