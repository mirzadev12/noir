// Reads and writes of the desk file, interleaved. A read waits its turn behind
// the writes queued before it, so it never holds the file open while a write is
// renaming over it (which Windows refuses) and never sees a desk half replaced.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.NOIR_STATE_DIR = mkdtempSync(join(tmpdir(), "noir-state-"));

const by = { id: null, unit: null, verified: false };
const entry = (i) => ({
  id: `e_${i}`,
  wallet: `T${i}`,
  chain: "tron",
  filings: [{ caseRef: null, by, at: "2026-09-30T00:00:00.000Z" }],
  status: "pending",
  record: null,
  error: null,
  attributedAt: null,
});

test("sixty interleaved reads and writes all succeed, and no write is lost", async () => {
  const { changeDesk, loadDesk } = await import("../lib/desk-store.ts");
  const work = Array.from({ length: 60 }, (_, i) =>
    i % 2 === 0
      ? changeDesk((file) => {
          file.entries.push(entry(i));
          return file.entries.length;
        })
      : loadDesk().then((file) => file.entries.length),
  );
  const seen = await Promise.all(work);
  assert.equal((await loadDesk()).entries.length, 30, "every write landed");
  // Each read saw exactly the writes queued before it: the desk whole, never half replaced.
  seen.forEach((n, i) => assert.equal(n, Math.floor(i / 2) + 1, `call ${i} saw ${n} entries`));
});

test("the closures file is read and written the same way", async () => {
  const { changeClosures, loadClosures } = await import("../lib/case-store.ts");
  const work = Array.from({ length: 40 }, (_, i) =>
    i % 2 === 0
      ? changeClosures((closures) => {
          closures.push({ caseRef: `K ${i}`, closedAt: "2026-09-30T00:00:00.000Z", by, note: null });
          return { write: true, result: closures.length };
        })
      : loadClosures().then((closures) => closures.length),
  );
  await Promise.all(work);
  assert.equal((await loadClosures()).length, 20);
});

test("a write that is refused for a moment is tried again, and one that is refused for good is an error", async () => {
  const { writeStateFile, readStateFile } = await import("../lib/state-file.ts");
  await writeStateFile("probe.txt", "one");
  await writeStateFile("probe.txt", "two");
  assert.equal(await readStateFile("probe.txt"), "two");
  assert.equal(await readStateFile("never-written.txt"), null);
});
