import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { landingFigures, landingRoute, LANDING_WALLET } from "../lib/landing.ts";
import { COVERAGE } from "../lib/coverage.ts";

const json = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));

test("the landing route is a recorded case attributed offline, never a live read", async () => {
  const record = await landingRoute();
  assert.ok(record, "the recorded case is in data/");
  assert.equal(record.wallet, LANDING_WALLET);
  assert.equal(record.provenance.basis, "recorded");
  assert.ok(record.outbound, "it reached a VASP");
  assert.equal(record.outbound.vasp, "CoinDCX");
  const route = record.outbound.route ?? [];
  assert.ok(route.length >= 2, "the route runs from the wallet to the account");
  assert.equal(route[0].address, LANDING_WALLET);
  assert.equal(route[route.length - 1].address, record.outbound.account);
});

test("landing figures are counted from data/, not typed in", () => {
  const f = landingFigures();
  const count = (file, key) => (key ? json(file)[key].length : json(file).length);
  assert.equal(f.ofac.tron, count("data/risk-lists.json", "sanctioned"));
  assert.equal(f.ofac.otherChains, count("data/sanctions-multichain.json", "addresses"));
  assert.equal(f.ofac.total, f.ofac.tron + f.ofac.otherChains);

  const deposits = ["data/deposit-addresses.json", "data/eth/deposit-addresses.json", "data/polygon/deposit-addresses.json"].reduce((n, file) => n + count(file), 0);
  const seeds = ["data/hot-wallets.json", "data/eth/hot-wallets.json", "data/polygon/hot-wallets.json"].reduce((n, file) => n + count(file), 0);
  assert.equal(f.registry.depositAddresses, deposits);
  assert.equal(f.registry.seedWallets, seeds);

  assert.equal(f.coverage.total, COVERAGE.length);
  assert.equal(f.coverage.built + f.coverage.partial + f.coverage.notBuilt, COVERAGE.length);
});
