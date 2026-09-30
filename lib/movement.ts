/**
 * Movement since a wallet was read.
 *
 * An attribution is true as of the moment the chain was read. A wallet filed
 * last week may have sent more money since, to an account no request covers.
 * The desk asks the chain one narrow question about each wallet it has read:
 * has it sent USDT since then? (`POST /api/watch`, one request per wallet.)
 *
 * The answer is one of three and never two: moved, not moved, or not checked
 * because the chain did not answer. A wallet that could not be checked is never
 * counted as not moved.
 *
 * Pure: which wallets to ask about, and how the answers are summed.
 */

import type { DeskEntry } from "./desk-types";
import { watchKey, type WatchMovement, type WatchResult } from "./watch";

/** The same cap as `/api/watch`. */
export const MAX_WATCHED = 25;

export interface WatchAsk {
  address: string;
  /** When the chain was read; movement is asked about from this moment on. */
  since: string;
  chain?: "polygon";
}

/** Every wallet the desk has read, most traced money first, at most `max`. */
export function watchList(entries: DeskEntry[], max = MAX_WATCHED): WatchAsk[] {
  const seen = new Set<string>();
  return entries
    .filter((e) => e.status === "attributed" && e.record !== null && e.record.traced && e.record.readable)
    .map((e, i) => ({ e, i, usdt: e.record?.outbound?.usdt ?? 0 }))
    .sort((a, b) => b.usdt - a.usdt || a.i - b.i)
    .map(({ e }) => ({
      address: e.wallet,
      since: e.record!.provenance.generatedAt,
      ...(e.chain === "polygon" ? { chain: "polygon" as const } : {}),
    }))
    .filter((ask) => {
      const key = watchKey(ask);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

export interface MovedWallet {
  address: string;
  chain: "polygon" | undefined;
  transfers: number;
  usdt: number;
  /** False when the chain held more transfers than one check reads: the figures are a floor. */
  complete: boolean;
  first: string;
  latest: WatchMovement;
}

export interface MovementSummary {
  /** Most USDT first. */
  moved: MovedWallet[];
  still: number;
  unchecked: number;
}

export function movementSummary(results: WatchResult[]): MovementSummary {
  const moved: MovedWallet[] = [];
  let still = 0;
  let unchecked = 0;
  for (const r of results) {
    if (r.status === "still") still += 1;
    else if (r.status === "unchecked") unchecked += 1;
    else if (r.movements.length > 0) {
      const byTime = [...r.movements].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      moved.push({
        address: r.address,
        chain: r.chain,
        transfers: byTime.length,
        usdt: byTime.reduce((sum, m) => sum + m.valueUsdt, 0),
        complete: r.complete,
        first: byTime[0].timestamp,
        latest: byTime[byTime.length - 1],
      });
    }
  }
  moved.sort((a, b) => b.usdt - a.usdt);
  return { moved, still, unchecked };
}
