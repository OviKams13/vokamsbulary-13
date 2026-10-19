import type { ReactNode } from "react";

/** Marker-style yellow highlight for an explained term inside a post text. */
export function Marker({ children }: { children: ReactNode }) {
  return <mark className="marker">{children}</mark>;
}
