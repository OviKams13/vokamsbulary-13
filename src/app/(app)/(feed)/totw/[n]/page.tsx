import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getTotwOverview } from "@/db/totw";
import { routes } from "@/lib/routes";
import { parseTotwNumber } from "@/lib/totw";

import { TotwView } from "../../totw-view";

export async function generateMetadata({ params }: PageProps<"/totw/[n]">): Promise<Metadata> {
  const number = parseTotwNumber((await params).n);
  return { title: number ? `TOTW ${number} · Vokamsbulary 13` : "Vokamsbulary 13" };
}

/**
 * One TOTW by number (4.3). Numbers outside 1 … current give a 404, and the
 * current TOTW redirects to `/`, its only URL.
 */
export default async function TotwPage({ params }: PageProps<"/totw/[n]">) {
  const number = parseTotwNumber((await params).n);
  const { totws } = await getTotwOverview();
  const totw = totws.find((item) => item.number === number);
  if (!totw) notFound();
  // Temporary (307): the current TOTW changes as posts are published.
  if (totw.current) redirect(routes.home);

  return <TotwView totw={totw} />;
}
