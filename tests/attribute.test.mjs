import { test } from "node:test";
import assert from "node:assert/strict";
import { attributeWallet } from "../lib/attribute.ts";

const W = "TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx";
const BTC = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const AT = "2026-09-14T08:00:00.000Z";

const node = (address, depth, taint, label = null) => ({
  address, depth, label, taintedValueUsdt: taint, taintFraction: 1, firstSeen: AT, outflowCount: 0,
});
const edge = (from, to, v, txHash) => ({ from, to, valueUsdt: v, txHash, timestamp: AT, dwellSeconds: null });
const lbl = (entity, kind, confidence = 0.8, source = "heuristic") => ({ entity, kind, confidence, source, evidence: "sweeps seen" });

function trace(nodes, edges) {
  return {
    caseId: "c", inputAddress: W, chain: "tron", reportedAmountUsdt: 0, fraudDate: AT,
    nodes: [node(W, 0, 100), ...nodes], edges, terminal: null, riskFlags: [], triage: "HOT", triageReason: "",
    provenance: { apiCalls: 4, responseHashes: ["t1", "t2"], generatedAt: AT },
  };
}
function payers(over = {}) {
  return {
    address: W, chain: "tron", readable: true, historyComplete: true, totalPaidUsdt: 0, payers: [], followed: 0, cap: 20,
    exchanges: [], provenance: { apiCalls: 2, responseHashes: ["p1"], generatedAt: AT }, ...over,
  };
}
const screen = () => ({ listing: null });
const deps = (t, p) => ({
  trace: async () => (t instanceof Error ? Promise.reject(t) : t),
  payers: async () => p,
  screen,
  recorded: () => null,
});

test("outbound names the exchange the money reached, with the account and its transfers", async () => {
  const t = trace(
    [node("TMID", 1, 100), node("TDEP", 2, 60.004, lbl("MEXC", "exchange_deposit")), node("TMIX", 2, 40, lbl("Mixer X", "mixer"))],
    [edge(W, "TMID", 100, "h0"), edge("TMID", "TDEP", 60, "h1"), edge("TMID", "TMIX", 40, "h2")],
  );
  const r = await attributeWallet(W, "tron", deps(t, payers()));
  assert.equal(r.readable, true);
  assert.equal(r.traced, true);
  const { route, ...outbound } = r.outbound;
  assert.deepEqual(route.map((s) => s.address), [W, "TMID", "TDEP"]);
  assert.deepEqual(outbound, {
    vasp: "MEXC", kind: "exchange_deposit", account: "TDEP", confidence: 0.8, source: "heuristic",
    evidence: "sweeps seen", usdt: 60, txHashes: ["h1"],
  });
  assert.equal(r.outboundStop, null);
  assert.equal(r.provenance.apiCalls, 6);
  assert.deepEqual(r.provenance.responseHashes, ["t1", "t2", "p1"]);
  assert.equal(r.provenance.basis, "live");
});

test("with no exchange reached, the stop is named from the path", async () => {
  const mixer = trace([node("TMIX", 1, 100, lbl("Mixer X", "mixer"))], [edge(W, "TMIX", 100, "h")]);
  assert.equal((await attributeWallet(W, "tron", deps(mixer, payers()))).outboundStop, "mixer");
  const none = trace([node("TMID", 1, 100)], [edge(W, "TMID", 100, "h")]);
  const r = await attributeWallet(W, "tron", deps(none, payers()));
  assert.equal(r.outbound, null);
  assert.equal(r.outboundStop, "none-found");
});

test("a wallet reached with no taint is not the exit", async () => {
  const t = trace([node("TDEP", 1, 0, lbl("OKX", "exchange_hot"))], [edge(W, "TDEP", 5, "h")]);
  assert.equal((await attributeWallet(W, "tron", deps(t, payers()))).outbound, null);
});

test("an unreadable wallet is stated as unreadable, never empty", async () => {
  const err = new Error("The chain could not be read for this address — throttled. No finding can be stated from an unread wallet.");
  const r = await attributeWallet(W, "tron", deps(err, payers()));
  assert.equal(r.readable, false);
  assert.equal(r.outbound, null);
  assert.equal(r.outboundStop, null);
  assert.deepEqual(r.inbound, []);
  assert.equal(r.inboundRead, "not-run");
});

test("any other failure is thrown, for the worker to record", async () => {
  await assert.rejects(attributeWallet(W, "tron", deps(new Error("socket hang up"), payers())), /socket/);
});

test("inbound files only our table's exchanges; explorer tags are leads", async () => {
  const t = trace([], []);
  const p = payers({
    payers: [
      { address: "TP1", label: null, paidUsdt: 30, transfers: 1, firstAt: AT, lastAt: AT, status: "read", partial: false,
        sources: [{ address: "THOT", label: lbl("Binance", "exchange_hot", 1, "ground_truth"), tags: [], usdt: 30 }] },
      { address: "TP2", label: lbl("OKX", "exchange_hot", 0.9, "ground_truth"), paidUsdt: 5, transfers: 1, firstAt: AT, lastAt: AT, status: "labelled", partial: false, sources: [] },
    ],
    exchanges: [
      { entity: "Binance", kind: "exchange_hot", via: "table", payers: 1, paidUsdt: 30 },
      { entity: "OKX", kind: "exchange_hot", via: "table", payers: 1, paidUsdt: 5 },
      { entity: "Somex", kind: "exchange_hot", via: "explorer", payers: 2, paidUsdt: 9 },
    ],
  });
  const r = await attributeWallet(W, "tron", deps(t, p));
  assert.equal(r.inboundRead, "read");
  assert.deepEqual(r.inbound, [
    { vasp: "Binance", kind: "exchange_hot", payers: 1, paidUsdt: 30, confidence: 1, source: "ground_truth" },
    { vasp: "OKX", kind: "exchange_hot", payers: 1, paidUsdt: 5, confidence: 0.9, source: "ground_truth" },
  ]);
  assert.deepEqual(r.inboundLeads, [{ tag: "Somex", payers: 2, paidUsdt: 9 }]);
});

test("unreadable payers are stated as such", async () => {
  const r = await attributeWallet(W, "tron", deps(trace([], []), payers({ readable: false })));
  assert.equal(r.inboundRead, "unreadable");
  assert.deepEqual(r.inbound, []);
});

test("Polygon inbound is not run: payers would read Ethereum history", async () => {
  let asked = false;
  const d = { ...deps(trace([], []), payers()), payers: async () => { asked = true; return payers(); } };
  const r = await attributeWallet("0x77fB78EAC2021Cd52097168873324d3F1200E275", "polygon", d);
  assert.equal(asked, false);
  assert.equal(r.inboundRead, "not-run");
});

test("untraced chains are screened only", async () => {
  const d = { ...deps(trace([], []), payers()), screen: () => ({ listing: { list: "OFAC SDN", entity: "X", program: null, assets: ["XBT"] } }) };
  const r = await attributeWallet(BTC, "bitcoin", d);
  assert.equal(r.traced, false);
  assert.equal(r.readable, true);
  assert.equal(r.outboundStop, null);
  assert.equal(r.inboundRead, "not-run");
  assert.equal(r.sanctioned.entity, "X");
});

test("a recorded case answers from file and says so", async () => {
  const t = trace([], []);
  const d = { ...deps(new Error("no network"), payers()), recorded: () => ({ trace: t, payers: payers() }) };
  const r = await attributeWallet(W, "tron", d);
  assert.equal(r.provenance.basis, "recorded");
  assert.equal(r.provenance.generatedAt, AT);
});

test("a recorded trace without recorded payers leaves inbound not run", async () => {
  const d = { ...deps(new Error("no network"), payers()), recorded: () => ({ trace: trace([], []), payers: null }) };
  assert.equal((await attributeWallet(W, "tron", d)).inboundRead, "not-run");
});

test("the route runs from the wallet to the account along the largest share", async () => {
  const t = trace(
    [
      node("TMID", 1, 70),
      node("TSIDE", 1, 30),
      node("TDEP", 2, 60, lbl("MEXC", "exchange_deposit")),
    ],
    [edge(W, "TMID", 70, "h0"), edge(W, "TSIDE", 30, "h1"), edge("TSIDE", "TDEP", 20, "h2"), edge("TMID", "TDEP", 40, "h3")],
  );
  const r = await attributeWallet(W, "tron", deps(t, payers()));
  assert.deepEqual(r.outbound.route, [
    { address: W, depth: 0, label: null, usdt: 100 },
    { address: "TMID", depth: 1, label: null, usdt: 70 },
    { address: "TDEP", depth: 2, label: { entity: "MEXC", kind: "exchange_deposit" }, usdt: 60 },
  ]);
});

test("typologies are the trace's own flags, verbatim", async () => {
  const t = { ...trace([], []), riskFlags: [{ code: "SHORT_DWELL", reason: "Forwarded within 4 minutes", atAddress: W }] };
  const r = await attributeWallet(W, "tron", deps(t, payers()));
  assert.deepEqual(r.typologies, [{ code: "SHORT_DWELL", reason: "Forwarded within 4 minutes", at: W }]);
});
