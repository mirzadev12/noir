/**
 * The desk read as a board: one row per VASP with what the officer scans for —
 * wallets each way, cases, USDT each way, and where its request stands — plus
 * the stage filters and the search the board offers. Pure and serialisable, so
 * the server computes the rows and the browser only filters them.
 */

import type { RequestStatus, VaspRequest, VaspRow } from "./desk-types";

/** Where a VASP's request stands, as the officer's next step. */
export type Stage = "none" | "drafted" | "awaiting" | "answered";
export type BoardFilter = "all" | Stage;

const ANSWERED: ReadonlySet<RequestStatus> = new Set(["acknowledged", "data-received", "frozen", "refused"]);

export function stageOf(request: VaspRequest | null): Stage {
  if (!request) return "none";
  const status = request.history[request.history.length - 1].status;
  if (status === "drafted") return "drafted";
  return request.history.some((h) => ANSWERED.has(h.status)) ? "answered" : "awaiting";
}

export interface BoardRow {
  vasp: string;
  fiuListed: boolean;
  wallets: number;
  outbound: number;
  inbound: number;
  cases: number;
  usdtOut: number;
  usdtIn: number;
  stage: Stage;
  status: RequestStatus | null;
  /** The calendar day the request was sent (the officer's date, else the day it was recorded). */
  sentOn: string | null;
  /** Wallets filed after the request was drafted. */
  filedSince: number;
  /** Lower-cased VASP name and wallet addresses, for search. */
  search: string[];
}

export function boardRows(rows: VaspRow[]): BoardRow[] {
  return rows.map((row) => {
    const out = new Set(row.wallets.filter((w) => w.direction === "outbound").map((w) => w.entryId));
    const inb = new Set(row.wallets.filter((w) => w.direction === "inbound").map((w) => w.entryId));
    const sent = row.request?.history.find((h) => h.status === "sent") ?? null;
    return {
      vasp: row.vasp,
      fiuListed: row.fiu !== null,
      wallets: new Set([...out, ...inb]).size,
      outbound: out.size,
      inbound: inb.size,
      cases: row.caseRefs.length,
      usdtOut: row.outboundUsdt,
      usdtIn: row.inboundUsdt,
      stage: stageOf(row.request),
      status: row.request ? row.request.history[row.request.history.length - 1].status : null,
      sentOn: sent ? (sent.on ?? sent.at.slice(0, 10)) : null,
      filedSince: row.request ? row.uncoveredEntryIds.length : 0,
      search: [row.vasp.toLowerCase(), ...new Set(row.wallets.map((w) => w.wallet.toLowerCase()))],
    };
  });
}

export function boardCounts(rows: BoardRow[]): Record<BoardFilter, number> {
  const n = (s: Stage) => rows.filter((r) => r.stage === s).length;
  return { all: rows.length, none: n("none"), drafted: n("drafted"), awaiting: n("awaiting"), answered: n("answered") };
}

export function filterBoard(rows: BoardRow[], filter: BoardFilter, query: string): BoardRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => (filter === "all" || r.stage === filter) && (!q || r.search.some((s) => s.includes(q))));
}
