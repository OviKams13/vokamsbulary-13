import type { Metadata } from "next";

import { search } from "@/db/search";
import { normalizeQuery, SEARCH_MIN_LENGTH } from "@/lib/search";

import { SearchView } from "./search-view";

export const metadata: Metadata = { title: "Search · Vokamsbulary 13" };

/** Search results (10.2) for `?q=`, from the database. The page is `SearchView`. */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = normalizeQuery(typeof q === "string" ? q : "");
  const results = query.length >= SEARCH_MIN_LENGTH ? await search(query) : null;

  return <SearchView query={query} results={results} />;
}
