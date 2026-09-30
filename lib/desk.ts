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

/**
 * Store the worker's answer for an entry. The status follows from the record:
 * unread → `unreadable`, untraced chain → `screened-only`, else `attributed`.
 * A thrown attribution is `failed` with its reason; the last record written,
 * if any, is kept as it was, never replaced by nothing.
 */
export function setRecord(
  file: DeskFile,
  id: string,
  result: { record: AttributionRecord } | { error: string },
  now: string,
): DeskEntry | null {
  const entry = file.entries.find((e) => e.id === id);
  if (!entry) return null;
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
  return entry;
}

/** Queue an entry to be attributed again. Its last record stays until a new one is written. */
export function markPending(file: DeskFile, id: string): DeskEntry | null {
  const entry = file.entries.find((e) => e.id === id);
  if (!entry) return null;
  entry.status = "pending";
  entry.error = null;
  return entry;
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
