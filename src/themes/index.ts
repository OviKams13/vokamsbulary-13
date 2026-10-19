/**
 * Post theme presets (D-11, ERD §5.2). The list lives in code, not in the
 * database: `posts.theme_key` stores one of these keys.
 *
 * Colors come from the mockups. The repeating background art (strawberries,
 * bananas, fish, footballs) is added with the post card in the feed phase.
 */
export type ThemePreset = {
  key: string;
  label: string;
  /** Card background around the paper block. */
  background: string;
  /** Faint pattern color drawn on the background. */
  pattern: string;
  /** Theme name pill in the top-right corner of a card. */
  pill: { background: string; text: string };
};

export const THEMES = [
  {
    key: "strawberry",
    label: "Strawberry",
    background: "#e0405a",
    pattern: "#ee7d8e",
    pill: { background: "#4a1220", text: "#fbfafa" },
  },
  {
    key: "banana",
    label: "Banana",
    background: "#f4c63d",
    pattern: "#e3ad1f",
    pill: { background: "#3d3115", text: "#fbfafa" },
  },
  {
    key: "ocean",
    label: "Ocean",
    background: "#0d3b78",
    pattern: "#2a68b5",
    pill: { background: "#081a33", text: "#fbfafa" },
  },
  {
    key: "football",
    label: "Football",
    background: "#101012",
    pattern: "#3a3a40",
    pill: { background: "#2a2a2f", text: "#fbfafa" },
  },
] as const satisfies readonly ThemePreset[];

export type ThemeKey = (typeof THEMES)[number]["key"];

export function getTheme(key: string): ThemePreset {
  return THEMES.find((theme) => theme.key === key) ?? THEMES[0];
}
