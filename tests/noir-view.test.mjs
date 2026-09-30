import { test } from "node:test";
import assert from "node:assert/strict";
import { caseRefsOf, deskTotals, eventTime, isSanctioned, monoParts, nextVasp, sentAndAnswered, statusOf, uncoveredCount, walletCounts } from "../lib/noir-view.ts";

const actor = { id: "I4C-2291", unit: "Cyber Crime Cell", verified: false };
const wallet = (entryId, direction) => ({ entryId, wallet: `W-${entryId}`, chain: "tron", direction, caseRefs: [], account: null, usdt: 1, confidence: 0.9, source: "heuristic", evidence: null, txHashes: [] });
const row = (vasp, wallets, request = null, uncoveredEntryIds = []) => ({ vasp, fiu: null, le: null, wallets, caseRefs: [], outboundUsdt: 0, inboundUsdt: 0, canFreeze: true, request, uncoveredEntryIds });
const change = (status, extra = {}) => ({ status, at: "2026-09-14T08:02:00.000Z", by: actor, on: null, reference: null, note: null, ...extra });
const request = (...statuses) => ({ id: "r_1", vasp: "X", asks: ["kyc"], entryIds: [], history: statuses.map((s) => change(s)) });

test("a wallet routed both ways is one wallet, in two directions", () => {
  const r = row("MEXC", [wallet("a", "outbound"), wallet("a", "inbound"), wallet("b", "outbound")]);
  assert.deepEqual(walletCounts(r), { wallets: 2, outbound: 2, inbound: 1 });
});

test("uncovered wallets: all of them with no request, only the later ones with one", () => {
  const ws = [wallet("a", "outbound"), wallet("b", "outbound"), wallet("c", "inbound")];
  assert.equal(uncoveredCount(row("X", ws)), 3);
  assert.equal(uncoveredCount(row("X", ws, request("drafted"), ["c"])), 1);
  assert.equal(uncoveredCount(row("X", ws, request("drafted"), [])), 0);
});

test("the next VASP is the one with the most wallets no request covers", () => {
  const big = row("Bigger", [wallet("a", "outbound"), wallet("b", "outbound"), wallet("c", "outbound")]);
  const covered = row("Covered", [wallet("d", "outbound"), wallet("e", "outbound"), wallet("f", "outbound"), wallet("g", "outbound")], request("drafted"), []);
  const small = row("Small", [wallet("h", "outbound")]);
  const next = nextVasp([covered, small, big]);
  assert.equal(next.row.vasp, "Bigger");
  assert.equal(next.uncovered, 3);
  // A request drafted earlier does not hide wallets filed after it.
  const later = row("Later", [wallet("i", "outbound"), wallet("j", "outbound"), wallet("k", "outbound"), wallet("l", "outbound"), wallet("m", "outbound")], request("sent"), ["l", "m"]);
  assert.equal(nextVasp([big, later]).row.vasp, "Bigger");
  assert.equal(nextVasp([covered]), null, "every wallet is covered");
  assert.equal(nextVasp([]), null);
});

test("ties go to the row with more wallets, then to the name", () => {
  const a = row("Alpha", [wallet("a", "outbound"), wallet("b", "inbound")]);
  const b = row("Beta", [wallet("c", "outbound"), wallet("d", "inbound")]);
  assert.equal(nextVasp([b, a]).row.vasp, "Alpha");
});

test("desk totals count every wallet wherever it sits, and every case once", () => {
  const entry = (id, refs) => ({ id, wallet: id, chain: "tron", filings: refs.map((caseRef) => ({ caseRef, by: actor, at: "2026-09-14T08:02:00.000Z" })), status: "pending", record: null, error: null, attributedAt: null });
  const r = row("MEXC", [wallet("a", "outbound"), wallet("a", "inbound")]);
  r.caseRefs = ["FIR 1"];
  const view = { rows: [r], pending: [entry("p", ["FIR 2"])], unreadable: [entry("u", [])], screenedOnly: [], failed: [entry("f", ["FIR 1", "FIR 3"])], unrouted: [] };
  assert.deepEqual(deskTotals(view), { wallets: 4, cases: 3, vasps: 1, awaiting: 0 });
  view.rows[0].request = request("drafted", "sent");
  assert.equal(deskTotals(view).awaiting, 1);
});

test("case references are distinct and in the order filed", () => {
  const filings = ["FIR 2", null, "FIR 1", "FIR 2"].map((caseRef) => ({ caseRef, by: actor, at: "x" }));
  assert.deepEqual(caseRefsOf({ filings }), ["FIR 2", "FIR 1"]);
});

test("an OFAC mark shows for the wallet's own listing and for a trail that ended at one", () => {
  assert.equal(isSanctioned({ record: null }), false);
  assert.equal(isSanctioned({ record: { sanctioned: null, outboundStop: null } }), false);
  assert.equal(isSanctioned({ record: { sanctioned: { list: "OFAC SDN" }, outboundStop: null } }), true);
  assert.equal(isSanctioned({ record: { sanctioned: null, outboundStop: "sanctioned" } }), true);
  assert.equal(isSanctioned({ record: { sanctioned: null, outboundStop: "mixer" } }), false);
});

test("sent and answered come from the request's own history", () => {
  const r = request("drafted", "sent", "acknowledged", "frozen");
  const { sent, answer } = sentAndAnswered(r);
  assert.equal(sent.status, "sent");
  assert.equal(answer.status, "acknowledged");
  assert.equal(statusOf(r), "frozen");
  assert.deepEqual(sentAndAnswered(request("drafted")), { sent: null, answer: null });
  assert.equal(sentAndAnswered(request("drafted", "sent", "no-response")).answer, null, "no response is not an answer");
});

test("an event is dated by the officer's day when given, else by the recorded UTC moment", () => {
  assert.equal(eventTime(change("sent", { on: "2026-09-29" })), "29 Sep 2026");
  assert.equal(eventTime(change("sent")), "14 Sep 2026, 08:02 UTC");
});

test("a long value breaks into even parts that join back to the value, never a stray character", () => {
  const tron = "TRWDtgCfXzTcMv8W6iJxh6umeqeF3zG7n5"; // 34
  const evm = "0x77fB78EAC2021Cd52097168873324d3F1200E275"; // 42
  const hash = "c0933b48b8956dbc571c9379926f0398d2c4c84b41f9b7e78b0008e431c7384e"; // 64
  for (const v of [tron, evm, hash, "short", "x".repeat(49), "y".repeat(65)]) {
    assert.equal(monoParts(v).join(""), v, v);
  }
  assert.deepEqual(monoParts("FIR 14/2026"), ["FIR 14/2026"], "a short reference is one piece");
  assert.deepEqual(monoParts(evm).map((p) => p.length), [21, 21]);
  assert.deepEqual(monoParts(hash).map((p) => p.length), [16, 16, 16, 16]);
  for (const v of [tron, evm, hash]) {
    const sizes = monoParts(v).map((p) => p.length);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `${v} parts are even`);
  }
});

test("an unreadable wallet says which read was last and whether another is coming", async () => {
  const { retryLine } = await import("../lib/noir-view.ts");
  const at = "2026-09-30T08:01:00.000Z";
  assert.equal(retryLine({ attributedAt: null }, 3), "Not yet read");
  assert.equal(retryLine({ attributedAt: at }, 3), "Tried 30 Sep 2026, 08:01 UTC", "an entry written before retries existed says only when");
  assert.equal(retryLine({ attributedAt: at, attempts: 1, retryAt: "2026-09-30T08:01:30.000Z" }, 3), "Tried 30 Sep 2026, 08:01 UTC (1 of 3). NOIR reads it again at 30 Sep 2026, 08:01 UTC.");
  assert.equal(retryLine({ attributedAt: at, attempts: 2, retryAt: "2026-09-30T08:03:00.000Z" }, 3), "Tried 30 Sep 2026, 08:01 UTC (2 of 3). NOIR reads it again at 30 Sep 2026, 08:03 UTC.");
  assert.equal(retryLine({ attributedAt: at, attempts: 3, retryAt: null }, 3), "Tried 30 Sep 2026, 08:01 UTC (3 of 3). NOIR will not read it again by itself.");
  assert.equal(retryLine({ attributedAt: at, attempts: 1, retryAt: null }, 3), "Tried 30 Sep 2026, 08:01 UTC (1 of 3).");
});
