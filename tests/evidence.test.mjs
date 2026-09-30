// L9 — every row attribution reads from carries its provenance, and every
// figure about those rows is counted from data/, never typed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evidenceLedger, ledgerOf } from "../lib/evidence.ts";
import { registryTotals } from "../lib/registry.ts";
import { frozenAddresses } from "../lib/demo.ts";

const load = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const TABLES = {
  tron: { seeds: "data/hot-wallets.json", deposits: "data/deposit-addresses.json" },
  ethereum: { seeds: "data/eth/hot-wallets.json", deposits: "data/eth/deposit-addresses.json" },
  polygon: { seeds: "data/polygon/hot-wallets.json", deposits: "data/polygon/deposit-addresses.json" },
};

test("no row lacks its provenance", () => {
  const ledger = evidenceLedger();
  assert.deepEqual(ledger.missing, [], "a row was added to data/ without its source, its evidence or its seed");
  assert.equal(ledger.seedWallets.withSource, ledger.seedWallets.total);
  assert.equal(ledger.depositAddresses.withEvidence, ledger.depositAddresses.total);
  assert.equal(ledger.depositAddresses.withSeed, ledger.depositAddresses.total);
  assert.equal(ledger.recordedCases.withReadAt, ledger.recordedCases.total);
});

test("the ledger's figures are the ones the files hold, counted again here", () => {
  const ledger = evidenceLedger();
  let seeds = 0;
  let deposits = 0;
  for (const [chain, files] of Object.entries(TABLES)) {
    const s = load(files.seeds).length;
    const d = load(files.deposits).length;
    assert.deepEqual(ledger.byChain[chain], { seedWallets: s, depositAddresses: d }, chain);
    seeds += s;
    deposits += d;
  }
  assert.equal(ledger.seedWallets.total, seeds);
  assert.equal(ledger.depositAddresses.total, deposits);
  assert.equal(ledger.recordedCases.total, load("data/demo-cases.json").cases.length);
  assert.equal(ledger.recordedCases.withPayers, Object.keys(load("data/demo-payers.json").cases).length);
});

test("the ledger and the registry count the same tables", () => {
  const ledger = evidenceLedger();
  const totals = registryTotals();
  assert.equal(ledger.seedWallets.total, totals.seedWallets);
  assert.equal(ledger.depositAddresses.total, totals.depositAddresses);
  assert.equal(Object.keys(ledger.byChain).length, totals.chains);
});

test("every tagged wallet names an explorer page for that very address", () => {
  for (const files of Object.values(TABLES)) {
    for (const seed of load(files.seeds)) {
      assert.match(seed.source_url, /^https:\/\//, `${seed.address} has no source`);
      assert.ok(seed.source_url.toLowerCase().includes(seed.address.toLowerCase()), `${seed.address}: the source is a page about another address`);
      assert.ok(typeof seed.tag === "string" && seed.tag.length > 0, `${seed.address} has no tag`);
    }
  }
});

test("every deposit address forwards to a tagged wallet of the same exchange, on the same chain", () => {
  for (const [chain, files] of Object.entries(TABLES)) {
    const key = (a) => (chain === "tron" ? a : a.toLowerCase());
    const seeds = new Map(load(files.seeds).map((s) => [key(s.address), s.exchange]));
    for (const d of load(files.deposits)) {
      const seed = chain === "tron" ? d.hotWallet : d.seed;
      assert.ok(seeds.has(key(seed)), `${d.address}: its seed is not in the ${chain} seed table`);
      assert.equal(seeds.get(key(seed)), d.exchange, `${d.address} is filed under ${d.exchange} but forwards to a wallet of ${seeds.get(key(seed))}`);
      assert.ok(d.confidence > 0 && d.confidence <= 1, `${d.address}: evidence seen is not a share of 1`);
      assert.ok(d.sweepCount >= 1, `${d.address}: no sweep was seen`);
    }
  }
});

test("a row without provenance is caught: the ledger names the file, the address and what is lacking", () => {
  const table = (seeds, deposits, seedField = "hotWallet") => ({ seeds, seedsFile: "seeds.json", deposits, depositsFile: "deposits.json", seedField });
  const none = table([], []);
  const ledger = ledgerOf(
    {
      tron: table(
        [{ address: "TSeed", source_url: "https://tronscan.org/#/address/TSeed" }, { address: "TNoSource" }, { address: "TBadSource", source_url: "see the explorer" }],
        [
          { address: "TGood", evidence: "2 sweeps, 100% of inflow forwarded", hotWallet: "TSeed" },
          { address: "TNoEvidence", evidence: " ", hotWallet: "TSeed" },
          { address: "TOrphan", evidence: "3 sweeps", hotWallet: "TNotASeed" },
        ],
      ),
      ethereum: table([{ address: "0xAbC", source_url: "https://eth.blockscout.com/address/0xAbC" }], [{ address: "0xdep", evidence: "5 sweeps", seed: "0xabc" }], "seed"),
      polygon: none,
    },
    [{ address: "TCase", trace: { chain: "tron", provenance: { generatedAt: "2026-09-14T08:51:02.929Z" } } }, { address: "TUndated", trace: { chain: "tron", provenance: {} } }],
    { "tron:TCase": {} },
  );
  assert.deepEqual(ledger.seedWallets, { total: 4, withSource: 2 });
  assert.deepEqual(ledger.depositAddresses, { total: 4, withEvidence: 3, withSeed: 3 }, "an EVM seed is matched whatever its spelling");
  assert.deepEqual(ledger.recordedCases, { total: 2, withReadAt: 1, withPayers: 1 });
  assert.deepEqual(ledger.missing, [
    { file: "seeds.json", address: "TNoSource", lacks: "the explorer page that tags it" },
    { file: "seeds.json", address: "TBadSource", lacks: "the explorer page that tags it" },
    { file: "deposits.json", address: "TNoEvidence", lacks: "its evidence" },
    { file: "deposits.json", address: "TOrphan", lacks: "a tagged wallet in the seed table that it forwards to" },
    { file: "data/demo-cases.json", address: "TUndated", lacks: "the moment it was read" },
  ]);
});

test("every recorded case the desk can answer offline is in the ledger", () => {
  const ledger = evidenceLedger();
  assert.ok(ledger.recordedCases.total >= frozenAddresses().length);
  assert.ok(ledger.recordedCases.withPayers <= ledger.recordedCases.total);
});

test("GET /api/registry returns the rows, the totals and the ledger", async () => {
  const route = await import("../app/api/registry/route.ts");
  const res = route.GET();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.totals, registryTotals());
  assert.equal(body.rows.length, body.totals.vasps);
  assert.deepEqual(body.evidence, evidenceLedger());
  assert.deepEqual(body.evidence.missing, []);
});
