// L4 — filing validation: a malformed or repeated line is refused at its own
// line number with a reason that says what is wrong with that line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIntake, MAX_INTAKE_LINES } from "../lib/desk-intake.ts";

const TRON_A = "TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN";
const TRON_B = "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex";
const ETH_A = "0x77fB78EAC2021Cd52097168873324d3F1200E275";
const HASH = "a".repeat(64);

const refused = (out) => out.filter((l) => !l.ok);
const accepted = (out) => out.filter((l) => l.ok);

test("a repeated wallet is refused at its own line, naming the line it repeats", () => {
  const out = parseIntake(`${TRON_A}\n${TRON_B}\n${TRON_A}`);
  assert.deepEqual(accepted(out).map((l) => l.line), [1, 2]);
  assert.deepEqual(refused(out), [{ line: 3, ok: false, raw: TRON_A, reason: "The same wallet as line 1; it is filed once." }]);
});

test("an EVM address repeated in another spelling is the same wallet", () => {
  const out = parseIntake(`${ETH_A}\n${ETH_A.toLowerCase()}`);
  assert.equal(accepted(out).length, 1);
  assert.match(refused(out)[0].reason, /^The same wallet as line 1/);
});

test("the same string on another chain is another wallet, not a repeat", () => {
  const out = parseIntake(`${ETH_A},ethereum\n${ETH_A},polygon`);
  assert.deepEqual(accepted(out).map((l) => l.chain), ["ethereum", "polygon"]);
  assert.equal(refused(out).length, 0);
});

test("a wallet listed under two different cases is filed under both", () => {
  const out = parseIntake(`${TRON_A},,Case 1\n${TRON_A},,Case 2\n${TRON_A},,Case 1`);
  assert.deepEqual(accepted(out).map((l) => [l.line, l.caseRef]), [[1, "Case 1"], [2, "Case 2"]]);
  assert.deepEqual(refused(out).map((l) => [l.line, l.reason]), [[3, "The same wallet as line 1, under the same case; it is filed once."]]);
});

test("a repeat that carries the only case reference gives it to the first line", () => {
  const out = parseIntake(`${TRON_A}\n${TRON_A},,Case 7`);
  assert.equal(accepted(out).length, 1);
  assert.equal(accepted(out)[0].caseRef, "Case 7", "the first line stands, with the case reference the repeat gave");
  assert.equal(refused(out)[0].reason, "The same wallet as line 1; it is filed once, under the case reference given here.");
});

test("a transaction hash is called one", () => {
  for (const text of [HASH, `0x${HASH}`]) {
    const [line] = parseIntake(text);
    assert.equal(line.ok, false);
    assert.equal(line.reason, "This is a transaction hash, not a wallet address. File the wallet that sent or received it.");
  }
});

test("a link, a name and an address with a space in it each say what they are", () => {
  const out = parseIntake(["https://tronscan.org/#/address/" + TRON_A, "vitalik.eth", "TX1so33jdGd8JkYD7 JVB6q1i4QUDhPB2MN"].join("\n"));
  assert.deepEqual(out.map((l) => l.ok), [false, false, false]);
  assert.equal(out[0].reason, "This is a link, not an address. Paste the address itself.");
  assert.equal(out[1].reason, "This is a name, not an address. Paste the 0x address it resolves to.");
  assert.equal(out[2].reason, "An address has no spaces in it. Separate columns with a comma, a tab or a semicolon.");
});

test("a wrong length and a wrong checksum say which", () => {
  const short = parseIntake(TRON_A.slice(0, 30))[0];
  assert.match(short.reason, /34 characters.*30/);
  const typo = parseIntake(TRON_A.slice(0, -1) + (TRON_A.endsWith("N") ? "M" : "N"))[0];
  assert.match(typo.reason, /Checksum does not match/);
  const evmShort = parseIntake(ETH_A.slice(0, 40))[0];
  assert.match(evmShort.reason, /42 characters.*40/);
});

test("every refusal keeps its line number over blank lines, comments and a header", () => {
  const out = parseIntake(["address,chain,case", "", "# the first two", `${TRON_A},tron,K`, "nonsense", `${TRON_A},tron,K`].join("\n"));
  assert.deepEqual(out.map((l) => [l.line, l.ok]), [[4, true], [5, false], [6, false]]);
  assert.equal(out[2].raw, `${TRON_A},tron,K`, "a refused line shows the text as typed");
});

test("the limits stand: 500 lines a filing, counted over repeats too", () => {
  const out = parseIntake(Array(MAX_INTAKE_LINES + 1).fill(TRON_A).join("\n"));
  assert.equal(MAX_INTAKE_LINES, 500);
  assert.equal(accepted(out).length, 1);
  assert.ok(refused(out).some((l) => /At most 500 lines/.test(l.reason)));
});
