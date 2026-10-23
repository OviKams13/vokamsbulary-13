/**
 * Posts per Team of the Week. Lives here, not in the schema, so client
 * components can use it without pulling in drizzle. The `post_ranks` SQL
 * repeats it (ERD §5.1).
 */
export const TOTW_SIZE = 15;

/** One Team of the Week, as shown in the navigation. */
export type TotwSummary = {
  number: number;
  /** Published posts in this TOTW (0–15). */
  count: number;
  /** The newest TOTW: the one new posts go into. */
  current: boolean;
};

/**
 * Builds the TOTW list, newest first, from the post counts per TOTW number
 * read from `post_ranks` (X-01, ERD §5.1).
 *
 * There are ⌊published / 15⌋ + 1 TOTWs: TOTW 1 exists at 0/15 on first launch,
 * and as soon as a TOTW reaches 15/15 the next one appears at 0/15.
 */
export function buildTotwList(countsByNumber: ReadonlyMap<number, number>): TotwSummary[] {
  let published = 0;
  for (const count of countsByNumber.values()) published += count;

  const total = Math.floor(published / TOTW_SIZE) + 1;
  return Array.from({ length: total }, (_, index) => {
    const number = total - index;
    return { number, count: countsByNumber.get(number) ?? 0, current: index === 0 };
  });
}

/** `/totw/[n]` segment → TOTW number, or null when it isn't a plain positive integer. */
export function parseTotwNumber(segment: string): number | null {
  if (!/^[1-9]\d{0,5}$/.test(segment)) return null;
  return Number(segment);
}

/** One filled position of a TOTW quick list (9.1, F11). */
export type QuickListItem = {
  /** 1–15 inside the TOTW. */
  position: number;
  postId: string;
  /** The post's headwords, in term order, without repeats. */
  headwords: string[];
};
