import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registryRows, registryTotals } from "../lib/registry.ts";

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const FILES = {
  tron: ["hot-wallets.json", "deposit-addresses.json"],
  ethereum: ["eth/hot-wallets.json", "eth/deposit-addresses.json"],
  polygon: ["polygon/hot-wallets.json", "polygon/deposit-addresses.json"],
};

test("every VASP in the label files has one row, with its counts per chain", () => {
  const rows = registryRows();
  const names = new Set();
  for (const [seeds, deposits] of Object.values(FILES)) {
    for (const r of [...read(seeds), ...read(deposits)]) names.add(r.exchange.toLowerCase().replace(/[^a-z0-9]/g, ""));
  }
  assert.equal(rows.length, names.size);
  for (const [chain, [seeds, deposits]] of Object.entries(FILES)) {
    const total = rows.reduce((s, r) => s + (r.chains[chain]?.depositAddresses ?? 0), 0);
    assert.equal(total, read(deposits).length, `${chain} deposits`);
    const seedTotal = rows.reduce((s, r) => s + (r.chains[chain]?.seedWallets ?? 0), 0);
    assert.equal(seedTotal, read(seeds).length, `${chain} seeds`);
  }
});

test("totals are counted, not typed", () => {
  const t = registryTotals();
  const deposits = Object.values(FILES).reduce((s, [, d]) => s + read(d).length, 0);
  const seeds = Object.values(FILES).reduce((s, [h]) => s + read(h).length, 0);
  assert.equal(t.depositAddresses, deposits);
  assert.equal(t.seedWallets, seeds);
  assert.equal(t.vasps, registryRows().length);
  assert.equal(t.chains, 3);
});

test("rows carry the FIU-IND listing and the LE channel, and absence is null", () => {
  const rows = registryRows();
  const coindcx = rows.find((r) => r.vasp === "CoinDCX");
  assert.equal(coindcx.fiu.legalName, "Neblio Technologies Private Limited");
  assert.equal(typeof coindcx.le.found, "boolean");
  const binance = rows.find((r) => r.vasp === "Binance");
  assert.equal(binance.fiu, null);
  assert.ok(binance.chains.tron && binance.chains.ethereum && binance.chains.polygon);
});
