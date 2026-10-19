import { getTheme } from "@/themes";

/** Theme name pill in the top-right corner of a post card ("Strawberry", "Banana"…). */
export function ThemePill({ themeKey }: { themeKey: string }) {
  const theme = getTheme(themeKey);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ backgroundColor: theme.pill.background, color: theme.pill.text }}
    >
      {theme.label}
    </span>
  );
}
