/**
 * The shared case file — the rules, kept free of files (`tests/case-file.test.mjs`).
 *
 * The committed register (`public/mock/cases.json`) is the same for everyone
 * and never changes. This is the other half: runs officers traced on this
 * server and chose to keep, visible to every officer who opens the same
 * server's Case queue.
 *
 * **A saved case is made from the server's own record, never from what a
 * browser sends.** The browser names a run — its address and its findings
 * fingerprint — and the server looks for the trace it recorded with that
 * fingerprint in its audit log (`lib/audit-store.ts`). Only a run this server
 * actually traced can be saved, and the disposition, exit and amounts shown for
 * it are the ones the server computed. Opening a saved case replays that exact
 * run: the same amount and window, the chain as it stood when it was read.
 *
 * This is also what `GET /api/cases` in AGENTS.md §5 always asked for — a
 * `CaseSummary[]` — and it stayed unbuilt until there was a record honest
 * enough to serve through it.
 */

import type { AuditEntry } from "./audit";
import type { ChainName } from "./chain-client";
import { groupByVasp, vaspKey } from "./desk";
import type { Ask, CaseClosure, DeskEntry, DeskFile, EntryStatus, RequestStatus, StatusChange } from "./desk-types";
import { toCsv } from "./export";
import { fiuListing } from "./fiu";
import { readActor, type Actor } from "./identity";
import { leContact } from "./le-contacts";
import { evidenceWord, tierName } from "./noir-format";
import { STOP_LINE } from "./noir-view";
import { currentStatus } from "./requests";
import type { CaseSummary, TriageLevel } from "./types";

export interface SavedCase extends CaseSummary {
  /** The hash of the audit entry recording the trace: unique to that answer. */
  id: string;
  chain: ChainName;
  /** The audit entry this case was saved from. */
  entry: number;
  fingerprint: string;
  provenance: "live" | "recorded";
  savedAt: string;
  savedBy: Actor;
  /** The exact run: opening it replays the trace as the server read it. */
  href: string;
}

export const MAX_CASES = 500;

const TRIAGE: readonly TriageLevel[] = ["HOT", "WARM", "COLD"];

/** `/trace/…` for exactly this run. An automatic amount or window stays automatic. */
export function runHref(
  address: string,
  run: { amount: unknown; since: unknown; asOf: string; model: unknown; chain?: unknown },
): string {
  const q = new URLSearchParams();
  if (typeof run.amount === "number" && run.amount > 0) q.set("amount", String(run.amount));
  if (typeof run.since === "string" && run.since !== "auto") q.set("since", run.since);
  q.set("asof", run.asOf);
  if (run.model === "fifo") q.set("model", "fifo");
  // A 0x address on Polygon is said in the link, or it would replay on Ethereum.
  if (run.chain === "polygon") q.set("chain", "polygon");
  return `/trace/${encodeURIComponent(address)}?${q}`;
}

/** The saved case for a recorded trace, or null when the entry is not a usable trace. */
export function caseFromEntry(entry: AuditEntry, savedBy: Actor, savedAt: string): SavedCase | null {
  const d = entry.detail;
  if (
    entry.action !== "trace" ||
    !entry.address ||
    !entry.chain ||
    typeof d.caseId !== "string" ||
    typeof d.triage !== "string" ||
    !TRIAGE.includes(d.triage as TriageLevel) ||
    typeof d.reportedAmountUsdt !== "number" ||
    typeof d.fraudDate !== "string" ||
    typeof d.asOf !== "string" ||
    typeof d.fingerprint !== "string" ||
    (d.provenance !== "live" && d.provenance !== "recorded")
  ) {
    return null;
  }
  return {
    id: entry.hash,
    caseId: d.caseId,
    inputAddress: entry.address,
    chain: entry.chain,
    reportedAmountUsdt: d.reportedAmountUsdt,
    fraudDate: d.fraudDate,
    triage: d.triage as TriageLevel,
    terminalEntity: typeof d.exit === "string" ? d.exit : null,
    entry: entry.seq,
    fingerprint: d.fingerprint,
    provenance: d.provenance,
    savedAt,
    savedBy,
    href: runHref(entry.address, { amount: d.amount, since: d.since, asOf: d.asOf, model: d.model, chain: entry.chain }),
  };
}

/** One answer is one case: saving the same run twice keeps the first. */
export function addCase(
  cases: SavedCase[],
  saved: SavedCase,
): { ok: true; already: boolean; case: SavedCase } | { ok: false; error: string } {
  const held = cases.find((c) => c.inputAddress === saved.inputAddress && c.fingerprint === saved.fingerprint);
  if (held) return { ok: true, already: true, case: held };
  if (cases.length >= MAX_CASES) return { ok: false, error: "The case file is full." };
  cases.push(saved);
  return { ok: true, already: false, case: saved };
}

/**
 * The same order as the register: what can still be done first — CRITICAL,
 * then SUSPICIOUS, then CLOSED — and within each the largest sum at stake, then
 * the most recent fraud.
 */
export function sortCases(cases: SavedCase[]): SavedCase[] {
  return [...cases].sort(
    (a, b) =>
      TRIAGE.indexOf(a.triage) - TRIAGE.indexOf(b.triage) ||
      b.reportedAmountUsdt - a.reportedAmountUsdt ||
      Date.parse(b.fraudDate) - Date.parse(a.fraudDate),
  );
}

/** The file as read back, trusting nothing in it. */
export function readCases(value: unknown): SavedCase[] {
  if (!Array.isArray(value)) return [];
  const out: SavedCase[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, unknown>;
    if (
      typeof c.id !== "string" ||
      typeof c.caseId !== "string" ||
      typeof c.inputAddress !== "string" ||
      (c.chain !== "tron" && c.chain !== "ethereum" && c.chain !== "polygon") ||
      typeof c.reportedAmountUsdt !== "number" ||
      typeof c.fraudDate !== "string" ||
      typeof c.triage !== "string" ||
      !TRIAGE.includes(c.triage as TriageLevel) ||
      (c.terminalEntity !== null && typeof c.terminalEntity !== "string") ||
      !Number.isInteger(c.entry) ||
      typeof c.fingerprint !== "string" ||
      (c.provenance !== "live" && c.provenance !== "recorded") ||
      typeof c.savedAt !== "string" ||
      typeof c.href !== "string" ||
      !c.href.startsWith("/trace/")
    ) {
      continue;
    }
    out.push({
      id: c.id,
      caseId: c.caseId,
      inputAddress: c.inputAddress,
      chain: c.chain,
      reportedAmountUsdt: c.reportedAmountUsdt,
      fraudDate: c.fraudDate,
      triage: c.triage as TriageLevel,
      terminalEntity: c.terminalEntity as string | null,
      entry: c.entry as number,
      fingerprint: c.fingerprint,
      provenance: c.provenance,
      savedAt: c.savedAt,
      savedBy: readActor(c.savedBy),
      href: c.href,
    });
  }
  return out;
}

/* -------------------------------------------------------------------------
   Case close-out on the desk.

   On the desk a case is a case reference: the string wallets were filed under.
   The unit can close one when it is done with it and reopen it later. Closing
   files nothing and removes nothing; it records who closed it, when and why,
   and from then on a filing that names the case is refused until it is
   reopened. A case's whole file (its wallets, the VASPs they reach, the
   requests that cover them and the audit lines about them) can be taken away
   as one document at any time, closed or not.

   The rules are here, free of files; the closures are kept by
   `lib/case-store.ts`.
   ------------------------------------------------------------------------- */

export const MAX_CLOSE_NOTE = 500;

const isIso = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v) && !Number.isNaN(Date.parse(v));

/** The closures as read back, trusting nothing in the file. */
export function readClosures(value: unknown): CaseClosure[] {
  if (!Array.isArray(value)) return [];
  const out: CaseClosure[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const c = raw as Record<string, unknown>;
    if (typeof c.caseRef !== "string" || !c.caseRef || !isIso(c.closedAt)) continue;
    if (out.some((held) => held.caseRef === c.caseRef)) continue;
    out.push({ caseRef: c.caseRef, closedAt: c.closedAt, by: readActor(c.by), note: typeof c.note === "string" && c.note ? c.note : null });
  }
  return out;
}

/** The closure of a case, matched exactly as it was filed, or null when it is open. */
export function closureOf(closures: CaseClosure[], caseRef: string | null): CaseClosure | null {
  if (caseRef === null) return null;
  return closures.find((c) => c.caseRef === caseRef) ?? null;
}

const filedUnder = (file: DeskFile, caseRef: string) => file.entries.filter((e) => e.filings.some((f) => f.caseRef === caseRef));

export type CaseRefusal = { ok: false; status: 404 | 409 | 422; error: string };

/** What was still in motion when a case was closed. */
export interface StillOpen {
  pendingWallets: number;
  requestsAwaiting: number;
  requestsNotSent: number;
}

/**
 * Close a case. Never refused because work is still in motion; what was is
 * counted and returned, so the screen can say it. Mutates `closures`.
 */
export function closeCase(
  closures: CaseClosure[],
  file: DeskFile,
  caseRef: string,
  note: string | null | undefined,
  by: Actor,
  now: string,
): { ok: true; closed: CaseClosure; open: StillOpen } | CaseRefusal {
  const wallets = filedUnder(file, caseRef);
  if (wallets.length === 0) return { ok: false, status: 404, error: "No wallet on the desk is filed under that case reference." };
  if (closureOf(closures, caseRef)) return { ok: false, status: 409, error: `Case '${caseRef}' is already closed.` };
  const text = typeof note === "string" ? note.replace(/\s+/g, " ").trim() : "";
  if (text.length > MAX_CLOSE_NOTE) return { ok: false, status: 422, error: `The note is at most ${MAX_CLOSE_NOTE} characters.` };

  const ids = new Set(wallets.map((e) => e.id));
  const covering = file.requests.filter((r) => r.entryIds.some((id) => ids.has(id)));
  const closed: CaseClosure = { caseRef, closedAt: now, by, note: text || null };
  closures.push(closed);
  return {
    ok: true,
    closed,
    open: {
      pendingWallets: wallets.filter((e) => e.status === "pending").length,
      requestsAwaiting: covering.filter((r) => currentStatus(r) === "sent").length,
      requestsNotSent: covering.filter((r) => currentStatus(r) === "drafted").length,
    },
  };
}

/** Reopen a closed case. Mutates `closures`. */
export function reopenCase(closures: CaseClosure[], caseRef: string): { ok: true } | CaseRefusal {
  const i = closures.findIndex((c) => c.caseRef === caseRef);
  if (i === -1) return { ok: false, status: 409, error: `Case '${caseRef}' is not closed.` };
  closures.splice(i, 1);
  return { ok: true };
}

/** One wallet of a case, as the case file states it: words for evidence, never a number that reads as accuracy. */
export interface CaseFileWallet {
  entryId: string;
  wallet: string;
  chain: string;
  status: EntryStatus;
  /** Each time it was filed under this case. */
  filedAt: string[];
  /** Other case references it is also filed under. */
  otherCases: string[];
  readAt: string | null;
  basis: "live" | "recorded" | null;
  outbound: { vasp: string; account: string; usdt: number; evidenceSeen: string; tier: string; evidence: string | null; txHashes: string[] } | null;
  /** Why no VASP was named outbound, when none was. */
  outboundStop: string | null;
  inbound: { vasp: string; payers: number; paidUsdt: number; evidenceSeen: string; tier: string }[];
  /** Explorer tags, verbatim. Leads, never attributions. */
  leads: { tag: string; payers: number; paidUsdt: number }[];
  ofac: { entity: string; program: string | null } | null;
  typologies: { code: string; reason: string; at: string }[];
  responseHashes: string[];
}

export interface CaseFile {
  schema: "noir-case-file-v1";
  generatedAt: string;
  caseRef: string;
  closed: CaseClosure | null;
  wallets: CaseFileWallet[];
  vasps: { vasp: string; legalName: string | null; fiuListed: boolean; leChannel: string | null; wallets: number; outboundUsdt: number; inboundUsdt: number }[];
  requests: { id: string; vasp: string; asks: Ask[]; status: RequestStatus; coversWallets: string[]; history: StatusChange[] }[];
  audit: { intact: boolean; head: string | null; entries: AuditEntry[] };
  notes: string[];
}

export const CASE_FILE_NOTES = [
  "Attribution is a deterministic lookup of public blockchain data against a table of exchange wallets and deposit addresses. No language model decides it.",
  "Evidence seen says how much evidence was seen, from limited to strong. It is never a probability that an attribution is correct.",
  "A wallet that could not be read is stated as unreadable. It is never reported as empty.",
  "An explorer tag is listed as a lead, exactly as written. It files no wallet under a VASP.",
  "No legal basis is stated here or on any request; the officer supplies it.",
  "NOIR sends nothing. It is built to route into SAHYOG and is not integrated with it; a status is what the officer recorded.",
  "Amounts are USDT. Times are UTC.",
];

function walletOf(entry: DeskEntry, caseRef: string): CaseFileWallet {
  const r = entry.record;
  const read = r && r.readable ? r : null;
  const others: string[] = [];
  for (const f of entry.filings) if (f.caseRef !== null && f.caseRef !== caseRef && !others.includes(f.caseRef)) others.push(f.caseRef);
  return {
    entryId: entry.id,
    wallet: entry.wallet,
    chain: entry.chain,
    status: entry.status,
    filedAt: entry.filings.filter((f) => f.caseRef === caseRef).map((f) => f.at),
    otherCases: others,
    readAt: r ? r.provenance.generatedAt : null,
    basis: r ? r.provenance.basis : null,
    outbound: read?.outbound
      ? {
          vasp: read.outbound.vasp,
          account: read.outbound.account,
          usdt: read.outbound.usdt,
          evidenceSeen: evidenceWord(read.outbound.confidence),
          tier: tierName(read.outbound.source),
          evidence: read.outbound.evidence,
          txHashes: [...read.outbound.txHashes],
        }
      : null,
    outboundStop: read && !read.outbound && read.outboundStop ? STOP_LINE[read.outboundStop] : null,
    inbound: read ? read.inbound.map((i) => ({ vasp: i.vasp, payers: i.payers, paidUsdt: i.paidUsdt, evidenceSeen: evidenceWord(i.confidence), tier: tierName(i.source) })) : [],
    leads: read ? read.inboundLeads.map((l) => ({ tag: l.tag, payers: l.payers, paidUsdt: l.paidUsdt })) : [],
    ofac: r?.sanctioned ? { entity: r.sanctioned.entity, program: r.sanctioned.program } : null,
    typologies: read ? (read.typologies ?? []).map((t) => ({ code: t.code, reason: t.reason, at: t.at })) : [],
    responseHashes: r ? [...r.provenance.responseHashes] : [],
  };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * A case's whole file, or null when nothing on the desk is filed under it.
 * Every figure is counted within the case: a VASP's wallet count and USDT are
 * this case's wallets only, and a request names only the wallets of this case
 * that it covers, though it may cover other cases' wallets too. `audit` is the
 * log as read; only the lines about this case's wallets, its requests and its
 * own closing are kept.
 */
export function caseFileOf(
  file: DeskFile,
  closures: CaseClosure[],
  caseRef: string,
  audit: { entries: (AuditEntry | null)[]; check: { intact: boolean; head?: string } },
  now: string,
): CaseFile | null {
  const entries = filedUnder(file, caseRef);
  if (entries.length === 0) return null;
  const ids = new Set(entries.map((e) => e.id));

  const vasps: CaseFile["vasps"] = [];
  for (const row of groupByVasp(file).rows) {
    const mine = row.wallets.filter((w) => ids.has(w.entryId));
    if (mine.length === 0) continue;
    const sum = (direction: "outbound" | "inbound") => round2(mine.filter((w) => w.direction === direction).reduce((s, w) => s + w.usdt, 0));
    const le = leContact(row.vasp);
    const fiu = fiuListing(row.vasp);
    vasps.push({
      vasp: row.vasp,
      legalName: fiu ? fiu.legalName : null,
      fiuListed: fiu !== null,
      leChannel: le && le.found && le.channels.length > 0 ? le.channels[0].href : null,
      wallets: new Set(mine.map((w) => w.entryId)).size,
      outboundUsdt: sum("outbound"),
      inboundUsdt: sum("inbound"),
    });
  }

  const requests = file.requests
    .filter((r) => r.entryIds.some((id) => ids.has(id)))
    .map((r) => ({
      id: r.id,
      vasp: r.vasp,
      asks: [...r.asks],
      status: currentStatus(r),
      coversWallets: r.entryIds.filter((id) => ids.has(id)),
      history: r.history.map((h) => ({ ...h })),
    }));
  const requestIds = new Set(requests.map((r) => r.id));

  // A request's VASP may have no row left (its wallets are being read again): name it all the same.
  for (const r of requests) {
    if (vasps.some((v) => vaspKey(v.vasp) === vaspKey(r.vasp))) continue;
    const fiu = fiuListing(r.vasp);
    vasps.push({ vasp: r.vasp, legalName: fiu ? fiu.legalName : null, fiuListed: fiu !== null, leChannel: null, wallets: 0, outboundUsdt: 0, inboundUsdt: 0 });
  }

  const about = (e: AuditEntry | null): e is AuditEntry => {
    if (!e) return false;
    if (typeof e.detail.entryId === "string") return ids.has(e.detail.entryId);
    if (typeof e.detail.requestId === "string") return requestIds.has(e.detail.requestId);
    return (e.action === "case.closed" || e.action === "case.reopened") && e.detail.caseRef === caseRef;
  };

  return {
    schema: "noir-case-file-v1",
    generatedAt: now,
    caseRef,
    closed: closureOf(closures, caseRef),
    wallets: entries.map((e) => walletOf(e, caseRef)),
    vasps,
    requests,
    audit: { intact: audit.check.intact, head: audit.check.intact ? (audit.check.head ?? null) : null, entries: audit.entries.filter(about) },
    notes: [...CASE_FILE_NOTES],
  };
}

const CASE_CSV_HEADER = ["wallet", "chain", "direction", "vasp", "account", "usdt", "evidence_seen", "tier", "read_at_utc", "basis", "status", "other_cases"];

/** The case file's wallets as CSV: one row per wallet and direction; a wallet that reached no VASP has one row with no direction. */
export function caseFileCsv(doc: CaseFile): string {
  const rows: (string | number | null)[][] = [];
  for (const w of doc.wallets) {
    const tail = [w.readAt, w.basis, w.status, w.otherCases.join("; ")];
    if (w.outbound) rows.push([w.wallet, w.chain, "outbound", w.outbound.vasp, w.outbound.account, w.outbound.usdt, w.outbound.evidenceSeen, w.outbound.tier, ...tail]);
    for (const i of w.inbound) rows.push([w.wallet, w.chain, "inbound", i.vasp, null, i.paidUsdt, i.evidenceSeen, i.tier, ...tail]);
    if (!w.outbound && w.inbound.length === 0) rows.push([w.wallet, w.chain, null, null, null, null, null, null, ...tail]);
  }
  return toCsv(CASE_CSV_HEADER, rows);
}

/** A case reference as a file name: letters and digits kept, everything else a dash. */
export function caseFileName(caseRef: string, ext: "json" | "csv"): string {
  const safe =
    caseRef
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "case";
  return `noir-case-${safe}.${ext}`;
}
