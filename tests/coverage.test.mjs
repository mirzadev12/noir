import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COVERAGE, coverageCounts } from "../lib/coverage.ts";

const PS = readFileSync(new URL("../docs/PS-26182.md", import.meta.url), "utf8");

test("every item quotes the problem statement it answers", () => {
  for (const item of COVERAGE) {
    for (const phrase of item.ps) assert.ok(PS.toLowerCase().includes(phrase.toLowerCase()), `"${phrase}" is not in PS-26182`);
  }
});

test("every item has a status, a plain answer, and a place to see it or a route to it", () => {
  for (const item of COVERAGE) {
    assert.ok(["built", "partial", "not-built"].includes(item.status), item.id);
    assert.ok(item.answer.length > 20, item.id);
    if (item.status === "built") assert.ok(item.see, `${item.id} is built but names nowhere to see it`);
    else assert.ok(item.gap && item.gap.length > 20, `${item.id} must say what is missing`);
  }
  assert.equal(new Set(COVERAGE.map((i) => i.id)).size, COVERAGE.length);
});

test("counts are computed from the list", () => {
  const c = coverageCounts();
  assert.equal(c.total, COVERAGE.length);
  assert.equal(c.built + c.partial + c.notBuilt, c.total);
});

test("the checklist never claims SAHYOG is live or confidence is accuracy", () => {
  const text = JSON.stringify(COVERAGE).toLowerCase();
  assert.ok(!/integrated with sahyog|sahyog integration is live|% accura/.test(text));
});

test("every item has NOIR's own name for the capability, not a quotation", () => {
  for (const item of COVERAGE) {
    assert.ok(typeof item.name === "string" && item.name.length >= 8, `${item.id} needs a name`);
    assert.ok(!/["“”]/.test(item.name), `${item.id}: a name is not a quotation`);
  }
  assert.equal(new Set(COVERAGE.map((i) => i.name)).size, COVERAGE.length);
});
