/**
 * Accounts that link cases: two or more filed wallets whose money reached the
 * same customer deposit account at a VASP. One account is one accountholder, so
 * one KYC answer from that VASP speaks to every case that leads there — the
 * strongest link the chain supports between otherwise separate complaints.
 *
 * Only outbound accounts count. Two wallets that were both funded by the same
 * exchange are not linked: an exchange funds thousands of people. Pure.
 */

import type { EntryChain, VaspRow } from "./desk-types";

export interface SharedAccount {
  vasp: string;
  account: string;
  chain: EntryChain;
  wallets: { entryId: string; wallet: string; caseRefs: string[]; usdt: number }[];
  /** Distinct case references across the wallets, first seen first. */
  caseRefs: string[];
  /** USDT from these wallets that reached the account. */
  usdt: number;
  /** True when the wallets come from more than one case. */
  crossCase: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function sharedAccounts(rows: VaspRow[]): SharedAccount[] {
  const book = new Map<string, SharedAccount>();
  for (const row of rows) {
    for (const w of row.wallets) {
      if (w.direction !== "outbound" || !w.account) continue;
      const key = `${row.vasp}\u0000${w.chain}\u0000${/^0x/i.test(w.account) ? w.account.toLowerCase() : w.account}`;
      let link = book.get(key);
      if (!link) {
        link = { vasp: row.vasp, account: w.account, chain: w.chain, wallets: [], caseRefs: [], usdt: 0, crossCase: false };
        book.set(key, link);
      }
      if (link.wallets.some((x) => x.entryId === w.entryId)) continue;
      link.wallets.push({ entryId: w.entryId, wallet: w.wallet, caseRefs: [...w.caseRefs], usdt: w.usdt });
      for (const ref of w.caseRefs) if (!link.caseRefs.includes(ref)) link.caseRefs.push(ref);
      link.usdt = round2(link.usdt + w.usdt);
    }
  }
  return [...book.values()]
    .filter((l) => l.wallets.length >= 2)
    .map((l) => ({ ...l, crossCase: l.caseRefs.length >= 2 }))
    .sort((a, b) => Number(b.crossCase) - Number(a.crossCase) || b.caseRefs.length - a.caseRefs.length || b.usdt - a.usdt);
}
