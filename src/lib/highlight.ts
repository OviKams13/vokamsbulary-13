/** A piece of post text: plain, or one occurrence of a term to highlight. */
export type TextSegment = { text: string; marked: boolean };

/**
 * Splits a post text into plain and highlighted pieces (E-06): every
 * case-insensitive occurrence of every term `surface` is highlighted.
 *
 * - Only whole words match: "art" is not highlighted inside "start".
 * - Longer surfaces win when two overlap ("give up" before "give").
 * - Any run of spaces in a surface matches any run of spaces in the text,
 *   and ' matches ’ (and the other way round).
 */
export function highlightTerms(text: string, surfaces: readonly string[]): TextSegment[] {
  const patterns = [...new Set(surfaces.map((surface) => surface.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map(toPattern);
  if (patterns.length === 0) return [{ text, marked: false }];

  const matcher = new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${patterns.join("|")})(?![\\p{L}\\p{N}])`,
    "giu",
  );
  const segments: TextSegment[] = [];
  let last = 0;

  for (const match of text.matchAll(matcher)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), marked: false });
    segments.push({ text: match[0], marked: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), marked: false });
  return segments;
}

function toPattern(surface: string): string {
  return surface
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['’]/g, "['’]"))
    .join("\\s+");
}
