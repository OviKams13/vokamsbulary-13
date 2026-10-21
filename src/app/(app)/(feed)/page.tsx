import { getTotwOverview } from "@/db/totw";

import { TotwView } from "./totw-view";

/** Home: the current (newest) TOTW (4.3). */
export default async function HomePage() {
  const { current } = await getTotwOverview();
  return <TotwView totw={current} />;
}
