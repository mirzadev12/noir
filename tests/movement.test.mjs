import test from "node:test";
import assert from "node:assert/strict";
import { watchList, movementSummary } from "../lib/movement.ts";

const entry = (wallet, chain, over = {}) => ({
  id: `e-${wallet}`,
  wallet,
  chain,
  filings: [{ caseRef: "C1", by: { id: null }, at: "2026-09-30T00:00:00.000Z" }],
  status: "attributed",
  error: null,
  attributedAt: "2026-09-30T00:00:00.000Z",
  record: {
    wallet,
    chain,
    traced: true,
    readable: true,
    outbound: over.usdt ? { vasp: "MEXC", usdt: over.usdt } : null,
    inbound: [],
    inboundLeads: [],
    provenance: { generatedAt: over.readAt ?? "2026-09-24T21:24:00.000Z", basis: "recorded", apiCalls: 0, responseHashes: [] },
  },
  ...over.entry,
});

test("the watch list asks about every wallet that was read, from the moment it was read", () => {
  const list = watchList([
    entry("TAAA", "tron", { usdt: 10 }),
    entry("0xbbb", "polygon", { usdt: 50, readAt: "2026-09-25T00:00:00.000Z" }),
    entry("0xccc", "ethereum"),
  ]);
  assert.deepEqual(list, [
    { address: "0xbbb", since: "2026-09-25T00:00:00.000Z", chain: "polygon" },
    { address: "TAAA", since: "2026-09-24T21:24:00.000Z" },
    { address: "0xccc", since: "2026-09-24T21:24:00.000Z" },
  ]);
});

test("pending, unreadable, failed and screened-only wallets are not asked about", () => {
  const list = watchList([
    entry("TPEND", "tron", { entry: { status: "pending", record: null } }),
    entry("TUNREAD", "tron", { entry: { status: "unreadable" } }),
    entry("TFAIL", "tron", { entry: { status: "failed" } }),
    entry("1BTC", "bitcoin", { entry: { status: "screened-only" } }),
    entry("TOK", "tron"),
  ]);
  assert.deepEqual(list.map((i) => i.address), ["TOK"]);
});

test("the list is capped, most money first", () => {
  const many = Array.from({ length: 30 }, (_, i) => entry(`T${i}`, "tron", { usdt: i }));
  const list = watchList(many, 25);
  assert.equal(list.length, 25);
  assert.equal(list[0].address, "T29");
  assert.equal(list.some((i) => i.address === "T4"), false);
});

test("a moved wallet is summed, counted and its latest destination named only when the engine named it", () => {
  const s = movementSummary([
    {
      address: "TAAA",
      status: "moved",
      complete: true,
      movements: [
        { txHash: "h1", to: "TX1", valueUsdt: 100, timestamp: "2026-09-26T10:00:00.000Z", toPhrase: null },
        { txHash: "h2", to: "TX2", valueUsdt: 50.5, timestamp: "2026-09-27T10:00:00.000Z", toPhrase: "a wallet tagged MEXC" },
      ],
    },
    { address: "TBBB", status: "still" },
    { address: "0xccc", chain: "polygon", status: "unchecked", reason: "The chain did not answer for this wallet. Nothing is stated about it." },
  ]);
  assert.equal(s.moved.length, 1);
  assert.deepEqual(s.moved[0], {
    address: "TAAA",
    chain: undefined,
    transfers: 2,
    usdt: 150.5,
    complete: true,
    first: "2026-09-26T10:00:00.000Z",
    latest: { txHash: "h2", to: "TX2", valueUsdt: 50.5, timestamp: "2026-09-27T10:00:00.000Z", toPhrase: "a wallet tagged MEXC" },
  });
  assert.equal(s.still, 1);
  assert.equal(s.unchecked, 1);
});

test("an unchecked wallet is never counted as still", () => {
  const s = movementSummary([{ address: "T1", status: "unchecked", reason: "x" }]);
  assert.equal(s.still, 0);
  assert.equal(s.unchecked, 1);
  assert.equal(s.moved.length, 0);
});

test("moved wallets are listed most USDT first", () => {
  const mv = (address, v) => ({ address, status: "moved", complete: true, movements: [{ txHash: "h", to: "T", valueUsdt: v, timestamp: "2026-09-26T10:00:00.000Z", toPhrase: null }] });
  assert.deepEqual(movementSummary([mv("A", 1), mv("B", 9), mv("C", 5)]).moved.map((m) => m.address), ["B", "C", "A"]);
});
