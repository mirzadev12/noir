import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIntake, MAX_INTAKE_LINES } from "../lib/desk-intake.ts";

const TRON_A = "TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN";
const ETH_A = "0x77fB78EAC2021Cd52097168873324d3F1200E275";
const BTC_A = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

test("one address per line, batch case ref fills blanks", () => {
  const out = parseIntake(`${TRON_A}\n\n# note\n${ETH_A}`, "FIR 12/2026");
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { line: 1, ok: true, wallet: TRON_A, chain: "tron", traced: true, caseRef: "FIR 12/2026" });
  assert.equal(out[1].line, 4);
  assert.equal(out[1].chain, "ethereum");
});

test("csv with header, any column order, tab or semicolon", () => {
  const csv = `Case Ref;Wallet;Network\nC-1;${ETH_A.toLowerCase()};polygon\nC-2;${TRON_A};`;
  const out = parseIntake(csv, "BATCH");
  assert.equal(out.length, 2);
  assert.equal(out[0].ok && out[0].chain, "polygon");
  assert.equal(out[0].ok && out[0].wallet, ETH_A); // canonical EIP-55 spelling
  assert.equal(out[0].ok && out[0].caseRef, "C-1");
  assert.equal(out[1].ok && out[1].caseRef, "C-2");
});

test("untraced chains are accepted as screened-only", () => {
  const [line] = parseIntake(BTC_A);
  assert.equal(line.ok, true);
  assert.equal(line.chain, "bitcoin");
  assert.equal(line.traced, false);
});

test("bad lines are refused with a reason and a line number", () => {
  const out = parseIntake(`T123\nhello`);
  assert.equal(out.length, 2);
  assert.equal(out[0].ok, false);
  assert.equal(out[0].line, 1);
  assert.match(out[0].reason, /\S/);
  assert.equal(out[1].raw, "hello");
});

test("a wallet repeated within one paste is filed once per case, and a plain repeat is refused by line", () => {
  const out = parseIntake(`${TRON_A},,C-1\n${TRON_A},,C-2\n${TRON_A},,C-1`);
  assert.deepEqual(out.filter((l) => l.ok).map((l) => l.caseRef), ["C-1", "C-2"]);
  assert.equal(out[2].ok, false);
  assert.match(out[2].reason, /same wallet as line 1/);
});

test("polygon asked for a TRON address is refused", () => {
  const [line] = parseIntake(`${TRON_A},polygon`);
  assert.equal(line.ok, false);
});

test("too many lines are refused past the limit", () => {
  const out = parseIntake(Array(MAX_INTAKE_LINES + 1).fill(TRON_A).join("\n"));
  assert.ok(out.some((l) => !l.ok && /limit|at most/i.test(l.reason)));
});
