import { FeedChrome } from "@/components/shell/feed-chrome";
import { getTotwOverview } from "@/db/totw";

/**
 * Mobile chrome of the feed pages (4.2, mockups 01-M, 01-drawer): top bar with
 * the drawer, and the floating "+" button. Hidden on desktop.
 */
export default async function FeedLayout({ children }: LayoutProps<"/">) {
  // Same request-cached call as the app layout: no extra database round trip.
  const overview = await getTotwOverview();

  return <FeedChrome overview={overview}>{children}</FeedChrome>;
}
