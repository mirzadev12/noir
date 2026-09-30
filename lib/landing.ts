/**
 * What the landing page shows, computed from the repository's own data when the
 * site is built — nothing on it is typed in.
 *
 *  - `landingRoute()` is a real recorded case run through the same attribution
 *    the desk uses, offline: the trace is the frozen one captured from the
 *    chain, and every network dependency is refused, so it cannot answer for
 *    anything it does not hold.
 *  - `landingFigures()` counts the registry, the OFAC lists and the PS-26182
 *    checklist.
 *
 * Server-only (attribution reads the recorded cases).
 */

import { attributeWallet } from "./attribute";
import { coverageCounts } from "./coverage";
import { frozenTrace } from "./demo";
import type { AttributionRecord } from "./desk-types";
import { registryTotals } from "./registry";
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
