/**
 * The dispatch desk's rules, free of files so they are tested on their own
 * (`tests/desk.test.mjs`). The file on disk is `lib/desk-store.ts`.
 *
 * One shared desk per server. Wallets are filed onto it, attributed one at a
 * time by the worker, and grouped under the nearest VASP in each direction:
 * where the money went (outbound) and who funded the wallet (inbound). A
 * wallet sits under a VASP only by our own label table; an explorer's tag is a
 * lead the wallet's own page shows, never a row here. A wallet NOIR could not
 * read files under no VASP and is listed apart, never as empty.
 */

import type {
  AttributionRecord,
  DeskEntry,
  DeskFile,
  DeskView,
  EntryChain,
  IntakeLine,
  RoutedWallet,
  VaspRequest,
  VaspRow,
} from "./desk-types";
import { fiuListing } from "./fiu";
import type { Actor } from "./identity";
import { leContact } from "./le-contacts";

export function emptyDesk(): DeskFile {
  return { version: 1, entries: [], requests: [] };
}

/** How VASP names compare: lower-case, letters and digits only (as `lib/fiu.ts` keys them). */
export function vaspKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const hex12 = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

export function newEntryId(): string {
  return `e_${hex12()}`;
}

export function newRequestId(): string {
  return `r_${hex12()}`;
}

/** EVM addresses compare lower-cased; every other chain's exactly. */
function sameWallet(entry: DeskEntry, wallet: string, chain: EntryChain): boolean {
  if (entry.chain !== chain) return false;
  return /^0x/i.test(wallet) ? entry.wallet.toLowerCase() === wallet.toLowerCase() : entry.wallet === wallet;
}

/**
 * File every accepted intake line. A wallet already on the desk on the same
 * chain gains a filing (who, when, under which case) and keeps its status and
 * record; anything else becomes a new pending entry. Mutates `file`.
 */
export function fileWallets(
  file: DeskFile,
  lines: IntakeLine[],
  by: Actor,
  now: string,
  newId: () => string,
): { added: DeskEntry[]; merged: DeskEntry[] } {
  const added: DeskEntry[] = [];
  const merged: DeskEntry[] = [];
  for (const line of lines) {
    if (!line.ok) continue;
    const filing = { caseRef: line.caseRef, by, at: now };
    const existing = file.entries.find((e) => sameWallet(e, line.wallet, line.chain));
    if (existing) {
      existing.filings.push(filing);
      if (!added.includes(existing) && !merged.includes(existing)) merged.push(existing);
      continue;
    }
    const entry: DeskEntry = {
      id: newId(),
      wallet: line.wallet,
      chain: line.chain,
      filings: [filing],
      status: "pending",
      record: null,
      error: null,
      attributedAt: null,
    };
    file.entries.push(entry);
    added.push(entry);
  }
  return { added, merged };
}

export function removeEntry(file: DeskFile, id: string): DeskEntry | null {
  const i = file.entries.findIndex((e) => e.id === id);
  if (i === -1) return null;
  const [removed] = file.entries.splice(i, 1);
  return removed;
}

/** Reads of one wallet in all before the worker leaves it unreadable: the first, and two more by itself. */
export const MAX_READ_ATTEMPTS = 3;
/** How long after each unreadable read the next one waits: 30 seconds, then 2 minutes. */
export const RETRY_DELAYS_MS = [30_000, 120_000];

/**
 * Store the worker's answer for an entry. The status follows from the record:
 * unread → `unreadable`, untraced chain → `screened-only`, else `attributed`.
 * A thrown attribution is `failed` with its reason; the last record written,
 * if any, is kept as it was, never replaced by nothing.
 *
 * A wallet that could not be read is given a time to be read again, further
 * off each time, until `MAX_READ_ATTEMPTS` reads are spent. It is `unreadable`
 * while it waits and after the last read: never attributed with nothing in it,
 * never empty. A thrown attribution is not retried by itself.
 */
export function setRecord(
  file: DeskFile,
  id: string,
  result: { record: AttributionRecord } | { error: string },
  now: string,
): DeskEntry | null {
  const entry = file.entries.find((e) => e.id === id);
  if (!entry) return null;
  const attempts = (entry.attempts ?? 0) + 1;
  entry.attempts = attempts;
  entry.retryAt = null;
  if ("error" in result) {
    entry.status = "failed";
    entry.error = result.error;
    return entry;
  }
  const { record } = result;
  entry.record = record;
  entry.error = null;
  entry.attributedAt = now;
  entry.status = !record.readable ? "unreadable" : !record.traced ? "screened-only" : "attributed";
  if (entry.status === "unreadable" && attempts < MAX_READ_ATTEMPTS) {
    const wait = RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length) - 1];
    entry.retryAt = new Date(Date.parse(now) + wait).toISOString();
  }
  return entry;
}

/**
 * Queue the unreadable wallets whose time to be read again has come. Their
 * count of attempts is kept: this is the worker retrying, not an officer asking.
 * Mutates `file`; returns the entries it queued.
 */
export function requeueDue(file: DeskFile, now: string): DeskEntry[] {
  const due = file.entries.filter((e) => e.status === "unreadable" && typeof e.retryAt === "string" && e.retryAt <= now);
  for (const entry of due) {
    entry.status = "pending";
    entry.retryAt = null;
  }
  return due;
}

/** When the next retry is due (ISO, UTC), or null when none is scheduled. */
export function nextRetryAt(file: DeskFile): string | null {
  let next: string | null = null;
  for (const e of file.entries) {
    if (e.status !== "unreadable" || typeof e.retryAt !== "string") continue;
    if (next === null || e.retryAt < next) next = e.retryAt;
  }
  return next;
}

/** True when the worker has something to do or to wait for: a wallet to read, or one scheduled to be read again. */
export function hasWork(file: DeskFile): boolean {
  return file.entries.some((e) => e.status === "pending" || (e.status === "unreadable" && typeof e.retryAt === "string"));
}

/** Asked for by a person: the wallet is read afresh, and its attempts are counted from nothing. */
function queueAfresh(entry: DeskEntry): void {
  entry.status = "pending";
  entry.error = null;
  entry.attempts = 0;
  entry.retryAt = null;
}

/** Queue an entry to be attributed again. Its last record stays until a new one is written. */
export function markPending(file: DeskFile, id: string): DeskEntry | null {
  const entry = file.entries.find((e) => e.id === id);
  if (!entry) return null;
  queueAfresh(entry);
  return entry;
}

/** Which wallets to read again: one, a list, every wallet under a VASP, or every wallet filed under a case. */
export type ReadAgainSelector =
  | { id: string }
  | { ids: string[] }
  | { vasp: string }
  /** `null` names the wallets filed with no case reference. */
  | { caseRef: string | null };

export interface ReadAgainResult {
  queued: DeskEntry[];
  /** Named but not queued, each with why: already being read, or not on the desk. */
  skipped: { id: string; wallet: string; reason: string }[];
  /** How many wallets on the desk the selector named. 0 means it named nothing. */
  matched: number;
}

/**
 * Queue every wallet a selector names to be read again. A wallet already
 * waiting for the worker is skipped, never queued twice; an id that is not on
 * the desk is reported, not ignored. Each wallet's last record stays until the
 * new one is written. Mutates `file`.
 */
export function markPendingWhere(file: DeskFile, select: ReadAgainSelector): ReadAgainResult {
  const skipped: ReadAgainResult["skipped"] = [];
  let matched: DeskEntry[];
  if ("id" in select) {
    matched = file.entries.filter((e) => e.id === select.id);
  } else if ("ids" in select) {
    matched = [];
    for (const id of new Set(select.ids)) {
      const entry = file.entries.find((e) => e.id === id);
      if (entry) matched.push(entry);
      else skipped.push({ id, wallet: "", reason: "No wallet with that id is on the desk." });
    }
  } else if ("vasp" in select) {
    // By each wallet's last record, not by the grouped view: a wallet waiting to
    // be read again has left its row, but it is still a wallet of that VASP.
    const key = vaspKey(select.vasp);
    matched = file.entries.filter((e) => {
      const r = e.record;
      if (!r || !r.readable || !r.traced) return false;
      return (r.outbound !== null && vaspKey(r.outbound.vasp) === key) || r.inbound.some((i) => vaspKey(i.vasp) === key);
    });
  } else {
    matched = file.entries.filter((e) => e.filings.some((f) => f.caseRef === select.caseRef));
  }

  const queued: DeskEntry[] = [];
  for (const entry of matched) {
    if (entry.status === "pending") {
      skipped.push({ id: entry.id, wallet: entry.wallet, reason: "Already being read." });
      continue;
    }
    queueAfresh(entry);
    queued.push(entry);
  }
  return { queued, skipped, matched: matched.length };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Distinct non-null case references across an entry's filings, oldest first. */
function entryCaseRefs(entry: DeskEntry): string[] {
  const refs: string[] = [];
  for (const f of entry.filings) if (f.caseRef !== null && !refs.includes(f.caseRef)) refs.push(f.caseRef);
  return refs;
}

/** The request to a VASP drafted last, or null. */
function latestRequest(requests: VaspRequest[], key: string): VaspRequest | null {
  let latest: VaspRequest | null = null;
  for (const r of requests) {
    if (vaspKey(r.vasp) !== key) continue;
    if (!latest || (r.history[0]?.at ?? "") >= (latest.history[0]?.at ?? "")) latest = r;
  }
  return latest;
}

/**
 * The desk as the officer works it: one row per VASP, each wallet under its
 * outbound VASP and under each inbound VASP, and the wallets that sit under no
 * VASP listed apart by why.
 */
export function groupByVasp(file: DeskFile): DeskView {
  const view: DeskView = { rows: [], pending: [], unreadable: [], screenedOnly: [], failed: [], unrouted: [] };
  const rows = new Map<string, { vasp: string; wallets: RoutedWallet[] }>();
  const rowFor = (vasp: string) => {
    const key = vaspKey(vasp);
    let row = rows.get(key);
    if (!row) {
      // The row keeps the spelling it was first seen with.
      row = { vasp, wallets: [] };
      rows.set(key, row);
    }
    return row;
  };

  for (const entry of file.entries) {
    switch (entry.status) {
      case "pending":
        view.pending.push(entry);
        continue;
      case "unreadable":
        view.unreadable.push(entry);
        continue;
      case "screened-only":
        view.screenedOnly.push(entry);
        continue;
      case "failed":
        view.failed.push(entry);
        continue;
    }
    const record = entry.record;
    if (!record || !record.readable || !record.traced) continue;
    if (!record.outbound && record.inbound.length === 0) {
      view.unrouted.push(entry);
      continue;
    }
    const caseRefs = entryCaseRefs(entry);
    const base = { entryId: entry.id, wallet: entry.wallet, chain: entry.chain };
    if (record.outbound) {
      const o = record.outbound;
      rowFor(o.vasp).wallets.push({
        ...base,
        direction: "outbound",
        caseRefs: [...caseRefs],
        account: o.account,
        usdt: o.usdt,
        confidence: o.confidence,
        source: o.source,
        evidence: o.evidence,
        txHashes: [...o.txHashes],
      });
    }
    for (const i of record.inbound) {
      rowFor(i.vasp).wallets.push({
        ...base,
        direction: "inbound",
        caseRefs: [...caseRefs],
        account: null,
        usdt: i.paidUsdt,
        confidence: i.confidence,
        source: i.source,
        evidence: null,
        txHashes: [],
      });
    }
  }

  for (const [key, { vasp, wallets }] of rows) {
    const caseRefs: string[] = [];
    for (const w of wallets) for (const ref of w.caseRefs) if (!caseRefs.includes(ref)) caseRefs.push(ref);
    const sum = (direction: RoutedWallet["direction"]) =>
      round2(wallets.filter((w) => w.direction === direction).reduce((s, w) => s + w.usdt, 0));
    const entryIds = [...new Set(wallets.map((w) => w.entryId))];
    const request = latestRequest(file.requests, key);
    const sorted = [...wallets].sort(
      (a, b) =>
        (a.direction === "outbound" ? 0 : 1) - (b.direction === "outbound" ? 0 : 1) || b.usdt - a.usdt,
    );
    view.rows.push({
      vasp,
      fiu: fiuListing(vasp),
      le: leContact(vasp),
      wallets: sorted,
      caseRefs,
      outboundUsdt: sum("outbound"),
      inboundUsdt: sum("inbound"),
      canFreeze: wallets.some((w) => w.direction === "outbound"),
      request,
      uncoveredEntryIds: request ? entryIds.filter((id) => !request.entryIds.includes(id)) : [],
    });
  }

  const walletCount = (row: VaspRow) => new Set(row.wallets.map((w) => w.entryId)).size;
  view.rows.sort((a, b) => walletCount(b) - walletCount(a) || a.vasp.localeCompare(b.vasp, "en"));
  return view;
}
