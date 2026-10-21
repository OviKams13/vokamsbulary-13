import { highlightTerms } from "@/lib/highlight";

/** `text` with every occurrence of the given term surfaces in a yellow marker (E-06). */
export function HighlightedText({ text, surfaces }: { text: string; surfaces: string[] }) {
  return highlightTerms(text, surfaces).map((segment, index) =>
    segment.marked ? (
      <mark key={index} className="marker">
        {segment.text}
      </mark>
    ) : (
      segment.text
    ),
  );
}
