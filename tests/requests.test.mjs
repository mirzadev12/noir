import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDesk, fileWallets, groupByVasp, setRecord } from "../lib/desk.ts";
import { allowedAsks, buildLetter, changeStatus, currentStatus, draftRequest } from "../lib/requests.ts";

const TRON_A = "TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN";
const OFFICER = { id: "I4C-2291", unit: "Cyber Crime Cell, Bengaluru", verified: false };
const NOW = "2026-09-29T10:00:00.000Z";
let n = 0;
const id = () => `x_${++n}`;

function deskWith(outbound) {
  const desk = emptyDesk();
  const [e] = fileWallets(desk, [{ line: 1, ok: true, wallet: TRON_A, chain: "tron", traced: true, caseRef: "C-1" }], OFFICER, NOW, id).added;
  setRecord(desk, e.id, { record: {
    wallet: TRON_A, chain: "tron", traced: true, readable: true,
    outbound: outbound ? { vasp: "CoinDCX", kind: "exchange_deposit", account: "TACCT", confidence: 0.9, source: "heuristic", evidence: null, usdt: 10, txHashes: [] } : null,
    outboundStop: outbound ? null : "none-found",
    inbound: outbound ? [] : [{ vasp: "CoinDCX", kind: "exchange_hot", payers: 1, paidUsdt: 5, confidence: 1, source: "ground_truth" }],
    inboundLeads: [], inboundRead: "read", sanctioned: null,
    provenance: { generatedAt: NOW, basis: "live", apiCalls: 1, responseHashes: [] },
  } }, NOW);
  return desk;
}

test("freeze is allowed only with an outbound account", () => {
  assert.ok(allowedAsks(groupByVasp(deskWith(true)).rows[0]).includes("freeze"));
  assert.ok(!allowedAsks(groupByVasp(deskWith(false)).rows[0]).includes("freeze"));
});

test("drafting validates asks and snapshots the row's entries", () => {
  const desk = deskWith(false);
  assert.equal(draftRequest(desk, "CoinDCX", ["freeze"], OFFICER, NOW, id).ok, false);
  assert.equal(draftRequest(desk, "CoinDCX", [], OFFICER, NOW, id).ok, false);
  assert.equal(draftRequest(desk, "Nowhere", ["kyc"], OFFICER, NOW, id).ok, false);
  const r = draftRequest(desk, "coindcx", ["kyc", "kyc", "preservation"], OFFICER, NOW, id);
  assert.equal(r.ok, true);
  assert.deepEqual(r.request.asks, ["kyc", "preservation"]); // deduped, in ASKS order
  assert.equal(r.request.vasp, "CoinDCX");
  assert.equal(r.request.entryIds.length, 1);
  assert.equal(currentStatus(r.request), "drafted");
});

test("status must go drafted → sent → any answer", () => {
  const desk = deskWith(true);
  const { request } = draftRequest(desk, "CoinDCX", ["kyc", "freeze"], OFFICER, NOW, id);
  assert.equal(changeStatus(request, { status: "frozen" }, OFFICER, NOW).ok, false);
  assert.equal(changeStatus(request, { status: "sent", on: "2026-09-29", reference: " SAH/1 " }, OFFICER, NOW).ok, true);
  assert.equal(request.history[1].reference, "SAH/1");
  assert.equal(changeStatus(request, { status: "drafted" }, OFFICER, NOW).ok, false);
  assert.equal(changeStatus(request, { status: "acknowledged", on: "29-09-2026" }, OFFICER, NOW).ok, false);
  assert.equal(changeStatus(request, { status: "acknowledged" }, OFFICER, NOW).ok, true);
  assert.equal(changeStatus(request, { status: "frozen", note: "" }, OFFICER, NOW).ok, true);
  assert.equal(request.history.at(-1).note, null);
  assert.equal(currentStatus(request), "frozen");
});

test("the letter prints no statute and addresses the FIU legal name", () => {
  const desk = deskWith(true);
  const row = groupByVasp(desk).rows[0];
  const letter = buildLetter(row, null, NOW);
  assert.equal(letter.legalBasis, "");
  assert.equal(letter.addressee, row.fiu ? row.fiu.legalName : "CoinDCX");
  assert.ok(row.fiu, "CoinDCX is in the FIU-IND annexure");
  assert.deepEqual(letter.asks, allowedAsks(row));
  assert.equal(JSON.stringify(letter).match(/Section|Act,|BNSS|CrPC|PMLA/), null);
});

test("the request package is machine-readable, carries no statute and says SAHYOG is not integrated", async () => {
  const { requestPackage } = await import("../lib/requests.ts");
  const desk = deskWith(true);
  const { request } = draftRequest(desk, "CoinDCX", ["kyc", "freeze"], OFFICER, NOW, id);
  const row = groupByVasp(desk).rows[0];
  const pkg = requestPackage(buildLetter(row, request, NOW), request);
  assert.equal(pkg.schema, "noir-request-v1");
  assert.equal(pkg.sahyog, "designed, not integrated");
  assert.equal(pkg.request.id, request.id);
  assert.equal(pkg.request.status, "drafted");
  assert.deepEqual(pkg.asks.map((a) => a.code), ["kyc", "freeze"]);
  assert.equal(pkg.asks[0].text, "Identity (KYC) of the account holder");
  assert.equal(pkg.addressee.legalName, "Neblio Technologies Private Limited");
  assert.equal(pkg.legalBasis, "");
  assert.equal(pkg.accounts.length, 1);
  assert.equal(pkg.accounts[0].wallet, TRON_A);
  assert.equal(JSON.stringify(pkg).match(/Section|BNSS|CrPC|PMLA/), null);
});
