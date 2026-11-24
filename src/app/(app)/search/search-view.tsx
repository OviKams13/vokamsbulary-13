import { Suspense } from "react";

import { SearchField } from "@/components/shell/search-field";
import { type ExplainedResult, SEARCH_MIN_LENGTH, type TextResult } from "@/lib/search";

import { BackButton } from "./back-button";
import { SearchResults } from "./search-results";

/**
 * Search page (10.2, mockups 05-D / 05-M). Desktop: the query is typed in the
 * sidebar field, and the page shows "Results for …". Mobile: the page has its
 * own header with Back and the field, in place of the feed's top bar. Results
 * come from the database (the page) or from the offline copy (14.2).
 */
export function SearchView({
  query,
  results,
}: {
  /** Normalized (`normalizeQuery()`). */
  query: string;
  /** Null below the minimum length. */
  results: { explained: ExplainedResult[]; texts: TextResult[] } | null;
}) {
  const title = query ? `Results for “${query}”` : "Search";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-bg/95 px-4 backdrop-blur lg:hidden">
        <BackButton />
        {/* useSearchParams needs a Suspense boundary. */}
        <Suspense fallback={<div className="h-12 flex-1 rounded-full border border-line-strong" />}>
          <SearchField variant="page" autoFocus={!query} />
        </Suspense>
      </header>

      <main className="mx-auto w-full max-w-180 px-4 pt-4 pb-16 lg:px-0 lg:pt-11">
        <div className="hidden lg:block">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Search</p>
          <h1 className="mt-2 text-[2.125rem] leading-tight font-extrabold tracking-tight">
            {title}
          </h1>
        </div>
        <h1 className="sr-only lg:hidden">{title}</h1>

        {results ? (
          <SearchResults query={query} explained={results.explained} texts={results.texts} />
        ) : (
          <p className="mt-6 text-[0.9375rem] leading-relaxed text-fg-soft lg:mt-5">
            {query
              ? `Type at least ${SEARCH_MIN_LENGTH} letters.`
              : "Search the words you learned and the texts of your posts."}
          </p>
        )}
      </main>
    </>
  );
}
