import { test } from "node:test";
import assert from "node:assert/strict";
import { boardCounts, boardRows, filterBoard, stageOf } from "../lib/desk-board.ts";

const at = "2026-09-29T10:00:00.000Z";
const by = { id: "I4C-1", unit: null, verified: false };
const h = (status, on = null) => ({ status, at, by, on, reference: null, note: null });
const wallet = (entryId, wallet, direction, usdt) => ({
  entryId, wallet, chain: "tron", direction, caseRefs: ["C-1"], account: direction === "outbound" ? "TACC" : null,
  usdt, confidence: 0.8, source: "heuristic", evidence: null, txHashes: [],
});
const row = (vasp, wallets, request = null, extra = {}) => ({
  vasp, fiu: null, le: null, wallets, caseRefs: ["C-1"],
  outboundUsdt: wallets.filter((w) => w.direction === "outbound").reduce((s, w) => s + w.usdt, 0),
  inboundUsdt: wallets.filter((w) => w.direction === "inbound").reduce((s, w) => s + w.usdt, 0),
  canFreeze: wallets.some((w) => w.direction === "outbound"), request, uncoveredEntryIds: [], ...extra,
});
const req = (...statuses) => ({ id: "r_1", vasp: "X", asks: ["kyc"], entryIds: [], history: statuses.map((s) => h(s, s === "sent" ? "2026-09-29" : null)) });

test("a request's stage is what the officer does next", () => {
  assert.equal(stageOf(null), "none");
  assert.equal(stageOf(req("drafted")), "drafted");
  assert.equal(stageOf(req("drafted", "sent")), "awaiting");
  assert.equal(stageOf(req("drafted", "sent", "no-response")), "awaiting");
  assert.equal(stageOf(req("drafted", "sent", "acknowledged")), "answered");
  assert.equal(stageOf(req("drafted", "sent", "frozen")), "answered");
  assert.equal(stageOf(req("drafted", "sent", "refused")), "answered");
});

test("board rows count each wallet once per direction and carry what search needs", () => {
  const [r] = boardRows([
    row("MEXC", [wallet("e1", "TAAA", "outbound", 10), wallet("e2", "TBBB", "inbound", 5), wallet("e1", "TAAA", "inbound", 1)], req("drafted", "sent"), { uncoveredEntryIds: ["e2"] }),
  ]);
  assert.equal(r.vasp, "MEXC");
  assert.equal(r.outbound, 1);
  assert.equal(r.inbound, 2);
  assert.equal(r.wallets, 2);
  assert.equal(r.stage, "awaiting");
  assert.equal(r.status, "sent");
  assert.equal(r.sentOn, "2026-09-29");
  assert.equal(r.filedSince, 1);
  assert.deepEqual(r.search, ["mexc", "taaa", "tbbb"]);
});

test("filters and search narrow the board; counts are per stage", () => {
  const rows = boardRows([
    row("MEXC", [wallet("e1", "TAAA", "outbound", 10)]),
    row("Binance", [wallet("e2", "TBBB", "outbound", 10)], req("drafted", "sent")),
    row("OKX", [wallet("e3", "0xAbC", "inbound", 1)], req("drafted", "sent", "frozen")),
  ]);
  assert.deepEqual(boardCounts(rows), { all: 3, none: 1, drafted: 0, awaiting: 1, answered: 1 });
  assert.deepEqual(filterBoard(rows, "none", "").map((r) => r.vasp), ["MEXC"]);
  assert.deepEqual(filterBoard(rows, "all", "bin").map((r) => r.vasp), ["Binance"]);
  assert.deepEqual(filterBoard(rows, "all", " 0XABC ").map((r) => r.vasp), ["OKX"]);
  assert.deepEqual(filterBoard(rows, "answered", "mexc"), []);
});
