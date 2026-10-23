/**
 * App routes, in one place. Posts use the singular `/post/` everywhere.
 */
export const routes = {
  home: "/",
  totw: (number: number) => `/totw/${number}`,
  /** Post detail page (6.1). `?w=n` selects the n-th word tab (6.2). */
  post: (id: string) => `/post/${id}`,
  /** Upload page (7.1). */
  newPost: "/post/new",
  /** A draft being read by Claude: the processing screen (7.4). */
  draft: (id: string) => `/post/new/${id}`,
  /** A draft whose text was read: the Verify step (7.6). */
  draftVerify: (id: string) => `/post/new/${id}/verify`,
  /** Status of a draft, polled by the processing screen (7.4). */
  draftStatus: (id: string) => `/api/drafts/${id}`,
} as const;
