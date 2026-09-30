// The trace graph is drawn from the attribution record alone, so it can never
// say more than the record does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeGraph, traceGraphOf } from "../lib/trace-graph.ts";
import { listedContact } from "../lib/listed-contact.ts";
import { attributeWallet } from "../lib/attribute.ts";
import { frozenTrace } from "../lib/demo.ts";
import payers from "../data/demo-payers.json" with { type: "json" };

const offline = () => Promise.reject(new Error("offline"));
const recorded = (wallet, chain = "tron") =>
  attributeWallet(wallet, chain, {
    recorded: () => ({ trace: frozenTrace(wallet, chain).trace, payers: payers.cases[`${chain}:${chain === "tron" ? wallet : wallet.toLowerCase()}`] ?? null }),
    trace: offline,
    payers: offline,
  });

const base = (over = {}) => ({
  wallet: "TWallet",
  chain: "tron",
  traced: true,
  readable: true,
  outbound: null,
  outboundStop: "none-found",
  inbound: [],
  inboundLeads: [],
  inboundRead: "read",
  sanctioned: null,
  provenance: { generatedAt: "2026-09-30T00:00:00.000Z", basis: "live", apiCalls: 1, responseHashes: [] },
  ...over,
});
const outbound = (route, over = {}) => ({ vasp: "MEXC", kind: "exchange_deposit", account: route.at(-1).address, confidence: 0.95, source: "heuristic", evidence: null, usdt: route.at(-1).usdt, txHashes: ["h"], route, ...over });
const stop = (address, depth, usdt, label = null) => ({ address, depth, label, usdt });

test("a wallet that was not read, or is on a chain NOIR does not trace, has no graph", () => {
  assert.equal(traceGraphOf(base({ readable: false })), null);
  assert.equal(traceGraphOf(base({ traced: false })), null);
});

test("outbound: the wallet, each hop the record kept, and the account at the VASP, left to right", () => {
  const g = traceGraphOf(base({ outboundStop: null, outbound: outbound([stop("TWallet", 0, 2000), stop("THop1", 1, 400), stop("THop2", 2, 300), stop("TAcct", 3, 200)]) }));
  assert.deepEqual(g.nodes.map((n) => [n.id, n.kind, n.col, n.row, n.address, n.figure]), [
    ["wallet", "wallet", 0, 0, "TWallet", "2,000.00 USDT"],
    ["hop-0", "hop", 1, 0, "THop1", "400.00 USDT"],
    ["hop-1", "hop", 2, 0, "THop2", "300.00 USDT"],
    ["terminus", "terminus", 3, 0, "TAcct", "200.00 USDT"],
  ]);
  assert.deepEqual(g.edges, [
    { from: "wallet", to: "hop-0", side: "outbound", step: 1 },
    { from: "hop-0", to: "hop-1", side: "outbound", step: 2 },
    { from: "hop-1", to: "terminus", side: "outbound", step: 3 },
  ]);
  assert.deepEqual([g.cols, g.rows, g.walletCol], [4, 1, 0]);
  assert.equal(g.nodes.at(-1).title, "MEXC");
  assert.equal(g.nodes.at(-1).note, "deposit account");
});

test("inbound: each funding exchange with its payers counted, then the wallet", () => {
  const g = traceGraphOf(
    base({
      inbound: [
        { vasp: "Bybit", kind: "exchange_hot", payers: 1, paidUsdt: 570, confidence: 1, source: "ground_truth" },
        { vasp: "MEXC", kind: "exchange_hot", payers: 3, paidUsdt: 271.5, confidence: 1, source: "ground_truth" },
      ],
    }),
  );
  assert.equal(g.walletCol, 1);
  assert.deepEqual(g.nodes.filter((n) => n.kind === "funder").map((n) => [n.title, n.col, n.row, n.sub, n.figure, n.address]), [
    ["Bybit", 0, 0, "funded 1 payer", "570.00 USDT", null],
    ["MEXC", 0, 1, "funded 3 payers", "271.50 USDT", null],
  ]);
  assert.equal(g.rows, 2);
  assert.deepEqual(g.edges.filter((e) => e.side === "inbound").map((e) => `${e.from}>${e.to}`), ["funder-0>wallet", "funder-1>wallet"]);
  // No VASP outbound: one node that says so, never nothing.
  assert.deepEqual(g.nodes.at(-1), { id: "stop", kind: "stop", col: 2, row: 0, title: "No VASP named", address: null, sub: null, figure: null, note: "no exchange NOIR can name" });
});

test("a trail that ended somewhere says where: a mixer, a contract, a listed address", () => {
  assert.equal(traceGraphOf(base({ outboundStop: "mixer" })).nodes.at(-1).title, "A mixer");
  assert.equal(traceGraphOf(base({ outboundStop: "contract" })).nodes.at(-1).note, "a pool, router or bridge");
  const ended = traceGraphOf(base({ outboundStop: "sanctioned" }), { address: "TListed", entity: "ISIL KHORASAN" });
  assert.deepEqual(ended.nodes.at(-1), { id: "stop", kind: "listed", col: 1, row: 0, title: "ISIL KHORASAN", address: "TListed", sub: null, figure: null, note: "OFAC-listed; trail ended" });
  assert.deepEqual(ended.edges, [{ from: "wallet", to: "stop", side: "listed", step: 1 }]);
  assert.equal(traceGraphOf(base({ outboundStop: "sanctioned" })).nodes.at(-1).title, "An OFAC-listed address", "without the listing it is still said, unnamed");
});

test("a listed address reached on the way to a VASP hangs off the wallet, beneath the route", () => {
  const g = traceGraphOf(base({ outboundStop: null, outbound: outbound([stop("TWallet", 0, 2000), stop("THop", 1, 400), stop("TAcct", 2, 200)]) }), { address: "TListed", entity: "ISIL KHORASAN", usdt: 800 });
  const listed = g.nodes.find((n) => n.id === "listed");
  assert.deepEqual(listed, { id: "listed", kind: "listed", col: 1, row: 1, title: "ISIL KHORASAN", address: "TListed", sub: null, figure: "800.00 USDT", note: "on the OFAC list" });
  assert.deepEqual(g.edges.at(-1), { from: "wallet", to: "listed", side: "listed", step: 1 });
  assert.equal(g.rows, 2);
});

test("a record without a kept route still draws the account", () => {
  const g = traceGraphOf(base({ outboundStop: null, outbound: outbound([stop("TAcct", 1, 500)], { route: undefined }) }));
  assert.deepEqual(g.nodes.map((n) => n.id), ["wallet", "terminus"]);
  assert.equal(g.nodes[0].figure, null, "no route, so no traced figure is claimed for the wallet");
});

test("an explorer tag is a lead and is not in the graph", () => {
  const g = traceGraphOf(base({ inboundLeads: [{ tag: "Some Exchange 3", payers: 2, paidUsdt: 50 }] }));
  assert.ok(!JSON.stringify(g).includes("Some Exchange"));
  assert.equal(g.walletCol, 0);
});

test("the graph in words says both directions, and says what could not be said", () => {
  assert.equal(describeGraph(traceGraphOf(base({ inboundRead: "unreadable" }))), "Its funders could not be read. Its trail ended at no VASP named: no exchange NOIR can name.");
  assert.equal(describeGraph(traceGraphOf(base({ inboundRead: "not-run", outboundStop: "mixer" }))), "Funders are not looked up on this chain. Its trail ended at a mixer: the trail ended there.");
});

test("the recorded wallet that routes both ways draws both ways, with its listed contact", async () => {
  const record = await recorded("TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj");
  const contact = listedContact(record);
  assert.deepEqual(contact, { address: "THstQuwNidzC4YeJ7uPowf55ZdVZtGcHJ5", entity: "ISIL KHORASAN", usdt: 800 });
  const g = traceGraphOf(record, contact);
  assert.deepEqual(g.nodes.map((n) => `${n.col}:${n.row} ${n.kind} ${n.title}`), ["0:0 funder MEXC", "1:0 wallet The wallet", "2:0 hop Hop", "3:0 terminus Binance", "2:1 listed ISIL KHORASAN"]);
  assert.equal(g.nodes.find((n) => n.id === "terminus").figure, "200.00 USDT");
  assert.equal(g.nodes.find((n) => n.id === "funder-0").figure, "10,000.00 USDT");
  assert.equal(g.nodes.find((n) => n.id === "listed").figure, "800.00 USDT", "the record itself holds what reached the listed address");
  assert.equal(
    describeGraph(g),
    "MEXC funded 1 payer, who paid in 10,000.00 USDT. 200.00 USDT reached Binance (exchange wallet) through 1 hop. 800.00 USDT of it reached ISIL KHORASAN (THstQu…cHJ5), on the OFAC list.",
  );
});

test("a listed contact is a listing, never a mixer, and never invented", async () => {
  assert.equal(listedContact(null), null);
  assert.equal(listedContact(base()), null);
  assert.equal(listedContact(base({ typologies: [{ code: "SANCTIONED_CONTACT", reason: "Path enters a known mixing service.", at: "TNotOnAnyList1111111111111111111111" }] })), null);
  const ended = await recorded("TUGHe9CTbZG44YvqfTSBd3mTAysCWcVNL6");
  assert.equal(ended.outboundStop, "sanctioned");
  assert.equal(listedContact(ended).entity, "ISIL KHORASAN");
  const clean = await recorded("TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex");
  assert.equal(listedContact(clean), null);
});
