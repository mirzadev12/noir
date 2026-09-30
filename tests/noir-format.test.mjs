import { test } from "node:test";
import assert from "node:assert/strict";
import { chainName, evidenceWord, shortAddress, tierName, usdt, utc, utcDay } from "../lib/noir-format.ts";

test("times are UTC and absolute", () => {
  assert.equal(utc("2026-09-14T08:02:59.000Z"), "14 Sep 2026, 08:02 UTC");
  assert.equal(utcDay("2026-09-14T23:59:00.000Z"), "14 Sep 2026");
  assert.equal(utc("not a date"), "—");
});

test("USDT is grouped, two decimals, never converted", () => {
  assert.equal(usdt(1131.72), "1,131.72 USDT");
  assert.equal(usdt(290), "290.00 USDT");
  assert.equal(usdt(0.004), "0.00 USDT");
});

test("addresses shorten from the middle", () => {
  assert.equal(shortAddress("TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN"), "TX1so3…B2MN");
  assert.equal(shortAddress("0x77fB78EAC2021Cd52097168873324d3F1200E275"), "0x77fB78…E275");
});

test("confidence reads as evidence seen, never as accuracy", () => {
  assert.equal(evidenceWord(0.95), "Strong evidence");
  assert.equal(evidenceWord(0.8), "Moderate evidence");
  assert.equal(evidenceWord(0.56), "Limited evidence");
  for (const c of [0.1, 0.5, 0.99]) assert.doesNotMatch(evidenceWord(c), /%|accura|probab/i);
});

test("tiers and chains have their names", () => {
  assert.equal(tierName("ground_truth"), "Explorer-tagged");
  assert.equal(tierName("heuristic"), "Derived by sweep heuristic");
  assert.equal(tierName("sanctions"), "OFAC SDN list");
  assert.equal(chainName("tron"), "TRON");
  assert.equal(chainName("polygon"), "Polygon");
  assert.equal(chainName("bitcoin"), "Bitcoin");
});
