import test from "node:test";
import assert from "node:assert/strict";
import { recordedIntake, SAMPLE_CASES } from "../lib/recorded-cases.ts";
import { frozenAddresses } from "../lib/demo.ts";
import { parseIntake } from "../lib/desk-intake.ts";

test("the recorded intake files every recorded wallet once, under a sample case reference", () => {
  const intake = recordedIntake();
  const parsed = parseIntake(intake.text);
  assert.equal(parsed.every((l) => l.ok), true, "every line is accepted by the desk's own parser");
  const wallets = parsed.map((l) => l.wallet);
  for (const a of frozenAddresses()) assert.ok(wallets.includes(a), `${a} is filed`);
  assert.equal(new Set(wallets).size, wallets.length, "no wallet twice");
  assert.equal(intake.wallets, wallets.length);
  for (const l of parsed) assert.ok(SAMPLE_CASES.includes(l.caseRef), "the case reference says it is a sample");
  assert.equal(intake.cases, new Set(parsed.map((l) => l.caseRef)).size);
  assert.ok(intake.cases >= 2, "more than one case, so the desk shows cases meeting at a VASP");
});

test("a recorded 0x wallet keeps its exact spelling and its chain", () => {
  const parsed = parseIntake(recordedIntake().text);
  const eth = parsed.filter((l) => /^0x/.test(l.wallet));
  assert.ok(eth.length > 0);
  for (const l of eth) assert.equal(l.chain, "ethereum");
});

test("one screened-only wallet is included, so the desk shows a chain NOIR does not trace", () => {
  const parsed = parseIntake(recordedIntake().text);
  assert.equal(parsed.filter((l) => l.traced === false).length, 1);
});
