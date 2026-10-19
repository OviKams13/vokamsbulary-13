import { BrandLogo } from "@/components/brand-logo";
import { Marker } from "@/components/marker";
import { PostTag } from "@/components/post-tag";
import { TermChip } from "@/components/term-chip";
import { ThemePill } from "@/components/theme-pill";
import { TotwBadge } from "@/components/totw-badge";
import { TotwHeader } from "@/components/totw-header";
import { getTheme, THEMES } from "@/themes";

/**
 * Temporary preview of the design foundations (2.5). It shows the tokens and
 * reusable components with static sample data, and is replaced by the real
 * app shell and feed in Phase 4.
 */
export default function DesignPreviewPage() {
  const strawberry = getTheme("strawberry");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[var(--spacing-sidebar)_1fr]">
      <aside className="border-line px-5 py-7 lg:border-r">
        <BrandLogo withName priority />
        <p className="mt-10 text-xs font-semibold tracking-[0.12em] text-muted uppercase">
          Team of the week
        </p>
        <ul className="mt-3 space-y-2">
          {[3, 2, 1].map((number) => (
            <li
              key={number}
              className={`flex items-center gap-3 rounded-paper px-3 py-1.5 ${
                number === 3 ? "border border-line-strong bg-surface-3" : ""
              }`}
            >
              <TotwBadge number={number} size="sm" glow={number === 3} />
              <span className="font-bold">TOTW {number}</span>
            </li>
          ))}
        </ul>
      </aside>

      <main className="mx-auto w-full max-w-feed px-4 py-6 lg:py-8">
        <TotwHeader number={3} count={7} current />

        <article className="mt-7">
          <div className="rounded-card p-4" style={{ backgroundColor: strawberry.background }}>
            <div className="mb-3 flex items-center justify-between">
              <PostTag totwNumber={3} position={7} />
              <ThemePill themeKey={strawberry.key} />
            </div>
            <p className="rounded-paper bg-paper px-5 py-4 text-lg leading-[1.75] text-ink">
              The new manager was <Marker>adamant</Marker> that the squad needed more depth, but the
              board was <Marker>reluctant</Marker> to spend. After weeks of{" "}
              <Marker>haggling</Marker>, they finally struck a deal that seemed to{" "}
              <Marker>placate</Marker> everyone.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
            {["adamant", "reluctant", "haggle", "placate"].map((term) => (
              <TermChip key={term}>{term}</TermChip>
            ))}
            <span className="ml-auto text-sm text-muted">2h ago</span>
          </div>
        </article>

        <section className="mt-10" aria-labelledby="themes-heading">
          <h2
            id="themes-heading"
            className="text-xs font-semibold tracking-[0.12em] text-muted uppercase"
          >
            Theme presets
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {THEMES.map((theme) => (
              <li
                key={theme.key}
                className="flex h-20 items-start justify-end rounded-paper p-3"
                style={{ backgroundColor: theme.background }}
              >
                <ThemePill themeKey={theme.key} />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="badges-heading">
          <h2
            id="badges-heading"
            className="text-xs font-semibold tracking-[0.12em] text-muted uppercase"
          >
            TOTW badges
          </h2>
          <div className="mt-3 flex items-end gap-5">
            <TotwBadge number={1} size="sm" />
            <TotwBadge number={2} size="md" />
            <TotwBadge number={3} size="lg" glow />
            <TotwBadge number={12} size="lg" />
          </div>
        </section>
      </main>
    </div>
  );
}
