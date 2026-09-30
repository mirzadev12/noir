/**
 * What the landing page shows, computed from the repository's own data when the
 * site is built — nothing on it is typed in.
 *
 *  - `landingRoute()` is a real recorded case run through the same attribution
 *    the desk uses, offline: the trace is the frozen one captured from the
 *    chain, and every network dependency is refused, so it cannot answer for
 *    anything it does not hold.
 *  - `landingTrace()` is the recorded wallet that routes both ways: its
 *    attribution, the OFAC-listed address its money also reached, and the
 *    transfers the chain read held, for the trace graph and its ticker.
 *  - `landingFigures()` counts the registry, the OFAC lists and the PS-26182
 *    checklist.
 *
 * Server-only (attribution reads the recorded cases).
 */

import { attributeWallet } from "./attribute";
import { coverageCounts } from "./coverage";
import { frozenTrace } from "./demo";
import type { AttributionRecord } from "./desk-types";
import { listedContact } from "./listed-contact";
import type { PayersTrace } from "./payers";
import { registryTotals } from "./registry";
import type { ListedContact } from "./trace-graph";
import demoPayers from "../data/demo-payers.json";
import riskLists from "../data/risk-lists.json";
import multichain from "../data/sanctions-multichain.json";

/** A recorded Ethereum case whose USDT reached a CoinDCX deposit account. */
export const LANDING_WALLET = "0x77fB78EAC2021Cd52097168873324d3F1200E275";

const offline = () => Promise.reject(new Error("offline"));

/** The recorded attribution of `LANDING_WALLET`, or null if the recorded case is not in the data. */
export async function landingRoute(): Promise<AttributionRecord | null> {
  const recorded = frozenTrace(LANDING_WALLET);
  if (!recorded) return null;
  try {
    return await attributeWallet(LANDING_WALLET, "ethereum", {
      recorded: () => ({ trace: recorded.trace, payers: null }),
      trace: offline,
      payers: offline,
    });
  } catch {
    return null;
  }
}

/** A recorded TRON wallet that routes both ways: MEXC funded one of its payers, and its money reached a Binance wallet and an OFAC-listed address. */
export const LANDING_TRACE_WALLET = "TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj";

export interface LandingTransfer {
  txHash: string;
  from: string;
  to: string;
  usdt: number;
  at: string;
}

export interface LandingTrace {
  record: AttributionRecord;
  /** The OFAC-listed address its money reached on the way, with the USDT of the traced money that did. */
  listed: ListedContact | null;
  /** Every transfer the recorded chain read held for this trace, oldest first. */
  transfers: LandingTransfer[];
}

/** The recorded both-ways trace, attributed offline as the desk attributes it; null if the recording is not in the data. */
export async function landingTrace(): Promise<LandingTrace | null> {
  const recorded = frozenTrace(LANDING_TRACE_WALLET, "tron");
  if (!recorded) return null;
  const payers = (demoPayers as unknown as { cases: Record<string, PayersTrace> }).cases[`tron:${LANDING_TRACE_WALLET}`] ?? null;
  try {
    const record = await attributeWallet(LANDING_TRACE_WALLET, "tron", { recorded: () => ({ trace: recorded.trace, payers }), trace: offline, payers: offline });
    return {
      record,
      listed: listedContact(record),
      transfers: recorded.trace.edges
        .map((e) => ({ txHash: e.txHash, from: e.from, to: e.to, usdt: e.valueUsdt, at: e.timestamp }))
        .sort((a, b) => a.at.localeCompare(b.at)),
    };
  } catch {
    return null;
  }
}

export function landingFigures() {
  const registry = registryTotals();
  const tron = riskLists.sanctioned.length;
  const otherChains = multichain.addresses.length;
  return {
    registry,
    ofac: { tron, otherChains, total: tron + otherChains, published: (riskLists as { _published?: string })._published ?? null },
    coverage: coverageCounts(),
  };
}
