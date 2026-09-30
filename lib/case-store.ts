/**
 * The case files on disk, in the state directory (`lib/state-file.ts`). Rules
 * in `lib/case-file.ts`.
 *
 *  - `cases.json`: runs saved to the shared case file.
 *  - `case-closures.json`: the case references the unit has closed on the desk.
 *
 * A missing closures file means no case is closed. One that cannot be read is
 * an error, never "nothing is closed": reading a damaged file as empty would
 * quietly reopen every closed case, and the next change would write that over
 * it.
 *
 * Server-only.
 */

import { readCases, readClosures, sortCases, type SavedCase } from "./case-file";
import type { CaseClosure } from "./desk-types";
import { readStateFile, serially, writeStateFile } from "./state-file";

const FILE = "cases.json";
const CLOSURES = "case-closures.json";

export async function loadCases(): Promise<SavedCase[]> {
  const text = await readStateFile(FILE);
  if (text === null) return [];
  try {
    return sortCases(readCases(JSON.parse(text)));
  } catch {
    console.warn("[cases] cases.json could not be read.");
    return [];
  }
}

/** Read, change and write, one change at a time. */
export function changeCases<T>(change: (cases: SavedCase[]) => T): Promise<T> {
  return serially(FILE, async () => {
    const cases = await loadCases();
    const result = change(cases);
    await writeStateFile(FILE, JSON.stringify(sortCases(cases), null, 2));
    return result;
  });
}

/** The cases closed on the desk, oldest first. Throws when the file is there and cannot be read. */
export async function loadClosures(): Promise<CaseClosure[]> {
  const text = await readStateFile(CLOSURES);
  if (text === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error("case-closures.json could not be read", { cause: err });
  }
  if (!Array.isArray(parsed)) throw new Error("case-closures.json does not hold a list of closed cases.");
  return readClosures(parsed);
}

/** Read, change and write the closures, one change at a time. Nothing is written when `change` says it changed nothing. */
export function changeClosures<T>(change: (closures: CaseClosure[]) => { write: boolean; result: T }): Promise<T> {
  return serially(CLOSURES, async () => {
    const closures = await loadClosures();
    const { write, result } = change(closures);
    if (write) await writeStateFile(CLOSURES, JSON.stringify(closures, null, 2));
    return result;
  });
}
