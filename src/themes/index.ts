/**
 * Post theme presets (D-11, ERD §5.2). The list lives in code, not in the
 * database: `posts.theme_key` stores one of these keys.
 *
 * Strawberry, banana, ocean and football come from the mockups (01, 02); the
 * other four follow the same recipe. Each theme has a strong card color, a
 * repeating motif drawn in a lighter shade of it (`ThemePattern`), and a near-
 * white text panel, so the post text is always dark ink on a light background,
 * whatever the theme.
 */
export type ThemePreset = {
  key: string;
  label: string;
  /** Card background around the text panel. */
  background: string;
  /** Color of the repeating motif drawn on the background. */
  pattern: string;
  /** Text panel color (the post text is `ink` on it, with yellow markers). */
  paper: string;
  /** Theme name pill in the top-right corner of a card. */
  pill: { background: string; text: string };
  /** Thin card border, for the dark theme only (otherwise it melts into the page). */
  border?: string;
};

export const THEMES = [
  {
    key: "strawberry",
    label: "Strawberry",
    background: "#e0405a",
    pattern: "#ee7d8e",
    paper: "#fef7f2",
    pill: { background: "#4a1220", text: "#fbfafa" },
  },
  {
    key: "banana",
    label: "Banana",
    background: "#f4c63d",
    pattern: "#e3ad1f",
    paper: "#fffbee",
    pill: { background: "#3d3115", text: "#fbfafa" },
  },
  {
    key: "ocean",
    label: "Ocean",
    background: "#0d3b78",
    pattern: "#2a68b5",
    paper: "#f6f6f2",
    pill: { background: "#081a33", text: "#fbfafa" },
  },
  {
    key: "football",
    label: "Football",
    background: "#101012",
    pattern: "#2f2f35",
    paper: "#f6f5f0",
    pill: { background: "#2a2a2f", text: "#fbfafa" },
    border: "#26262b",
  },
  {
    key: "mint",
    label: "Mint",
    background: "#1f8f5f",
    pattern: "#45ad7f",
    paper: "#f4faf5",
    pill: { background: "#0d3a26", text: "#fbfafa" },
  },
  {
    key: "grape",
    label: "Grape",
    background: "#6a3fa0",
    pattern: "#8a63c0",
    paper: "#f8f5fb",
    pill: { background: "#2c1647", text: "#fbfafa" },
  },
  {
    key: "orange",
    label: "Orange",
    background: "#f0862a",
    pattern: "#f6a75c",
    paper: "#fff7ee",
    pill: { background: "#5a2b05", text: "#fbfafa" },
  },
  {
    key: "sky",
    label: "Sky",
    background: "#3d97d6",
    pattern: "#6fb5e6",
    paper: "#f5f9fc",
    pill: { background: "#0f3550", text: "#fbfafa" },
  },
] as const satisfies readonly ThemePreset[];

export type ThemeKey = (typeof THEMES)[number]["key"];

export function getTheme(key: string): ThemePreset {
  return THEMES.find((theme) => theme.key === key) ?? THEMES[0];
}
