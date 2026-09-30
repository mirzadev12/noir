/**
 * One consolidated request per VASP, what it asks, what the VASP did with it,
 * and the letter it prints. Pure, like `lib/desk.ts`.
 *
 * The asks are fixed and few. A freeze needs an account to freeze, so it may
 * be asked only of a VASP the desk has an outbound account at. No statute is
 * ever printed: the letter's legal basis is blank, for the officer to write.
 * Status is what the officer records, in order: drafted, then sent, then any
 * answer the VASP gives, as often as it gives one. Recording "sent" says the
 * officer sent it; NOIR sends nothing and is not connected to SAHYOG.
 */

import { groupByVasp, vaspKey } from "./desk";
import {
  ASKS,
  REQUEST_STATUSES,
  type Ask,
  type DeskFile,
  type RequestLetter,
  type RequestStatus,
  type RoutedWallet,
  type StatusChange,
  type VaspRequest,
  type VaspRow,
} from "./desk-types";
import type { Actor } from "./identity";

export const ASK_LABEL: Record<Ask, string> = {
  kyc: "Identity (KYC) of the account holder",
  "access-logs": "IP addresses, device and login records",
  transactions: "Transaction history of the named accounts",
  preservation: "Preservation of all records pending legal process",
  freeze: "Freeze of balances in the named accounts",
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  drafted: "Drafted",
  sent: "Sent",
  acknowledged: "Acknowledged",
  "data-received": "Data received",
  frozen: "Frozen",
  refused: "Refused",
  "no-response": "No response",
};

const MAX_REFERENCE = 80;
const MAX_NOTE = 500;

/** Everything may be asked, except a freeze of a VASP where no account is known. */
export function allowedAsks(row: VaspRow): Ask[] {
  return ASKS.filter((a) => a !== "freeze" || row.canFreeze);
}

/**
 * Draft a request to the VASP a desk row is filed under. It covers the row's
 * wallets as they are now; wallets filed later are not in it. Pushed onto
 * `file.requests`.
 */
export function draftRequest(
  file: DeskFile,
  vasp: string,
  asks: Ask[],
  by: Actor,
  now: string,
  newId: () => string,
): { ok: true; request: VaspRequest } | { ok: false; error: string } {
  const key = vaspKey(vasp);
  const row = groupByVasp(file).rows.find((r) => vaspKey(r.vasp) === key);
  if (!row) return { ok: false, error: `No wallet on the desk is filed under ${vasp}.` };
  if (!Array.isArray(asks) || asks.length === 0) return { ok: false, error: "Choose at least one thing to ask." };
  const allowed = allowedAsks(row);
  for (const ask of asks) {
    if (!(ASKS as readonly string[]).includes(ask)) return { ok: false, error: `'${ask}' is not something NOIR asks.` };
    if (!allowed.includes(ask)) {
      return { ok: false, error: `A freeze cannot be asked of ${row.vasp}: no account there is known.` };
    }
  }
  const request: VaspRequest = {
    id: newId(),
    vasp: row.vasp,
    asks: ASKS.filter((a) => asks.includes(a)),
    entryIds: [...new Set(row.wallets.map((w) => w.entryId))],
    history: [{ status: "drafted", at: now, by, on: null, reference: null, note: null }],
  };
  file.requests.push(request);
  return { ok: true, request };
}

export function currentStatus(request: VaspRequest): RequestStatus {
  return request.history[request.history.length - 1].status;
}

/** Trimmed text, null when empty, or an error when longer than `max`. */
function optionalText(value: string | null | undefined, max: number, what: string): { value: string | null } | { error: string } {
  if (value === null || value === undefined) return { value: null };
  if (typeof value !== "string") return { error: `The ${what} must be text.` };
  const text = value.trim();
  if (!text) return { value: null };
  if (text.length > max) return { error: `The ${what} is at most ${max} characters.` };
  return { value: text };
}

function isCalendarDay(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === s;
}

/**
 * Record what happened to a request. The first change must be `sent`; after
 * that any answer, in any order, repeats allowed. `drafted` is only ever the
 * first status. Mutates `request`.
 */
export function changeStatus(
  request: VaspRequest,
  change: { status: RequestStatus; on?: string | null; reference?: string | null; note?: string | null },
  by: Actor,
  now: string,
): { ok: true } | { ok: false; error: string } {
  const status = change.status;
  if (!(REQUEST_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: `'${status}' is not a request status.` };
  }
  if (status === "drafted") return { ok: false, error: "A request is drafted only once, when it is made." };
  const current = currentStatus(request);
  if (current === "drafted" && status !== "sent") {
    return { ok: false, error: "Record the request as sent before recording an answer." };
  }
  if (current !== "drafted" && status === "sent") {
    return { ok: false, error: "The request is already recorded as sent." };
  }

  const on = optionalText(change.on, MAX_REFERENCE, "date");
  if ("error" in on) return { ok: false, error: on.error };
  if (on.value !== null && !isCalendarDay(on.value)) {
    return { ok: false, error: "The date must be a calendar day written YYYY-MM-DD." };
  }
  const reference = optionalText(change.reference, MAX_REFERENCE, "reference");
  if ("error" in reference) return { ok: false, error: reference.error };
  const note = optionalText(change.note, MAX_NOTE, "note");
  if ("error" in note) return { ok: false, error: note.error };

  const entry: StatusChange = {
    status,
    at: now,
    by,
    on: on.value,
    reference: reference.value,
    note: note.value,
  };
  request.history.push(entry);
  return { ok: true };
}

/**
 * The request as a document. With a request, it prints what that request
 * asked and the wallets it covered; without one, a draft of everything that
 * may be asked about every wallet in the row. The legal basis is blank.
 */
export function buildLetter(row: VaspRow, request: VaspRequest | null, now: string): RequestLetter {
  const wallets: RoutedWallet[] = request
    ? row.wallets.filter((w) => request.entryIds.includes(w.entryId))
    : [...row.wallets];
  const caseRefs: string[] = [];
  for (const w of wallets) for (const ref of w.caseRefs) if (!caseRefs.includes(ref)) caseRefs.push(ref);
  return {
    requestId: request ? request.id : null,
    vasp: row.vasp,
    addressee: row.fiu ? row.fiu.legalName : row.vasp,
    fiu: row.fiu,
    le: row.le,
    asks: request ? [...request.asks] : allowedAsks(row),
    canFreeze: row.canFreeze,
    wallets,
    caseRefs,
    legalBasis: "",
    generatedAt: now,
  };
}

/**
 * The request as data another system can take in: the same content as the
 * letter, keyed for an integration. NOIR is built to route into SAHYOG and the
 * package says, in its own field, that the integration is designed and not
 * live. Like the letter, it carries no statute.
 */
export function requestPackage(letter: RequestLetter, request: VaspRequest) {
  const last = request.history[request.history.length - 1];
  return {
    schema: "noir-request-v1" as const,
    sahyog: "designed, not integrated" as const,
    generatedAt: letter.generatedAt,
    request: {
      id: request.id,
      status: last.status,
      draftedAt: request.history[0].at,
      draftedBy: request.history[0].by,
      history: request.history,
    },
    addressee: {
      vasp: letter.vasp,
      legalName: letter.fiu?.legalName ?? null,
      fiuIndListed: letter.fiu !== null,
      channel: letter.le && letter.le.found ? letter.le.channels : null,
    },
    asks: letter.asks.map((code) => ({ code, text: ASK_LABEL[code] })),
    legalBasis: letter.legalBasis,
    caseRefs: letter.caseRefs,
    accounts: letter.wallets.map((w) => ({
      wallet: w.wallet,
      chain: w.chain,
      direction: w.direction,
      account: w.account,
      usdt: w.usdt,
      confidence: w.confidence,
      evidenceTier: w.source,
      txHashes: w.txHashes,
      caseRefs: w.caseRefs,
    })),
  };
}
