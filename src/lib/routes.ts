/**
 * App routes, in one place. Posts use the singular `/post/` everywhere.
 */
export const routes = {
  home: "/",
  totw: (number: number) => `/totw/${number}`,
  /** Post detail page (6.1). `?w=n` selects the n-th word tab (6.2). */
  post: (id: string) => `/post/${id}`,
  /** Upload page (Phase 7, 7.1). Not built yet: 404 until then. */
  newPost: "/post/new",
} as const;
