// The working screens' finish: addresses in narrow table columns are shortened (whole one in the title, on the explorer and on the letter), never wrapped over lines.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("every wallet link in the desk's lists is the short form", () => {
  const lists = read("components/desk/DeskLists.tsx");
  const links = [...lists.matchAll(/<WalletLink [^>]*\/>/g)].map((m) => m[0]);
  assert.ok(links.length >= 6, "the lists use WalletLink");
  for (const l of links) assert.match(l, /\bshort\b/, l);
});

test("a VASP page's account and transaction hashes are shortened, with the whole value in the title", () => {
  const src = read("components/desk/VaspWallets.tsx");
  assert.match(src, /shortAddress\(w\.account\)/);
  assert.match(src, /title=\{w\.account\}/);
  assert.match(src, /copy=\{w\.account\}/, "the whole account can still be copied");
  assert.match(src, /shortHash\(hash\)/);
  assert.match(src, /title=\{hash\}/);
});

test("a copy button stays beside its value instead of wrapping onto a line of its own", () => {
  for (const p of ["components/noir/Mono.tsx", "components/noir/RouteLink.tsx"]) {
    assert.doesNotMatch(read(p), /inline-flex min-w-0 max-w-full flex-wrap items-baseline gap-x-2/, p);
  }
});

test("a stacked table row does not indent its first cell, and an empty register does not count zero twice", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.noir-table td,\s*\.noir-table td:first-child \{\s*border: 0;/);
  assert.match(read("app/requests/page.tsx"), /note=\{requests\.length \? `Counted from/);
});
