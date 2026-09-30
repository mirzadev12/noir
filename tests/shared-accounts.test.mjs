import { test } from "node:test";
import assert from "node:assert/strict";
import { sharedAccounts } from "../lib/shared-accounts.ts";

const w = (entryId, wallet, direction, account, usdt, caseRefs) => ({
  entryId, wallet, chain: "tron", direction, caseRefs, account, usdt,
  confidence: 0.8, source: "heuristic", evidence: null, txHashes: [],
});
const row = (vasp, wallets) => ({
  vasp, fiu: null, le: null, wallets, caseRefs: [...new Set(wallets.flatMap((x) => x.caseRefs))],
  outboundUsdt: 0, inboundUsdt: 0, canFreeze: true, request: null, uncoveredEntryIds: [],
});

test("wallets from different cases that reached one account are one link", () => {
  const links = sharedAccounts([
    row("MEXC", [
      w("e1", "TA", "outbound", "TACC", 9795.12, ["FIR 114/2026"]),
      w("e2", "TB", "outbound", "TACC", 7630.48, ["FIR 77/2026"]),
      w("e3", "TC", "outbound", "TOTHER", 5, ["FIR 77/2026"]),
      w("e4", "TD", "inbound", null, 100, ["FIR 9/2026"]),
    ]),
  ]);
  assert.equal(links.length, 1);
  const [l] = links;
  assert.equal(l.vasp, "MEXC");
  assert.equal(l.account, "TACC");
  assert.deepEqual(l.wallets.map((x) => x.wallet), ["TA", "TB"]);
  assert.deepEqual(l.caseRefs, ["FIR 114/2026", "FIR 77/2026"]);
  assert.equal(l.usdt, 17425.6);
  assert.equal(l.crossCase, true);
});

test("two wallets of one case at one account are a link, but not across cases", () => {
  const [l] = sharedAccounts([row("OKX", [w("e1", "TA", "outbound", "TX", 1, ["C-1"]), w("e2", "TB", "outbound", "TX", 2, ["C-1"])])]);
  assert.equal(l.crossCase, false);
});

test("a single wallet at an account is not a link; cross-case links come first", () => {
  const links = sharedAccounts([
    row("OKX", [w("e1", "TA", "outbound", "TX", 1, ["C-1"]), w("e2", "TB", "outbound", "TX", 2, ["C-1"])]),
    row("MEXC", [w("e3", "TC", "outbound", "TY", 1, ["C-2"]), w("e4", "TD", "outbound", "TY", 1, ["C-3"]), w("e5", "TE", "outbound", "TZ", 1, ["C-3"])]),
  ]);
  assert.deepEqual(links.map((l) => [l.vasp, l.account]), [["MEXC", "TY"], ["OKX", "TX"]]);
});
