/**
 * The desk read two more ways, for the reports an officer and I4C ask for:
 *
 *  - by case: which wallets a case filed, which VASPs they reach, and which
 *    requests cover them — the case-based view the problem statement asks for;
 *  - by VASP response: of the requests sent to each VASP, how many were
 *    answered, frozen, refused or ignored, and how long an answer took. Every
 *    figure is counted from the requests recorded here and says how many;
 *    three requests are not a measure of an exchange.
 *
 * Pure; the desk file is `lib/desk-store.ts`.
 */

import { vaspKey } from "./desk";
import type { CaseClosure, DeskFile, EntryChain, EntryStatus, RequestStatus, VaspRequest } from "./desk-types";

export interface CaseRow {
  /** Null gathers the wallets filed without a case reference. */
  caseRef: string | null;
  wallets: { entryId: string; wallet: string; chain: EntryChain; status: EntryStatus }[];
  /** VASPs its wallets reach in either direction, first spelling seen. */
  vasps: string[];
  requests: { id: string; vasp: string; status: RequestStatus }[];
  firstFiled: string;
  lastFiled: string;
  /** The closure when the unit has closed this case; null while it is open. The wallets with no case reference are never closed. */
  closed: CaseClosure | null;
}

export interface VaspResponse {
  vasp: string;
  drafted: number;
  sent: number;
  /** Sent requests the VASP answered in any way: acknowledged, data, frozen or refused. */
  answered: number;
  frozen: number;
  refused: number;
  /** Requests whose current status is "no response". */
  noResponse: number;
  /** Median calendar days from sent to the first answer, over answered requests; null when none. */
  medianDaysToAnswer: number | null;
}

const ANSWERS: ReadonlySet<RequestStatus> = new Set(["acknowledged", "data-received", "frozen", "refused"]);
const status = (r: VaspRequest) => r.history[r.history.length - 1].status;

export function groupByCase(file: DeskFile, closures: CaseClosure[] = []): CaseRow[] {
  const cases = new Map<string, CaseRow>();
  for (const entry of file.entries) {
    for (const filing of entry.filings) {
      const key = filing.caseRef ?? "\u0000none";
      let row = cases.get(key);
      if (!row) {
        const closed = filing.caseRef === null ? null : (closures.find((c) => c.caseRef === filing.caseRef) ?? null);
        row = { caseRef: filing.caseRef, wallets: [], vasps: [], requests: [], firstFiled: filing.at, lastFiled: filing.at, closed };
        cases.set(key, row);
      }
      if (filing.at < row.firstFiled) row.firstFiled = filing.at;
      if (filing.at > row.lastFiled) row.lastFiled = filing.at;
      if (row.wallets.some((w) => w.entryId === entry.id)) continue;
      row.wallets.push({ entryId: entry.id, wallet: entry.wallet, chain: entry.chain, status: entry.status });
      const record = entry.record;
      const reached = record?.readable ? [record.outbound?.vasp, ...record.inbound.map((i) => i.vasp)] : [];
      for (const vasp of reached) {
        if (vasp && !row.vasps.some((v) => vaspKey(v) === vaspKey(vasp))) row.vasps.push(vasp);
      }
    }
  }
  for (const row of cases.values()) {
    const ids = new Set(row.wallets.map((w) => w.entryId));
    row.requests = file.requests
      .filter((r) => r.entryIds.some((id) => ids.has(id)))
      .map((r) => ({ id: r.id, vasp: r.vasp, status: status(r) }));
  }
  return [...cases.values()].sort((a, b) => b.lastFiled.localeCompare(a.lastFiled));
}

/** The calendar day an event happened: the officer's date when given, else when it was recorded. */
const dayOf = (change: VaspRequest["history"][number]) => change.on ?? change.at.slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function vaspResponse(requests: VaspRequest[]): VaspResponse[] {
  const book = new Map<string, VaspResponse & { days: number[] }>();
  for (const r of requests) {
    const key = vaspKey(r.vasp);
    let row = book.get(key);
    if (!row) {
      row = { vasp: r.vasp, drafted: 0, sent: 0, answered: 0, frozen: 0, refused: 0, noResponse: 0, medianDaysToAnswer: null, days: [] };
      book.set(key, row);
    }
    row.drafted += 1;
    const sent = r.history.find((h) => h.status === "sent");
    if (!sent) continue;
    row.sent += 1;
    const answer = r.history.find((h) => ANSWERS.has(h.status));
    if (answer) {
      row.answered += 1;
      row.days.push(daysBetween(dayOf(sent), dayOf(answer)));
    }
    if (r.history.some((h) => h.status === "frozen")) row.frozen += 1;
    if (r.history.some((h) => h.status === "refused")) row.refused += 1;
    if (status(r) === "no-response") row.noResponse += 1;
  }
  return [...book.values()]
    .map(({ days, ...row }) => ({ ...row, medianDaysToAnswer: median(days) }))
    .sort((a, b) => b.sent - a.sent || a.vasp.localeCompare(b.vasp));
}
