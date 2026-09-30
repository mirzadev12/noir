// The audit screen reads the same store the API does; a broken chain must be reported, never shown as fine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.NOIR_STATE_DIR = mkdtempSync(join(tmpdir(), "noir-audit-screen-"));
process.env.DEMO_MODE = "true";

test("an appended log is intact, and a tampered line is reported with where it breaks", async () => {
  const store = await import("../lib/audit-store.ts");
  const actor = { id: "I4C-2291", unit: "Cyber Cell", verified: false };
  await store.appendAudit({ action: "desk.filed", actor, chain: "tron", address: "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex", detail: {} });
  await store.appendAudit({ action: "request.drafted", actor, chain: null, address: null, detail: { vasp: "MEXC" } });
  const ok = await store.readAudit();
  assert.equal(ok.check.intact, true);
  assert.equal(ok.check.entries, 2);

  const file = join(process.env.NOIR_STATE_DIR, "audit.jsonl");
  const { readFileSync } = await import("node:fs");
  writeFileSync(file, readFileSync(file, "utf8").replace("MEXC", "Binance"));
  const bad = await store.readAudit();
  assert.equal(bad.check.intact, false);
  assert.ok(bad.check.brokenAt >= 1);
  assert.ok(bad.check.reason.length > 0);
});
