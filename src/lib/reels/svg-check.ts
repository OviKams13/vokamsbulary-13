/**
 * Reel drawings (16.1) come from Claude and are treated as untrusted. They
 * are shown only through `<img>` (never inline), and before they are stored
 * this check rebuilds each one from an allowlist: plain shapes, plain
 * presentation attributes, short text labels. Anything else (a script, a
 * style, an event attribute, a link, an image, an entity, a comment, a
 * doctype, an animation, a `url(…)`) rejects the whole SVG.
 *
 * The output is not the input: it is written again from the parsed pieces,
 * so nothing the check didn't understand can pass through.
 */

/** Size cap of one drawing, before and after the rebuild. */
export const MAX_SVG_LENGTH = 12_000;
const MAX_ELEMENTS = 400;
const MAX_DEPTH = 8;

const ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "text",
]);

const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?%?$/i;
const COLOR = /^(?:#[0-9a-f]{3,8}|none|transparent|currentColor|white|black)$/i;
const NUMBERS = /^[-\d.,\se]+$/i;
const PATH = /^[MmLlHhVvCcSsQqTtAaZz\d\s.,eE-]+$/;
const TRANSFORM =
  /^(?:\s*(?:translate|rotate|scale|matrix|skewX|skewY)\(\s*-?[\d.e]+(?:[\s,]+-?[\d.e]+){0,5}\s*\)\s*)+$/i;
const WORD = /^[a-z-]+$/i;

/** Attribute → rule for its value. */
const ATTRIBUTES: Record<string, RegExp> = {
  viewBox: NUMBERS,
  width: NUMBER,
  height: NUMBER,
  x: NUMBER,
  y: NUMBER,
  x1: NUMBER,
  y1: NUMBER,
  x2: NUMBER,
  y2: NUMBER,
  cx: NUMBER,
  cy: NUMBER,
  r: NUMBER,
  rx: NUMBER,
  ry: NUMBER,
  dx: NUMBER,
  dy: NUMBER,
  d: PATH,
  points: NUMBERS,
  fill: COLOR,
  stroke: COLOR,
  "stroke-width": NUMBER,
  "stroke-linecap": WORD,
  "stroke-linejoin": WORD,
  "stroke-dasharray": NUMBERS,
  opacity: NUMBER,
  "fill-opacity": NUMBER,
  "stroke-opacity": NUMBER,
  transform: TRANSFORM,
  "font-size": NUMBER,
  "font-weight": /^(?:normal|bold|[1-9]00)$/,
  "font-family": /^(?:sans-serif|serif|monospace)$/,
  "text-anchor": /^(?:start|middle|end)$/,
  "letter-spacing": NUMBER,
  "dominant-baseline": WORD,
  "fill-rule": /^(?:nonzero|evenodd)$/,
};

/** Short labels only: letters, digits, a little punctuation (no `&`, `<`, `>`). */
const LABEL = /^[\p{L}\p{N} .,!?'’:%+\-–—…/#$€£]{0,32}$/u;

const TAG = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=<>/"']+\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*)\s*(\/?)>/y;
const ATTRIBUTE = /([^\s=<>/"']+)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')/g;

type Node = { name: string; attributes: [string, string][]; children: (Node | string)[] };

/** The rebuilt SVG, or null if it isn't a plain, allowed drawing. */
export function checkSvg(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const source = input.trim().replace(/^<\?xml[^<>]*\?>\s*/, "");
  if (source.length === 0 || source.length > MAX_SVG_LENGTH) return null;
  // Entities, comments, doctypes, CDATA, processing instructions: never needed.
  if (/[&]|<!|<\?/.test(source)) return null;

  const root = parse(source);
  if (!root || root.name !== "svg") return null;
  if (!root.attributes.some(([name]) => name === "viewBox")) return null;

  const output = serialize(root, true);
  return output.length <= MAX_SVG_LENGTH ? output : null;
}

function parse(source: string): Node | null {
  const stack: Node[] = [];
  let root: Node | null = null;
  let index = 0;
  let count = 0;

  while (index < source.length) {
    const next = source.indexOf("<", index);
    const text = source.slice(index, next === -1 ? source.length : next);
    if (text.trim() !== "") {
      const parent = stack.at(-1);
      // Text only inside <text>, and short.
      if (!parent || parent.name !== "text" || !LABEL.test(text.trim())) return null;
      parent.children.push(text.trim());
    }
    if (next === -1) break;

    TAG.lastIndex = next;
    const match = TAG.exec(source);
    if (!match) return null;
    index = TAG.lastIndex;
    const [, closing, rawName, rawAttributes, selfClosing] = match;
    const name = rawName!;

    if (closing) {
      const open = stack.pop();
      if (!open || open.name !== name || rawAttributes || selfClosing) return null;
      if (stack.length === 0) {
        // Nothing may follow the root.
        if (source.slice(index).trim() !== "") return null;
        return open;
      }
      continue;
    }

    if (!ELEMENTS.has(name)) return null;
    if (++count > MAX_ELEMENTS || stack.length >= MAX_DEPTH) return null;
    if (name === "svg" && stack.length > 0) return null;
    if (name !== "svg" && stack.length === 0) return null;
    const attributes = readAttributes(rawAttributes ?? "", name === "svg");
    if (!attributes) return null;

    const node: Node = { name, attributes, children: [] };
    const parent = stack.at(-1);
    if (parent) {
      if (parent.name === "text") return null; // no <tspan> or shapes inside a label
      parent.children.push(node);
    } else {
      root = node;
    }
    if (selfClosing) {
      if (!parent) return null;
    } else {
      stack.push(node);
    }
  }
  return stack.length === 0 ? root : null;
}

function readAttributes(raw: string, isRoot: boolean): [string, string][] | null {
  const result: [string, string][] = [];
  const seen = new Set<string>();
  for (const match of raw.matchAll(ATTRIBUTE)) {
    const name = match[1]!;
    const value = (match[2] ?? match[3] ?? "").trim();
    if (seen.has(name)) return null;
    seen.add(name);
    // The namespace is written again by the rebuild; nothing else from it is kept.
    if (isRoot && (name === "xmlns" || name === "version")) continue;
    const rule = ATTRIBUTES[name];
    if (!rule || !rule.test(value)) return null;
    result.push([name, value]);
  }
  return result;
}

function serialize(node: Node, isRoot = false): string {
  const attributes = node.attributes.map(([name, value]) => ` ${name}="${value}"`).join("");
  const namespace = isRoot ? ' xmlns="http://www.w3.org/2000/svg"' : "";
  if (node.children.length === 0) return `<${node.name}${namespace}${attributes}/>`;
  const children = node.children
    .map((child) => (typeof child === "string" ? escapeText(child) : serialize(child)))
    .join("");
  return `<${node.name}${namespace}${attributes}>${children}</${node.name}>`;
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The `<img src>` of a checked drawing. */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
