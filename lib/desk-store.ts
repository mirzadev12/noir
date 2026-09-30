/**
 * The shared desk on disk: `desk.json` in the state directory
 * (`lib/state-file.ts`). Rules in `lib/desk.ts` and `lib/requests.ts`.
 *
 * A missing file is an empty desk. A file that cannot be read is an error,
 * never an empty desk: the desk is shared by the unit, and reading a damaged
 * file as empty would let the next change write that emptiness over it.
 *
 * Server-only.
 */

import { emptyDesk } from "./desk";
import type { DeskFile } from "./desk-types";
import { readStateFile, serially, writeStateFile } from "./state-file";

const FILE = "desk.json";

/** The desk in `v`, or a thrown error when `v` is not a desk this version reads. */
export function readDesk(v: unknown): DeskFile {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("desk.json does not hold a desk.");
  const file = v as Record<string, unknown>;
  if (file.version !== 1) throw new Error(`desk.json is version ${String(file.version)}; this build reads version 1.`);
  if (!Array.isArray(file.entries) || !Array.isArray(file.requests)) {
    throw new Error("desk.json has no entries or requests list.");
  }
  return v as DeskFile;
}

async function readDeskFile(): Promise<DeskFile> {
  const text = await readStateFile(FILE);
  if (text === null) return emptyDesk();
  try {
    return readDesk(JSON.parse(text));
  } catch (err) {
    throw new Error("desk.json could not be read", { cause: err });
  }
}

/**
 * The desk as it is now. A read waits its turn behind the writes queued before
 * it, so it never sees a file half replaced and never holds the file open
 * while a write is renaming over it.
 */
export function loadDesk(): Promise<DeskFile> {
  return serially(FILE, readDeskFile);
}

/** Read, change and write, one change at a time. Nothing is written when the file cannot be read. */
export function changeDesk<T>(change: (file: DeskFile) => T): Promise<T> {
  return serially(FILE, async () => {
    const file = await readDeskFile();
    const result = change(file);
    await writeStateFile(FILE, JSON.stringify(file, null, 2));
    return result;
  });
}
