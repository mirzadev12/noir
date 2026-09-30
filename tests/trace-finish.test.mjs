// The trace surfaces' finish: they stand whole and still under reduced motion, and no drawn text is set small.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const graph = readFileSync(new URL("../components/noir/TraceGraph.tsx", import.meta.url), "utf8");
const many = readFileSync(new URL("../components/landing/ManyToOne.tsx", import.meta.url), "utf8");

/** The body of the last `@media (prefers-reduced-motion: reduce)` block that mentions `needle`. */
function reduced(needle) {
  const blocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]);
  const hit = blocks.filter((b) => b.includes(needle)).pop();
  assert.ok(hit, `a reduced-motion block mentions ${needle}`);
  return hit;
}

test("under reduced motion the trace is drawn whole and the ticker is a still list", () => {
  const block = reduced(".ticker");
  for (const cls of [".trace-draw", ".trace-draw-back", ".route-arrive", ".ticker"]) assert.ok(block.includes(cls), `${cls} stops animating`);
  assert.match(block, /\.ticker > \[aria-hidden="true"\][\s\S]*?display: none/, "the second copy of the list is hidden");
  assert.match(block, /\.ticker ul[\s\S]*?flex-wrap: wrap/, "the list wraps instead of running off the edge");
  assert.match(block, /\.fade-x[\s\S]*?mask-image: none/, "no edge mask hides part of the list");
  assert.match(block, /\.flow[\s\S]*?stroke-dasharray: none/, "an edge is a solid line, not a travelling dash");
});

test("nothing drawn in the graph or the many-to-one diagram is set below 13 units", () => {
  for (const [name, src] of [["TraceGraph", graph], ["ManyToOne", many]]) {
    const sizes = [...src.matchAll(/fontSize="(\d+)"/g)].map((m) => Number(m[1]));
    assert.ok(sizes.length > 0, `${name} sets font sizes`);
    assert.ok(Math.min(...sizes) >= 13, `${name} has a font size of ${Math.min(...sizes)}`);
  }
});

test("a node's text cannot run out of its box: long titles and figures are fitted, notes wrap or clip", () => {
  assert.match(graph, /textLength: INNER/);
  assert.match(graph, /noteLines\(node\.note/);
  assert.doesNotMatch(graph, /color-ink-faint\)" fontSize="14" fontFamily="var\(--font-sans\)">\s*\{clip\(node\.note/, "the note no longer uses the faint ink that is under 4.5:1 on a lit node");
});
