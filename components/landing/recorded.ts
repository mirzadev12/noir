/**
 * The landing page's desk preview: real rows, computed offline from the recorded
 * cases in data/. Every recorded TRON and Ethereum case is attributed the way the
 * desk attributes a filed wallet (the frozen trace, and the recorded payers where
 * the capture holds them) and the results are grouped by VASP with the desk's own
 * grouping. Nothing is read from a chain and nothing is typed in.
 *
 * Server-only.
 */

import demoPayers from "@/data/demo-payers.json";
import { attributeWallet } from "@/lib/attribute";
import { frozenAddresses, frozenTrace } from "@/lib/demo";
import { emptyDesk, fileWallets, groupByVasp, newEntryId, setRecord } from "@/lib/desk";
import type { EntryChain, VaspRow } from "@/lib/desk-types";
import type { PayersTrace } from "@/lib/payers";
import { NOBODY } from "@/lib/identity";
import { nextVasp } from "@/lib/noir-view";

const offline = () => Promise.reject(new Error("offline"));

function payersFor(wallet: string, chain: EntryChain): PayersTrace | null {
  const cases = (demoPayers as { cases: Record<string, PayersTrace> }).cases;
  return cases[`${chain}:${/^0x/i.test(wallet) ? wallet.toLowerCase() : wallet}`] ?? null;
}

export interface RecordedDesk {
  /** The VASP to write to next first, then the rest by wallets. At most `limit`. */
  rows: VaspRow[];
  /** All VASPs the recorded cases reach, and how many wallets they hold in all. */
  vasps: number;
  wallets: number;
  next: string | null;
}

export async function recordedDesk(limit = 5): Promise<RecordedDesk> {
  const file = emptyDesk();
  const now = new Date().toISOString();
  const lines = frozenAddresses().map((wallet) => ({
    line: 0,
    ok: true as const,
    wallet,
    chain: (/^0x/i.test(wallet) ? "ethereum" : "tron") as EntryChain,
    traced: true,
    caseRef: null,
  }));
  const { added } = fileWallets(file, lines, NOBODY, now, newEntryId);
  for (const entry of added) {
    const hit = frozenTrace(entry.wallet, entry.chain);
    if (!hit) continue;
    try {
      const record = await attributeWallet(entry.wallet, entry.chain, {
        recorded: () => ({ trace: hit.trace, payers: payersFor(entry.wallet, entry.chain) }),
        trace: offline,
        payers: offline,
      });
      setRecord(file, entry.id, { record }, now);
    } catch {
      // A recorded case that cannot be attributed is left out, never guessed.
    }
  }
  const all = groupByVasp(file).rows;
  const next = nextVasp(all)?.row ?? all[0] ?? null;
  const rows = next ? [next, ...all.filter((r) => r !== next)] : all;
  return {
    rows: rows.slice(0, limit),
    vasps: all.length,
    wallets: new Set(all.flatMap((r) => r.wallets.map((w) => w.entryId))).size,
    next: next?.vasp ?? null,
  };
}
