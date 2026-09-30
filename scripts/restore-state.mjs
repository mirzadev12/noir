#!/usr/bin/env node
/**
 * Restore NOIR's state directory from a snapshot made by backup-state.mjs.
 *
 *   node scripts/restore-state.mjs backups/noir-state-20260930-100405Z
 *   node scripts/restore-state.mjs <snapshot> --force     # replace a state that is there
 *   node scripts/restore-state.mjs <snapshot> --check     # say whether it would restore; write nothing
 *
 * Stop the server first and start it after: a running server holds the desk's
 * queue and the audit log's tail in memory.
 *
 * The state directory is `NOIR_STATE_DIR`, or `.noir/` in the working
 * directory. The snapshot is checked before anything is written, and refused
 * when it cannot be trusted:
 *
 *   - a file is missing, extra, or does not match the size and SHA-256 its
 *     manifest states;
 *   - the audit log does not verify: an entry was changed, removed or moved.
 *     This is checked from the log itself, so re-writing the manifest to match
 *     an edited log does not get it through;
 *   - the desk file is not a desk.
 *
 * A state that is already there is never deleted. Without --force the restore
 * is refused; with it the files there are first moved to a directory beside the
 * state directory, `<state dir>.replaced-<UTC time>`.
 *
 * Exit codes: 0 restored (or, with --check, would restore); 1 refused; 2 bad
 * arguments.
 */

import path from "node:path";
import { restore, snapshotProblem, stateDir } from "./state-snapshot.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const rest = args.filter((a) => !a.startsWith("--"));
const known = ["--force", "--check"];
if (rest.length !== 1 || [...flags].some((f) => !known.includes(f))) {
  console.error("Usage: node scripts/restore-state.mjs <snapshot directory> [--force] [--check]");
  process.exit(2);
}

const from = path.resolve(rest[0]);
const to = stateDir();

if (flags.has("--check")) {
  const { problem, manifest } = await snapshotProblem(from);
  if (problem) {
    console.error(`REFUSED: ${problem}`);
    process.exit(1);
  }
  console.log(`This snapshot would restore: ${manifest.files.length} files, taken ${manifest.createdAt}.`);
  console.log(manifest.audit.entries ? `Audit log: ${manifest.audit.entries} entries, intact. Head ${manifest.audit.head}` : "Audit log: no entries.");
  process.exit(0);
}

const result = await restore(from, to, { force: flags.has("--force") });
if (!result.ok) {
  console.error(`REFUSED: ${result.reason}`);
  console.error("Nothing in the state directory was changed.");
  process.exit(1);
}
console.log(`Restored ${result.files.length} ${result.files.length === 1 ? "file" : "files"} into ${to}: ${result.files.join(", ")}`);
if (result.setAside) console.log(`The state that was there is set aside in ${result.setAside}`);
console.log(result.audit.entries ? `Audit log: ${result.audit.entries} entries, intact. Head ${result.audit.head}` : "Audit log: no entries.");
console.log("Compare the head with the one written down when the snapshot was taken, then start the server.");
