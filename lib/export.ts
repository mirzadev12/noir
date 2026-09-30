/**
 * Exports of what the desk holds, as CSV or JSON, for an officer to attach to
 * their own paperwork. Server-only, read-only: nothing here writes the desk.
 *
 * Every timestamp is the UTC instant as recorded. There is no rupee figure and
 * no statute. A wallet's confidence is how much evidence was seen, never a
 * probability, and the column says so. A cell that a spreadsheet could read as
 * a formula is prefixed with an apostrophe, so a typed note cannot run in Excel.
 */

import type { RoutedWallet, VaspRequest, VaspRow } from "./desk-types";
import { ASK_LABEL, STATUS_LABEL } from "./requests";

export type Cell = string | number | null;

/** One CSV field: quoted when it holds a comma, quote or line break; formulas defused. */
export function csvCell(value: Cell): string {
  if (value === null) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && typeof value === "string") text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

const WALLET_HEADER = [
  "vasp",
  "wallet",
  "chain",
  "direction",
  "account_at_vasp",
  "usdt",
  "case_refs",
  "evidence_seen",
  "evidence_source",
  "tx_hashes",
];

const walletRow = (vasp: string, w: RoutedWallet): Cell[] => [
  vasp,
  w.wallet,
  w.chain,
  w.direction,
  w.account,
  w.usdt,
  w.caseRefs.join("; "),
  w.confidence,
  w.source,
  w.txHashes.join("; "),
];

/** One VASP's wallets in both directions. */
export function vaspWalletsCsv(row: VaspRow): string {
  return toCsv(WALLET_HEADER, row.wallets.map((w) => walletRow(row.vasp, w)));
}

export function vaspWalletsJson(row: VaspRow) {
  return {
    vasp: row.vasp,
    wallets: row.wallets.map((w) => ({
      wallet: w.wallet,
      chain: w.chain,
      direction: w.direction,
      account: w.account,
      usdt: w.usdt,
      caseRefs: w.caseRefs,
      evidenceSeen: w.confidence,
      evidenceSource: w.source,
      txHashes: w.txHashes,
    })),
  };
}

const REQUEST_HEADER = ["request_id", "vasp", "asks", "wallets", "status", "last_change_utc", "reference", "history"];

const requestRow = (r: VaspRequest): Cell[] => {
  const last = r.history[r.history.length - 1];
  return [
    r.id,
    r.vasp,
    r.asks.map((a) => ASK_LABEL[a]).join("; "),
    r.entryIds.length,
    STATUS_LABEL[last.status],
    last.at,
    last.reference,
    r.history.map((h) => `${STATUS_LABEL[h.status]} ${h.at}`).join("; "),
  ];
};

/** The register of requests, in the order given. */
export function requestsCsv(requests: VaspRequest[]): string {
  return toCsv(REQUEST_HEADER, requests.map(requestRow));
}

export function requestsJson(requests: VaspRequest[]) {
  return requests.map((r) => ({
    id: r.id,
    vasp: r.vasp,
    asks: r.asks,
    wallets: r.entryIds.length,
    history: r.history.map((h) => ({ status: h.status, at: h.at, on: h.on, reference: h.reference, note: h.note })),
  }));
}
