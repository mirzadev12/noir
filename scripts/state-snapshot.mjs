/**
 * Snapshots of NOIR's state directory: what `backup-state.mjs` and
 * `restore-state.mjs` do, as functions a test can call.
 *
 * The state directory (`NOIR_STATE_DIR`, or `.noir/` in the working directory)
 * holds the desk, the audit log, the closed cases, the case file and the alert
 * watch, as plain files. A snapshot is a copy of those files in a directory of
 * its own, with a `manifest.json` that names each file, its size and its
 * SHA-256, and states the audit log's head.
 *
 * Imports nothing from the app, like `verify-audit.mjs`: the audit log's hash
 * rule is re-stated here from its description, so a bug in lib/audit.ts cannot
 * make a broken log restore.
 *
 * A restore is refused, and nothing is written, when
 *   - the manifest is missing or is not one this version writes;
 *   - a file is missing, extra, or does not match its size or SHA-256;
 *   - the audit log does not verify: an entry changed, removed or out of order;
 *   - the audit log's head or length is not the one the manifest states;
 *   - the desk file is not a desk.
 * The audit check does not depend on the manifest: a snapshot whose log was
 * edited and whose manifest was re-written to match is still refused.
 */

import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const SCHEMA = "noir-state-backup-v1";
const MANIFEST = "manifest.json";
const AUDIT = "audit.jsonl";
const DESK = "desk.json";
const GENESIS = "0".repeat(64);

/** The state directory, resolved as the server resolves it (lib/state-file.ts). */
export function stateDir(env = process.env, cwd = process.cwd()) {
  return env.NOIR_STATE_DIR?.trim() || path.join(cwd, ".noir");
}

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** JSON with the keys of every object sorted, at every depth: what an audit entry is hashed as. */
function sorted(value) {
  if (Array.isArray(value)) return `[${value.map(sorted).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${sorted(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Walk an audit log's chain. Each entry must be numbered one after the last,
 * name the previous entry's hash as `prev` (sixty-four zeros for the first),
 * and match its own hash: SHA-256 of the entry without its `hash` field.
 */
export function verifyAuditText(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  let prev = GENESIS;
  for (let i = 0; i < lines.length; i++) {
    const n = i + 1;
    const broken = (reason) => ({ intact: false, entries: lines.length, brokenAt: n, reason });
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      return broken(`line ${n} is not an entry`);
    }
    if (!entry || typeof entry !== "object") return broken(`line ${n} is not an entry`);
    const { hash, ...body } = entry;
    if (entry.seq !== n) return broken(`entry ${n} is numbered ${entry.seq}: an entry is missing or out of order`);
    if (entry.prev !== prev) return broken(`entry ${n} does not follow the entry before it`);
    if (sha256(sorted(body)) !== hash) return broken(`entry ${n} has been changed since it was written`);
    prev = hash;
  }
  return { intact: true, entries: lines.length, head: lines.length ? prev : null };
}

/** The files of a state directory worth keeping: regular files, not a write in progress. */
async function stateFiles(dir) {
  let names;
  try {
    names = await readdir(dir);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const out = [];
  for (const name of names.sort()) {
    if (name.endsWith(".tmp") || name === MANIFEST) continue;
    if ((await stat(path.join(dir, name))).isFile()) out.push(name);
  }
  return out;
}

/** 2026-09-30T10:04:05.123Z → 20260930-100405Z: a directory name that sorts by time. */
export function stamp(iso) {
  return iso.replace(/\.\d+Z$/, "Z").replace(/[-:]/g, "").replace("T", "-");
}

/**
 * Copy the state directory into a new snapshot directory under `outRoot`, and
 * write its manifest. Returns where it is and what it holds. The state is left
 * untouched. A state with no files is refused: there is nothing to keep.
 */
export async function snapshot(fromDir, outRoot, now = new Date().toISOString()) {
  const names = await stateFiles(fromDir);
  if (names.length === 0) throw new Error(`There is no state to back up in ${fromDir}.`);
  const dir = path.join(outRoot, `noir-state-${stamp(now)}`);
  await mkdir(dir, { recursive: true });

  const copy = async () => {
    const files = [];
    for (const name of names) {
      await copyFile(path.join(fromDir, name), path.join(dir, name));
      const buf = await readFile(path.join(dir, name));
      files.push({ name, bytes: buf.length, sha256: sha256(buf) });
    }
    return files;
  };
  let files = await copy();
  const auditOf = async () => (names.includes(AUDIT) ? verifyAuditText(await readFile(path.join(dir, AUDIT), "utf8")) : { intact: true, entries: 0, head: null });
  let audit = await auditOf();
  // The log is appended to while the server runs: a copy can catch its last line half written. One more copy settles it.
  if (!audit.intact && audit.brokenAt === audit.entries) {
    files = await copy();
    audit = await auditOf();
  }

  const manifest = { schema: SCHEMA, createdAt: now, from: fromDir, files, audit };
  await writeFile(path.join(dir, MANIFEST), JSON.stringify(manifest, null, 2));
  return { dir, manifest };
}

/** Why a snapshot cannot be trusted, in a sentence, or null when it can. Reads only. */
export async function snapshotProblem(dir) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(dir, MANIFEST), "utf8"));
  } catch {
    return { problem: `There is no readable ${MANIFEST} in ${dir}: this is not a NOIR state snapshot.` };
  }
  if (!manifest || manifest.schema !== SCHEMA || !Array.isArray(manifest.files)) {
    return { problem: `The manifest is not a ${SCHEMA} manifest.` };
  }

  const present = await stateFiles(dir);
  const named = manifest.files.map((f) => f.name);
  for (const name of present) if (!named.includes(name)) return { problem: `The snapshot holds a file its manifest does not name: ${name}.` };
  for (const f of manifest.files) {
    if (typeof f.name !== "string" || path.basename(f.name) !== f.name) return { problem: "The manifest names a file outside the snapshot." };
    let buf;
    try {
      buf = await readFile(path.join(dir, f.name));
    } catch {
      return { problem: `The snapshot is missing ${f.name}.` };
    }
    if (buf.length !== f.bytes || sha256(buf) !== f.sha256) return { problem: `${f.name} does not match its manifest: it was changed after the snapshot was taken.` };
  }

  // The audit log is checked on its own, whatever the manifest says of it.
  if (named.includes(AUDIT)) {
    const check = verifyAuditText(await readFile(path.join(dir, AUDIT), "utf8"));
    if (!check.intact) return { problem: `The audit log in this snapshot is broken at entry ${check.brokenAt}: ${check.reason}.` };
    const stated = manifest.audit ?? {};
    if (stated.intact !== true) return { problem: "The manifest says the audit log was already broken when the snapshot was taken." };
    if (stated.head !== check.head || stated.entries !== check.entries) {
      return { problem: "The audit log is not the one the manifest states: its head or its length differs." };
    }
  } else if (manifest.audit && manifest.audit.entries > 0) {
    return { problem: "The manifest states an audit log, and the snapshot has none." };
  }

  if (named.includes(DESK)) {
    let desk;
    try {
      desk = JSON.parse(await readFile(path.join(dir, DESK), "utf8"));
    } catch {
      return { problem: "desk.json in this snapshot is not JSON." };
    }
    if (!desk || desk.version !== 1 || !Array.isArray(desk.entries) || !Array.isArray(desk.requests)) {
      return { problem: "desk.json in this snapshot is not a desk this version reads." };
    }
  }
  return { problem: null, manifest };
}

/**
 * Put a snapshot's files in the state directory. Refused (nothing written) when
 * the snapshot cannot be trusted, or when the state directory already holds
 * files and `force` is not given. With `force` the files there are first set
 * aside in a directory beside it, never deleted.
 */
export async function restore(fromDir, toDir, { force = false, now = new Date().toISOString() } = {}) {
  const checked = await snapshotProblem(fromDir);
  if (checked.problem) return { ok: false, reason: checked.problem };

  const existing = await stateFiles(toDir);
  let setAside = null;
  if (existing.length > 0) {
    if (!force) {
      return { ok: false, reason: `The state directory ${toDir} already holds ${existing.length} ${existing.length === 1 ? "file" : "files"}. Pass --force to replace them; they are set aside first, not deleted.` };
    }
    setAside = `${toDir.replace(/[\\/]+$/, "")}.replaced-${stamp(now)}`;
    await mkdir(setAside, { recursive: true });
    for (const name of existing) await rename(path.join(toDir, name), path.join(setAside, name));
  }

  await mkdir(toDir, { recursive: true });
  for (const f of checked.manifest.files) {
    await copyFile(path.join(fromDir, f.name), path.join(toDir, f.name));
    const buf = await readFile(path.join(toDir, f.name));
    if (sha256(buf) !== f.sha256) return { ok: false, reason: `${f.name} did not copy intact. The state directory is incomplete; restore again.` };
  }
  return { ok: true, files: checked.manifest.files.map((f) => f.name), audit: checked.manifest.audit, setAside };
}
