/**
 * The files the server keeps for itself — the alert watch, the shared case
 * file and the audit log — all in one directory, as plain files: AGENTS.md §3
 * allows JSON files and no database.
 *
 * `NOIR_STATE_DIR` names the directory (a mounted disk, in production); the
 * default is `.noir/` in the working directory. Either way it is git-ignored,
 * because it also holds the server's private push key and officers' records.
 *
 * Writes to one file are queued on `globalThis`: Next bundles
 * `instrumentation.ts` and the route handlers separately, so a module-level
 * queue would exist twice, and two writers would each think they were alone.
 *
 * Server-only.
 */

import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export function stateDir(): string {
  return process.env.NOIR_STATE_DIR?.trim() || path.join(process.cwd(), ".noir");
}

// Written at run time, never part of the build: kept out of Turbopack's file
// tracing, which would otherwise ship the whole project with the server code.
export const stateFile = (name: string) => path.join(/*turbopackIgnore: true*/ stateDir(), name);

/** The file's text, or null when it has not been written yet. */
export async function readStateFile(name: string): Promise<string | null> {
  try {
    return await readFile(stateFile(name), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Codes a rename answers with when another handle holds the target for a moment (a reader, a scanner): worth trying again. */
const HELD = new Set(["EPERM", "EBUSY", "EACCES"]);

/**
 * Written whole, then renamed into place, so a crash mid-write never leaves
 * half a file. On Windows a file that is being read cannot be renamed over; the
 * rename is tried again a few times, briefly, before it is an error.
 */
export async function writeStateFile(name: string, text: string, mode?: number): Promise<void> {
  await mkdir(stateDir(), { recursive: true });
  const target = stateFile(name);
  const temp = `${target}.${process.pid}.tmp`;
  await writeFile(temp, text, mode === undefined ? undefined : { mode });
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(temp, target);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? "";
      if (attempt >= 5 || !HELD.has(code)) throw err;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
}

export async function appendStateFile(name: string, text: string): Promise<void> {
  await mkdir(stateDir(), { recursive: true });
  await appendFile(stateFile(name), text);
}

/** Run `work` after every earlier piece of work on the same file has finished. */
export function serially<T>(name: string, work: () => Promise<T>): Promise<T> {
  const holder = globalThis as typeof globalThis & { __noirQueues?: Map<string, Promise<unknown>> };
  const queues = (holder.__noirQueues ??= new Map());
  const run = (queues.get(name) ?? Promise.resolve()).then(work);
  queues.set(name, run.catch(() => undefined));
  return run;
}
