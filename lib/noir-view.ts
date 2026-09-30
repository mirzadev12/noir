/**
 * The desk read the way the screens need it: which VASP to write to next, how
 * many wallets a row holds, when a request was sent and answered. Pure, and
 * client-safe, so `tests/noir-view.test.mjs` can hold every figure a screen
 * prints to the desk data it came from.
 *
 * Times and amounts are worded by `lib/noir-format.ts`; nothing here formats.
 */

import type { Ask, DeskEntry, DeskView, OutboundStop, RequestStatus, RoutedWallet, StatusChange, VaspRequest, VaspRow } from "./desk-types";
import { evidenceWord, utc, utcDay, vaspHref } from "./noir-format";

/** The consolidated request for one VASP, as a letter. */
export const requestHref = (vasp: string) => `${vaspHref(vasp)}/request`;

/**
 * How much evidence sits behind a row, counted by the words the screens use:
 * "3 strong, 1 limited". Every routed wallet counts once per direction it is
 * routed in. It states what was seen, never a chance of being right.
 */
export function evidenceSummary(wallets: Pick<RoutedWallet, "confidence">[]): string {
  const tally = { strong: 0, moderate: 0, limited: 0 };
  for (const w of wallets) {
    const word = evidenceWord(w.confidence);
    if (word.startsWith("Strong")) tally.strong += 1;
    else if (word.startsWith("Moderate")) tally.moderate += 1;
    else tally.limited += 1;
  }
  return (Object.entries(tally) as [string, number][])
    .filter(([, n]) => n > 0)
    .map(([word, n]) => `${n} ${word}`)
    .join(", ");
}

/** Short names for the asks, where the long sentence will not fit (a register column). */
export const ASK_SHORT: Record<Ask, string> = {
  kyc: "KYC",
  "access-logs": "Access logs",
  transactions: "Transactions",
  preservation: "Preservation",
  freeze: "Freeze",
};

/** Why an outbound path named no VASP, in words that never read as "empty". */
export const STOP_LINE: Record<OutboundStop, string> = {
  mixer: "The trace ended at a mixer, not at an exchange.",
  sanctioned: "The trace ended at an address on the OFAC SDN list.",
  contract: "The trace ended at a smart contract (a pool, router or bridge).",
  "none-found": "The trace reached no exchange NOIR can name.",
};

/** Distinct case references an entry was filed under, oldest first. */
export function caseRefsOf(entry: Pick<DeskEntry, "filings">): string[] {
  const refs: string[] = [];
  for (const f of entry.filings) if (f.caseRef !== null && !refs.includes(f.caseRef)) refs.push(f.caseRef);
  return refs;
}

/** Whether an entry's record says the wallet itself, or the end of its trail, is OFAC-listed. */
export function isSanctioned(entry: Pick<DeskEntry, "record">): boolean {
  const r = entry.record;
  return !!r && (r.sanctioned !== null || r.outboundStop === "sanctioned");
}

export interface WalletCounts {
  /** Distinct wallets in the row. A wallet routed both ways is one wallet. */
  wallets: number;
  outbound: number;
  inbound: number;
}

export function walletCounts(row: Pick<VaspRow, "wallets">): WalletCounts {
  const ids = new Set(row.wallets.map((w) => w.entryId));
  return {
    wallets: ids.size,
    outbound: row.wallets.filter((w) => w.direction === "outbound").length,
    inbound: row.wallets.filter((w) => w.direction === "inbound").length,
  };
}

/** Wallets in the row that no request covers: all of them when there is no request. */
export function uncoveredCount(row: Pick<VaspRow, "wallets" | "request" | "uncoveredEntryIds">): number {
  return row.request ? row.uncoveredEntryIds.length : walletCounts(row).wallets;
}

/**
 * The VASP to write to next: the row with the most wallets not yet covered by a
 * request. A tie goes to the row with more wallets, then to the name. Null when
 * every wallet on the desk is covered.
 */
export function nextVasp(rows: VaspRow[]): { row: VaspRow; uncovered: number } | null {
  let best: { row: VaspRow; uncovered: number } | null = null;
  for (const row of rows) {
    const uncovered = uncoveredCount(row);
    if (uncovered === 0) continue;
    const better =
      !best ||
      uncovered > best.uncovered ||
      (uncovered === best.uncovered &&
        (walletCounts(row).wallets > walletCounts(best.row).wallets ||
          (walletCounts(row).wallets === walletCounts(best.row).wallets && row.vasp.localeCompare(best.row.vasp) < 0)));
    if (better) best = { row, uncovered };
  }
  return best;
}

export interface DeskTotals {
  wallets: number;
  cases: number;
  vasps: number;
  /** Rows whose latest request is sent and not yet answered. */
  awaiting: number;
}

/** Every wallet on the desk, wherever it sits, and the cases it was filed under. */
export function deskTotals(view: DeskView): DeskTotals {
  const ids = new Set<string>();
  const cases = new Set<string>();
  for (const row of view.rows) {
    for (const w of row.wallets) ids.add(w.entryId);
    for (const c of row.caseRefs) cases.add(c);
  }
  for (const list of [view.pending, view.unreadable, view.screenedOnly, view.failed, view.unrouted]) {
    for (const e of list) {
      ids.add(e.id);
      for (const c of caseRefsOf(e)) cases.add(c);
    }
  }
  return {
    wallets: ids.size,
    cases: cases.size,
    vasps: view.rows.length,
    awaiting: view.rows.filter((r) => r.request && statusOf(r.request) === "sent").length,
  };
}

export const statusOf = (request: VaspRequest): RequestStatus => request.history[request.history.length - 1].status;

const ANSWERS: ReadonlySet<RequestStatus> = new Set(["acknowledged", "data-received", "frozen", "refused"]);

/** The change that sent the request, and the first answer the VASP gave, if either happened. */
export function sentAndAnswered(request: VaspRequest): { sent: StatusChange | null; answer: StatusChange | null } {
  return {
    sent: request.history.find((h) => h.status === "sent") ?? null,
    answer: request.history.find((h) => ANSWERS.has(h.status)) ?? null,
  };
}

/** When something happened: the day the officer gave, else the moment it was recorded (UTC). */
export function eventTime(change: StatusChange): string {
  return change.on ? utcDay(`${change.on}T00:00:00Z`) : utc(change.at);
}

/**
 * The pieces a long value (an address, a hash) may break between, so a narrow
 * screen breaks it into even lines and never leaves a stray character alone:
 * one piece up to 24 characters, two up to 48, four beyond. Joined, they are
 * the value exactly.
 */
export function monoParts(text: string): string[] {
  const k = text.length <= 24 ? 1 : text.length <= 48 ? 2 : 4;
  if (k === 1) return [text];
  const size = Math.ceil(text.length / k);
  return Array.from({ length: k }, (_, i) => text.slice(i * size, (i + 1) * size)).filter(Boolean);
}

/** The laundering typologies a trace can report, in plain words. The trace's own reason is printed beside each. */
export const TYPOLOGY_NAME: Record<string, string> = {
  SHORT_DWELL: "Forwarded within minutes",
  HIGH_FANOUT: "Fan-out to many wallets",
  PEEL_CHAIN: "Peel chain",
  ROUND_AMOUNTS: "Round amounts",
  NEW_ADDRESS: "A newly created address",
  SANCTIONED_CONTACT: "Contact with a sanctioned address",
};

/** What each evidence tier means, in one sentence. Printed on the letter and on the Method page. */
export const TIER_LINE: Record<string, string> = {
  ground_truth: "The wallet carries a public block-explorer tag naming the exchange.",
  heuristic: "The address repeatedly forwarded nearly everything it received to an exchange wallet that carries such a tag.",
  sanctions: "The address is on the OFAC Specially Designated Nationals list.",
  community: "The address was reported on a public list. The weakest tier.",
};

/**
 * What the desk says of an unreadable wallet's attempts: when it was last
 * tried, which read that was, and whether NOIR will read it again by itself.
 * `max` is the number of reads the worker makes in all (`MAX_READ_ATTEMPTS`).
 */
export function retryLine(entry: Pick<DeskEntry, "attempts" | "retryAt" | "attributedAt">, max: number): string {
  if (!entry.attributedAt) return "Not yet read";
  const tried = `Tried ${utc(entry.attributedAt)}`;
  const n = entry.attempts;
  if (typeof n !== "number" || n < 1) return tried;
  const which = `${tried} (${Math.min(n, max)} of ${max})`;
  if (typeof entry.retryAt === "string") return `${which}. NOIR reads it again at ${utc(entry.retryAt)}.`;
  return n >= max ? `${which}. NOIR will not read it again by itself.` : `${which}.`;
}
