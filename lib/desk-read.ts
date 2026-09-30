/**
 * What the desk's pages read, in one place. Server-only.
 *
 * A server page reads the desk file directly (the same one the API serves), so
 * a page and `GET /api/desk` can never disagree. Each reader answers
 * `{ ok: true, value }` or `{ ok: false, reason }`: a desk file that cannot be
 * read is said so on the page, in words, exactly as the API answers 503. It is
 * never drawn as an empty desk — a shared desk must not appear to vanish.
 */

import { groupByCase, vaspResponse, type CaseRow, type VaspResponse } from "./analytics";
import { groupByVasp, vaspKey } from "./desk";
import { loadDesk } from "./desk-store";
import type { Ask, DeskEntry, DeskView, RequestLetter, VaspRequest, VaspRow } from "./desk-types";
import { kickDesk } from "./desk-worker";
import { watchList, type WatchAsk } from "./movement";
import { isSanctioned } from "./noir-view";
import { allowedAsks, buildLetter } from "./requests";

export type Read<T> = { ok: true; value: T } | { ok: false; reason: string };

async function guard<T>(fn: () => Promise<T>): Promise<Read<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "its storage could not be used" };
  }
}

const newestFirst = (a: VaspRequest, b: VaspRequest) => b.history[0].at.localeCompare(a.history[0].at);

export interface DeskPage {
  view: DeskView;
  /** Filed wallets that are OFAC-listed, or whose trail ended at a listed address, wherever they sit on the desk. */
  flagged: DeskEntry[];
  /** The wallets the desk has read, to ask the chains whether they have sent USDT since. */
  watch: WatchAsk[];
  /** How many wallets could be asked about; more than `watch` holds when the desk is over the cap. */
  watchable: number;
}

/** The desk grouped by VASP. Wakes the worker when wallets are waiting, as the API does. */
export function readDeskView(): Promise<Read<DeskPage>> {
  return guard(async () => {
    const file = await loadDesk();
    if (file.entries.some((e) => e.status === "pending")) kickDesk();
    return { view: groupByVasp(file), flagged: file.entries.filter(isSanctioned), watch: watchList(file.entries), watchable: watchList(file.entries, Infinity).length };
  });
}

export interface VaspPage {
  row: VaspRow;
  allowed: Ask[];
  letter: RequestLetter;
  /** Every request ever drafted to this VASP, newest first. */
  requests: VaspRequest[];
  /** The desk entries behind the row's wallets, by id: what the row itself does not carry (an OFAC listing). */
  entries: Record<string, DeskEntry>;
}

/** One VASP's row, or null when nothing on the desk routes to it. */
export function readVasp(name: string): Promise<Read<VaspPage | null>> {
  return guard(async () => {
    const file = await loadDesk();
    const key = vaspKey(name);
    const row = groupByVasp(file).rows.find((r) => vaspKey(r.vasp) === key);
    if (!row) return null;
    const ids = new Set(row.wallets.map((w) => w.entryId));
    return {
      row,
      allowed: allowedAsks(row),
      letter: buildLetter(row, row.request, new Date().toISOString()),
      requests: file.requests.filter((r) => vaspKey(r.vasp) === key).sort(newestFirst),
      entries: Object.fromEntries(file.entries.filter((e) => ids.has(e.id)).map((e) => [e.id, e])),
    };
  });
}

export interface RegisterPage {
  requests: { request: VaspRequest; row: VaspRow | null }[];
  responses: VaspResponse[];
}

/** Every request on the desk, newest first, and how each VASP has answered. */
export function readRegister(): Promise<Read<RegisterPage>> {
  return guard(async () => {
    const file = await loadDesk();
    const rows = groupByVasp(file).rows;
    return {
      requests: [...file.requests].sort(newestFirst).map((request) => ({
        request,
        row: rows.find((r) => vaspKey(r.vasp) === vaspKey(request.vasp)) ?? null,
      })),
      responses: vaspResponse(file.requests),
    };
  });
}

/** Every case reference on the desk with its wallets, the VASPs they reach and its requests. */
export function readCases(): Promise<Read<CaseRow[]>> {
  return guard(async () => groupByCase(await loadDesk()));
}

export interface WalletPage {
  entry: DeskEntry;
  /** The same string filed on another chain: a 0x address is a different wallet on each. */
  siblings: DeskEntry[];
  /** Requests whose snapshot included this wallet, newest first. */
  requests: VaspRequest[];
}

const sameString = (a: string, b: string) => (/^0x/i.test(a) ? a.toLowerCase() === b.toLowerCase() : a === b);

/** A bare address is Ethereum when it is 0x, TRON otherwise; only Polygon (or another chain) has to be said. */
const chainOfForm = (address: string) => (/^0x/i.test(address) ? "ethereum" : "tron");

/** A filed wallet by address and chain (the chain in the link, else the address's own form), or null. */
export function readWallet(address: string, chain: string | null): Promise<Read<WalletPage | null>> {
  return guard(async () => {
    const file = await loadDesk();
    const same = file.entries.filter((e) => sameString(e.wallet, address));
    const wanted = chain ?? chainOfForm(address);
    const entry = same.find((e) => e.chain === wanted) ?? (chain ? undefined : same[0]);
    if (!entry) return null;
    return {
      entry,
      siblings: same.filter((e) => e.id !== entry.id),
      requests: file.requests.filter((r) => r.entryIds.includes(entry.id)).sort(newestFirst),
    };
  });
}
