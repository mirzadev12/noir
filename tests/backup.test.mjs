// L7 — backup and restore of the state directory. A snapshot restores only when
// every file matches its manifest and the audit log's chain verifies; a log
// that was edited is refused even when the manifest was re-written to match.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { restore, snapshot, snapshotProblem, stamp, stateDir, verifyAuditText, SCHEMA } from "../scripts/state-snapshot.mjs";

const STATE = mkdtempSync(join(tmpdir(), "noir-live-"));
process.env.NOIR_STATE_DIR = STATE;
process.env.DEMO_MODE = "true";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const tmp = (name) => mkdtempSync(join(tmpdir(), `noir-${name}-`));
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const NOW = "2026-09-30T10:04:05.123Z";

const req = (path, method, body) => new Request(`http://localhost${path}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

let audit, head;
before(async () => {
  // A real state, made by the app itself: a filing, its attribution, a request, a status, a closed case.
  const desk = await import("../app/api/desk/route.ts");
  const requests = await import("../app/api/desk/requests/route.ts");
  const cases = await import("../app/api/desk/cases/route.ts");
  const worker = await import("../lib/desk-worker.ts");
  audit = await import("../lib/audit-store.ts");
  await desk.POST(req("/api/desk", "POST", { text: "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex\nTJjc21brTnnmKhiYHQuBD9Pxpfy7BwXHYQ", caseRef: "Case A" }));
  await worker.deskWorker().kick();
  const drafted = await (await requests.POST(req("/api/desk/requests", "POST", { vasp: "MEXC", asks: ["kyc"] }))).json();
  await requests.PATCH(req("/api/desk/requests", "PATCH", { id: drafted.id, status: "sent" }));
  await cases.POST(req("/api/desk/cases", "POST", { caseRef: "Case A", action: "close" }));
  const check = (await audit.readAudit()).check;
  assert.equal(check.intact, true);
  head = check.head;
});

/** A fresh snapshot of the live state, in its own directory. */
const take = () => snapshot(STATE, tmp("backups"), NOW);

/** Re-write a snapshot's manifest so every size and hash matches the files as they are now. */
function forgeManifest(dir, auditOver = {}) {
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  for (const f of manifest.files) {
    const buf = readFileSync(join(dir, f.name));
    f.bytes = buf.length;
    f.sha256 = sha(buf);
  }
  Object.assign(manifest.audit, auditOver);
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

test("the state directory is resolved as the server resolves it", () => {
  assert.equal(stateDir({ NOIR_STATE_DIR: " /var/lib/noir " }, "/srv/app"), "/var/lib/noir");
  assert.equal(stateDir({}, join("srv", "app")), join("srv", "app", ".noir"));
  assert.equal(stamp(NOW), "20260930-100405Z");
});

test("a snapshot copies every state file and states each one's hash and the audit log's head", async () => {
  const { dir, manifest } = await take();
  assert.match(dir, /noir-state-20260930-100405Z$/);
  assert.equal(manifest.schema, SCHEMA);
  assert.equal(manifest.createdAt, NOW);
  const names = manifest.files.map((f) => f.name);
  for (const expected of ["audit.jsonl", "case-closures.json", "desk.json"]) assert.ok(names.includes(expected), expected);
  assert.ok(!names.some((n) => n.endsWith(".tmp")), "a write in progress is not part of a snapshot");
  for (const f of manifest.files) {
    const copy = readFileSync(join(dir, f.name));
    assert.deepEqual(copy, readFileSync(join(STATE, f.name)), `${f.name} is a byte-for-byte copy`);
    assert.equal(f.bytes, copy.length);
    assert.equal(f.sha256, sha(copy));
  }
  assert.deepEqual([manifest.audit.intact, manifest.audit.head], [true, head], "the head is the one the app itself computes");
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")), manifest);
});

test("an empty state is not a snapshot", async () => {
  await assert.rejects(snapshot(tmp("empty"), tmp("backups"), NOW), /no state to back up/);
});

test("a sound snapshot restores into an empty state directory, byte for byte", async () => {
  const { dir, manifest } = await take();
  assert.equal((await snapshotProblem(dir)).problem, null);
  const target = join(tmp("target"), "state");
  const result = await restore(dir, target, { now: NOW });
  assert.equal(result.ok, true);
  assert.equal(result.setAside, null);
  assert.deepEqual(result.audit, manifest.audit);
  for (const f of manifest.files) assert.deepEqual(readFileSync(join(target, f.name)), readFileSync(join(STATE, f.name)));
  assert.ok(!existsSync(join(target, "manifest.json")), "the manifest belongs to the snapshot, not to the state");
  assert.deepEqual(verifyAuditText(readFileSync(join(target, "audit.jsonl"), "utf8")), { intact: true, entries: manifest.audit.entries, head });
});

test("a file changed after the snapshot was taken is refused", async () => {
  const { dir } = await take();
  const desk = join(dir, "desk.json");
  writeFileSync(desk, readFileSync(desk, "utf8").replace("Case A", "Case Z"));
  const target = join(tmp("target"), "state");
  const result = await restore(dir, target);
  assert.equal(result.ok, false);
  assert.match(result.reason, /desk\.json does not match its manifest/);
  assert.ok(!existsSync(target), "nothing was written");
});

test("an audit log that was edited is refused even when the manifest was re-written to match", async () => {
  const { dir } = await take();
  const log = join(dir, "audit.jsonl");
  const lines = readFileSync(log, "utf8").trimEnd().split("\n");
  const second = JSON.parse(lines[1]);
  second.detail = { ...second.detail, caseRef: "Another case" };
  lines[1] = JSON.stringify(second);
  writeFileSync(log, lines.join("\n") + "\n");
  forgeManifest(dir);

  const result = await restore(dir, join(tmp("target"), "state"));
  assert.equal(result.ok, false);
  assert.match(result.reason, /audit log in this snapshot is broken at entry 2: entry 2 has been changed since it was written/);
});

test("an audit log with an entry removed, or its last entries cut off, is refused", async () => {
  const removed = await take();
  const log = join(removed.dir, "audit.jsonl");
  const lines = readFileSync(log, "utf8").trimEnd().split("\n");
  writeFileSync(log, [lines[0], ...lines.slice(2)].join("\n") + "\n");
  forgeManifest(removed.dir);
  const a = await restore(removed.dir, join(tmp("target"), "state"));
  assert.equal(a.ok, false);
  assert.match(a.reason, /broken at entry 2/);

  // Cutting entries off the end leaves a chain that verifies on its own; the head and length the manifest states catch it.
  const cut = await take();
  const cutLog = join(cut.dir, "audit.jsonl");
  const all = readFileSync(cutLog, "utf8").trimEnd().split("\n");
  writeFileSync(cutLog, all.slice(0, -1).join("\n") + "\n");
  const manifest = JSON.parse(readFileSync(join(cut.dir, "manifest.json"), "utf8"));
  for (const f of manifest.files) {
    const buf = readFileSync(join(cut.dir, f.name));
    f.bytes = buf.length;
    f.sha256 = sha(buf);
  }
  writeFileSync(join(cut.dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const b = await restore(cut.dir, join(tmp("target"), "state"));
  assert.equal(b.ok, false);
  assert.match(b.reason, /not the one the manifest states/);
});

test("a snapshot of a state whose log was already broken says so, and does not restore", async () => {
  const broken = tmp("broken-state");
  cpSync(STATE, broken, { recursive: true });
  const log = join(broken, "audit.jsonl");
  writeFileSync(log, readFileSync(log, "utf8").replace('"seq":2', '"seq":9'));
  const { dir, manifest } = await snapshot(broken, tmp("backups"), NOW);
  assert.equal(manifest.audit.intact, false);
  assert.equal(manifest.audit.brokenAt, 2);
  const result = await restore(dir, join(tmp("target"), "state"));
  assert.equal(result.ok, false);
  assert.match(result.reason, /broken at entry 2/);
});

test("a directory that is not a snapshot, an extra file and a desk that is not a desk are each refused", async () => {
  assert.match((await snapshotProblem(tmp("nothing"))).problem, /not a NOIR state snapshot/);

  const extra = await take();
  writeFileSync(join(extra.dir, "slipped-in.json"), "{}");
  assert.match((await snapshotProblem(extra.dir)).problem, /a file its manifest does not name: slipped-in\.json/);

  const notDesk = await take();
  writeFileSync(join(notDesk.dir, "desk.json"), JSON.stringify({ version: 2, entries: [] }));
  forgeManifest(notDesk.dir);
  assert.match((await snapshotProblem(notDesk.dir)).problem, /not a desk this version reads/);

  const missing = await take();
  const manifest = JSON.parse(readFileSync(join(missing.dir, "manifest.json"), "utf8"));
  manifest.files.push({ name: "ghost.json", bytes: 2, sha256: sha(Buffer.from("{}")) });
  writeFileSync(join(missing.dir, "manifest.json"), JSON.stringify(manifest));
  assert.match((await snapshotProblem(missing.dir)).problem, /missing ghost\.json/);
});

test("a state that is already there is never overwritten without --force, and never deleted with it", async () => {
  const { dir } = await take();
  const target = tmp("occupied");
  writeFileSync(join(target, "desk.json"), '{"version":1,"entries":[],"requests":[]}');
  const before = readFileSync(join(target, "desk.json"), "utf8");

  const refused = await restore(dir, target, { now: NOW });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /already holds 1 file\. Pass --force/);
  assert.equal(readFileSync(join(target, "desk.json"), "utf8"), before, "untouched");

  const forced = await restore(dir, target, { force: true, now: NOW });
  assert.equal(forced.ok, true);
  assert.equal(forced.setAside, `${target}.replaced-20260930-100405Z`);
  assert.equal(readFileSync(join(forced.setAside, "desk.json"), "utf8"), before, "the old state is set aside, whole");
  assert.deepEqual(readFileSync(join(target, "desk.json")), readFileSync(join(STATE, "desk.json")));
});

test("the restored state is one the app reads: the same desk, the same closed case, an intact log", async () => {
  const { dir } = await take();
  const target = join(tmp("target"), "state");
  assert.equal((await restore(dir, target)).ok, true);
  const script = `
    const { loadDesk } = await import("./lib/desk-store.ts");
    const { loadClosures } = await import("./lib/case-store.ts");
    const { readAudit } = await import("./lib/audit-store.ts");
    const desk = await loadDesk();
    console.log(JSON.stringify({ wallets: desk.entries.length, requests: desk.requests.length, closed: (await loadClosures()).map((c) => c.caseRef), audit: (await readAudit()).check }));
  `;
  const out = execFileSync(process.execPath, ["--import", "./tests/register.mjs", "--input-type=module", "-e", script], { cwd: ROOT, env: { ...process.env, NOIR_STATE_DIR: target }, encoding: "utf8" });
  const seen = JSON.parse(out.trim().split("\n").pop());
  assert.deepEqual([seen.wallets, seen.requests, seen.closed], [2, 1, ["Case A"]]);
  assert.equal(seen.audit.intact, true);
  assert.equal(seen.audit.head, head);
});

test("the scripts: a backup exits 0 and names the snapshot; a restore of an edited log exits 1 and changes nothing", () => {
  const out = tmp("cli-backups");
  const backup = spawnSync(process.execPath, ["scripts/backup-state.mjs", "--out", out], { cwd: ROOT, env: { ...process.env, NOIR_STATE_DIR: STATE }, encoding: "utf8" });
  assert.equal(backup.status, 0, backup.stderr);
  assert.match(backup.stdout, /Backed up \d+ files/);
  assert.ok(backup.stdout.includes(head), "it prints the head to write down");
  const dir = join(out, readdirSync(out)[0]);

  const check = spawnSync(process.execPath, ["scripts/restore-state.mjs", dir, "--check"], { cwd: ROOT, env: { ...process.env, NOIR_STATE_DIR: join(tmp("t"), "state") }, encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /would restore/);

  const log = join(dir, "audit.jsonl");
  writeFileSync(log, readFileSync(log, "utf8").replace("desk.filed", "desk.removed"));
  forgeManifest(dir);
  const target = join(tmp("t"), "state");
  const refused = spawnSync(process.execPath, ["scripts/restore-state.mjs", dir], { cwd: ROOT, env: { ...process.env, NOIR_STATE_DIR: target }, encoding: "utf8" });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /REFUSED: The audit log in this snapshot is broken at entry 1/);
  assert.match(refused.stderr, /Nothing in the state directory was changed/);
  assert.ok(!existsSync(target));

  assert.equal(spawnSync(process.execPath, ["scripts/restore-state.mjs"], { cwd: ROOT, encoding: "utf8" }).status, 2, "no snapshot named");
  assert.equal(spawnSync(process.execPath, ["scripts/backup-state.mjs", "--nope"], { cwd: ROOT, encoding: "utf8" }).status, 2);
});
