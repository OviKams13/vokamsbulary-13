import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getTotwOverview } from "@/db/totw";
import { parseTotwNumber } from "@/lib/totw";

import { TotwView } from "../../totw-view";

export async function generateMetadata({ params }: PageProps<"/totw/[n]">): Promise<Metadata> {
  const number = parseTotwNumber((await params).n);
  return { title: number ? `TOTW ${number} · Vokamsbulary 13` : "Vokamsbulary 13" };
}

/** One TOTW by number (4.3). Numbers outside 1 … current give a 404. */
export default async function TotwPage({ params }: PageProps<"/totw/[n]">) {
  const number = parseTotwNumber((await params).n);
  const { totws } = await getTotwOverview();
  const totw = totws.find((item) => item.number === number);
  if (!totw) notFound();

  return <TotwView totw={totw} />;
}
