#!/usr/bin/env node
/**
 * Back up NOIR's state directory: the desk, the audit log, the closed cases,
 * the case file and the alert watch.
 *
 *   node scripts/backup-state.mjs                 # into ./backups/
 *   node scripts/backup-state.mjs --out D:\noir-backups
 *   NOIR_STATE_DIR=/var/lib/noir node scripts/backup-state.mjs --out /mnt/backups
 *
 * The state directory is `NOIR_STATE_DIR`, or `.noir/` in the working
 * directory, exactly as the server resolves it. The snapshot is a new directory
 * `noir-state-<UTC time>/` holding a copy of every state file and a
 * `manifest.json` with each file's size and SHA-256 and the audit log's head.
 * The state is only read.
 *
 * A snapshot holds what the state directory holds: officers' records and the
 * server's private push key. Keep it where you would keep the state directory.
 *
 * Exit codes: 0 done; 1 nothing to back up, or the audit log in the state is
 * already broken (the snapshot is still written, and says so); 2 bad arguments.
 */

import path from "node:path";
import { snapshot, stateDir } from "./state-snapshot.mjs";

const args = process.argv.slice(2);
let out = path.join(process.cwd(), "backups");
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && args[i + 1]) out = path.resolve(args[++i]);
  else {
    console.error("Usage: node scripts/backup-state.mjs [--out <directory>]");
    process.exit(2);
  }
}

const from = stateDir();
try {
  const { dir, manifest } = await snapshot(from, out);
  console.log(`Backed up ${manifest.files.length} ${manifest.files.length === 1 ? "file" : "files"} from ${from}`);
  console.log(`  to ${dir}`);
  for (const f of manifest.files) console.log(`  ${f.name}  ${f.bytes} bytes  sha256 ${f.sha256.slice(0, 16)}…`);
  if (manifest.audit.intact) {
    console.log(manifest.audit.entries ? `Audit log: ${manifest.audit.entries} entries, intact. Head ${manifest.audit.head}` : "Audit log: no entries yet.");
    console.log("Write the head down somewhere the server cannot reach; a restore is checked against it.");
  } else {
    console.error(`The audit log in the state is BROKEN at entry ${manifest.audit.brokenAt}: ${manifest.audit.reason}.`);
    console.error("The snapshot was written and says so. It will not restore: restore-state.mjs refuses a broken log.");
    process.exit(1);
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
