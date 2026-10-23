import type { ReactNode } from "react";

import { HighlightedText } from "@/components/highlighted-text";
import { PostTag } from "@/components/post-tag";
import { ThemePill } from "@/components/theme-pill";
import { getTheme } from "@/themes";
import { ThemePattern } from "@/themes/theme-pattern";

type ThemedPostProps = {
  text: string;
  themeKey: string;
  totwNumber: number;
  position: number;
  /** Term surfaces to highlight (E-06). */
  surfaces: string[];
  /** Shown under the text, inside the panel: the French text on the detail page (8.3). */
  translation?: ReactNode;
};

/**
 * A post on its theme (5.1/5.2): colored card with its pattern, the
 * TOTW/#position ribbon, the theme pill and the text panel with every term
 * highlighted. Used by the feed card (wrapped in a link) and the detail page.
 */
export function ThemedPost({
  text,
  themeKey,
  totwNumber,
  position,
  surfaces,
  translation,
}: ThemedPostProps) {
  const theme = getTheme(themeKey);

  return (
    <div
      className="relative overflow-hidden rounded-[1.375rem] px-3.5 pt-3.5 pb-3.5 sm:rounded-card sm:px-4.5 sm:pt-4.5 sm:pb-4"
      style={{
        backgroundColor: theme.background,
        boxShadow: theme.border ? `inset 0 0 0 1px ${theme.border}` : undefined,
      }}
    >
      <ThemePattern themeKey={theme.key} />

      <div className="relative flex items-center justify-between gap-3">
        <PostTag totwNumber={totwNumber} position={position} />
        <ThemePill themeKey={theme.key} />
      </div>

      <div
        className="relative mt-3.5 rounded-[0.875rem] px-4 py-3.5 text-ink sm:mt-4 sm:rounded-paper sm:px-5.5 sm:py-4.5"
        style={{ backgroundColor: theme.paper }}
      >
        <p className="text-base leading-[1.7] sm:text-lg sm:leading-[1.72]">
          <HighlightedText text={text} surfaces={surfaces} />
        </p>
        {translation}
      </div>
    </div>
  );
}
