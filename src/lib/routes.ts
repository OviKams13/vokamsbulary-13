/**
 * App routes, in one place. Some point to pages built in later phases.
 */
export const routes = {
  home: "/",
  totw: (number: number) => `/totw/${number}`,
  /** Upload page (Phase 7, 7.1). Not built yet: 404 until then. */
  newPost: "/posts/new",
} as const;
