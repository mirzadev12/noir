import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDesk, fileWallets, groupByVasp, markPending, removeEntry, setRecord, vaspKey } from "../lib/desk.ts";

const TRON_A = "TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN";
const TRON_B = "TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx";
const ETH_A = "0x77fB78EAC2021Cd52097168873324d3F1200E275";
const OFFICER = { id: "I4C-2291", unit: "Cyber Crime Cell, Bengaluru", verified: false };
const NOW = "2026-09-29T10:00:00.000Z";
let n = 0;
const id = () => `e_${String(++n).padStart(12, "0")}`;
const line = (wallet, chain, caseRef = null) => ({ line: 1, ok: true, wallet, chain, traced: true, caseRef });

function record(wallet, chain, over = {}) {
  return {
    wallet, chain, traced: true, readable: true,
    outbound: null, outboundStop: "none-found", inbound: [], inboundLeads: [], inboundRead: "read",
    sanctioned: null,
    provenance: { generatedAt: NOW, basis: "live", apiCalls: 3, responseHashes: ["a".repeat(64)] },
    ...over,
  };
}
const out = (vasp, account, usdt) => ({
  outbound: { vasp, kind: "exchange_deposit", account, confidence: 0.8, source: "heuristic", evidence: "12 sweeps", usdt, txHashes: ["h1"] },
  outboundStop: null,
});
const inb = (vasp, payers, paidUsdt) => ({ vasp, kind: "exchange_hot", payers, paidUsdt, confidence: 1, source: "ground_truth" });

test("filing twice merges case refs into one entry", () => {
  const desk = emptyDesk();
  const a = fileWallets(desk, [line(TRON_A, "tron", "C-1")], OFFICER, NOW, id);
  const b = fileWallets(desk, [line(TRON_A, "tron", "C-2")], OFFICER, NOW, id);
  assert.equal(a.added.length, 1);
  assert.equal(b.added.length, 0);
  assert.equal(b.merged.length, 1);
  assert.equal(desk.entries.length, 1);
  assert.deepEqual(desk.entries[0].filings.map((f) => f.caseRef), ["C-1", "C-2"]);
  assert.equal(desk.entries[0].status, "pending");
});

test("EVM addresses compare case-insensitively, per chain", () => {
  const desk = emptyDesk();
  fileWallets(desk, [line(ETH_A, "ethereum")], OFFICER, NOW, id);
  fileWallets(desk, [line(ETH_A.toLowerCase(), "ethereum")], OFFICER, NOW, id);
  fileWallets(desk, [line(ETH_A, "polygon")], OFFICER, NOW, id);
  assert.equal(desk.entries.length, 2);
});

test("setRecord derives the status from the record", () => {
  const desk = emptyDesk();
  const [e] = fileWallets(desk, [line(TRON_A, "tron")], OFFICER, NOW, id).added;
  setRecord(desk, e.id, { record: record(TRON_A, "tron", { readable: false, outboundStop: null, inboundRead: "not-run" }) }, NOW);
  assert.equal(desk.entries[0].status, "unreadable");
  setRecord(desk, e.id, { error: "boom" }, NOW);
  assert.equal(desk.entries[0].status, "failed");
  assert.equal(desk.entries[0].error, "boom");
  markPending(desk, e.id);
  assert.equal(desk.entries[0].status, "pending");
  assert.equal(removeEntry(desk, e.id)?.id, e.id);
  assert.equal(desk.entries.length, 0);
});

test("groupByVasp files a wallet under both directions and sums per direction", () => {
  const desk = emptyDesk();
  const [a] = fileWallets(desk, [line(TRON_A, "tron", "C-1")], OFFICER, NOW, id).added;
  const [b] = fileWallets(desk, [line(TRON_B, "tron", "C-2")], OFFICER, NOW, id).added;
  setRecord(desk, a.id, { record: record(TRON_A, "tron", { ...out("MEXC", "TACCT", 100.005), inbound: [inb("Binance", 2, 40)] }) }, NOW);
  setRecord(desk, b.id, { record: record(TRON_B, "tron", { ...out("mexc", "TACCT2", 50) }) }, NOW);
  const view = groupByVasp(desk);
  assert.deepEqual(view.rows.map((r) => r.vasp), ["MEXC", "Binance"]);
  const mexc = view.rows[0];
  assert.equal(mexc.wallets.length, 2);
  assert.deepEqual(mexc.caseRefs, ["C-1", "C-2"]);
  assert.equal(mexc.outboundUsdt, 150.01);
  assert.equal(mexc.canFreeze, true);
  const binance = view.rows[1];
  assert.equal(binance.wallets[0].direction, "inbound");
  assert.equal(binance.inboundUsdt, 40);
  assert.equal(binance.canFreeze, false);
});

test("explorer leads never make a row; unreadable, screened and unrouted are listed apart", () => {
  const desk = emptyDesk();
  const [a] = fileWallets(desk, [line(TRON_A, "tron")], OFFICER, NOW, id).added;
  const [b] = fileWallets(desk, [line(TRON_B, "tron")], OFFICER, NOW, id).added;
  fileWallets(desk, [line(ETH_A, "ethereum")], OFFICER, NOW, id);
  setRecord(desk, a.id, { record: record(TRON_A, "tron", { inboundLeads: [{ tag: "Some Exchange 3", payers: 1, paidUsdt: 5 }] }) }, NOW);
  setRecord(desk, b.id, { record: record(TRON_B, "tron", { readable: false, outboundStop: null, inboundRead: "not-run" }) }, NOW);
  const view = groupByVasp(desk);
  assert.equal(view.rows.length, 0);
  assert.equal(view.unrouted.length, 1);
  assert.equal(view.unreadable.length, 1);
  assert.equal(view.pending.length, 1);
});

test("row carries the latest request and the entries it does not cover", () => {
  const desk = emptyDesk();
  const [a] = fileWallets(desk, [line(TRON_A, "tron")], OFFICER, NOW, id).added;
  const [b] = fileWallets(desk, [line(TRON_B, "tron")], OFFICER, NOW, id).added;
  setRecord(desk, a.id, { record: record(TRON_A, "tron", out("MEXC", "T1", 1)) }, NOW);
  setRecord(desk, b.id, { record: record(TRON_B, "tron", out("MEXC", "T2", 1)) }, NOW);
  desk.requests.push({ id: "r_1", vasp: "MEXC", asks: ["kyc"], entryIds: [a.id], history: [{ status: "drafted", at: NOW, by: OFFICER, on: null, reference: null, note: null }] });
  const [row] = groupByVasp(desk).rows;
  assert.equal(row.request.id, "r_1");
  assert.deepEqual(row.uncoveredEntryIds, [b.id]);
});

test("vaspKey ignores case and punctuation", () => {
  assert.equal(vaspKey("Gate.io"), vaspKey("gateio"));
});
