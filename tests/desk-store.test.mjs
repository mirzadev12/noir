import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "noir-desk-"));
process.env.NOIR_STATE_DIR = dir;
const { changeDesk, loadDesk, readDesk } = await import("../lib/desk-store.ts");

test.after(() => rmSync(dir, { recursive: true, force: true }));

test("a missing file is an empty desk", async () => {
  assert.deepEqual(await loadDesk(), { version: 1, entries: [], requests: [] });
});

test("changes are serialised and persisted", async () => {
  await Promise.all([1, 2, 3].map((i) => changeDesk((f) => { f.requests.push({ id: `r_${i}` }); })));
  assert.equal((await loadDesk()).requests.length, 3);
});

test("an unreadable file throws rather than emptying the shared desk", async () => {
  writeFileSync(path.join(dir, "desk.json"), "{not json");
  await assert.rejects(loadDesk());
  assert.throws(() => readDesk({ version: 2 }));
});
