import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByCase, vaspResponse } from "../lib/analytics.ts";
import { emptyDesk, fileWallets, setRecord } from "../lib/desk.ts";

const A = "TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN";
const B = "TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx";
const OFFICER = { id: "I4C-2291", unit: null, verified: false };
const at = (d) => `2026-09-${String(d).padStart(2, "0")}T10:00:00.000Z`;
let n = 0;
const id = () => `e_${++n}`;
const line = (wallet, caseRef) => ({ line: 1, ok: true, wallet, chain: "tron", traced: true, caseRef });
const record = (wallet, vasp) => ({
  wallet, chain: "tron", traced: true, readable: true,
  outbound: vasp ? { vasp, kind: "exchange_deposit", account: "TACC", confidence: 0.8, source: "heuristic", evidence: null, usdt: 10, txHashes: [] } : null,
  outboundStop: vasp ? null : "none-found",
  inbound: [], inboundLeads: [], inboundRead: "read", sanctioned: null,
  provenance: { generatedAt: at(1), basis: "live", apiCalls: 1, responseHashes: [] },
});

test("cases group their wallets, the VASPs reached and the requests that cover them", () => {
  const desk = emptyDesk();
  const [a] = fileWallets(desk, [line(A, "FIR-1")], OFFICER, at(1), id).added;
  const [b] = fileWallets(desk, [line(B, "FIR-2")], OFFICER, at(2), id).added;
  fileWallets(desk, [line(A, "FIR-2")], OFFICER, at(3), id);
  setRecord(desk, a.id, { record: record(A, "MEXC") }, at(3));
  setRecord(desk, b.id, { record: record(B, null) }, at(3));
  desk.requests.push({ id: "r_1", vasp: "MEXC", asks: ["kyc"], entryIds: [a.id],
    history: [{ status: "drafted", at: at(4), by: OFFICER, on: null, reference: null, note: null }] });

  const cases = groupByCase(desk);
  assert.deepEqual(cases.map((c) => c.caseRef), ["FIR-2", "FIR-1"]); // most recently filed first
  const fir2 = cases[0];
  assert.deepEqual(fir2.wallets.map((w) => w.wallet).sort(), [A, B].sort());
  assert.deepEqual(fir2.vasps, ["MEXC"]);
  assert.deepEqual(fir2.requests.map((r) => [r.id, r.status]), [["r_1", "drafted"]]);
  assert.equal(fir2.lastFiled, at(3));
});

test("wallets filed without a case reference form their own group", () => {
  const desk = emptyDesk();
  fileWallets(desk, [line(A, null)], OFFICER, at(1), id);
  assert.equal(groupByCase(desk)[0].caseRef, null);
});

test("VASP response counts requests and the days an answer took", () => {
  const h = (status, day, on = null) => ({ status, at: at(day), by: OFFICER, on, reference: null, note: null });
  const requests = [
    { id: "r1", vasp: "MEXC", asks: [], entryIds: [], history: [h("drafted", 1), h("sent", 2, "2026-09-02"), h("acknowledged", 5, "2026-09-06"), h("frozen", 9)] },
    { id: "r2", vasp: "mexc", asks: [], entryIds: [], history: [h("drafted", 1), h("sent", 2), h("data-received", 4)] },
    { id: "r3", vasp: "MEXC", asks: [], entryIds: [], history: [h("drafted", 1), h("sent", 2), h("no-response", 20)] },
    { id: "r4", vasp: "MEXC", asks: [], entryIds: [], history: [h("drafted", 1)] },
    { id: "r5", vasp: "Binance", asks: [], entryIds: [], history: [h("drafted", 1), h("sent", 3), h("refused", 4)] },
  ];
  const [mexc, binance] = vaspResponse(requests);
  assert.deepEqual(mexc, { vasp: "MEXC", drafted: 4, sent: 3, answered: 2, frozen: 1, refused: 0, noResponse: 1, medianDaysToAnswer: 3 });
  assert.equal(binance.refused, 1);
  assert.equal(binance.medianDaysToAnswer, 1);
});
