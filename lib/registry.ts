/**
 * Every VASP NOIR can attribute a wallet to, counted from the label files in
 * `data/`: the explorer-tagged seed wallets and the deposit addresses derived
 * from them, per chain. Nothing here is typed by hand, so the registry screen
 * and the landing figures cannot drift from the tables attribution reads.
 */

import tronDeposits from "../data/deposit-addresses.json";
import ethDeposits from "../data/eth/deposit-addresses.json";
import ethSeeds from "../data/eth/hot-wallets.json";
import tronSeeds from "../data/hot-wallets.json";
import polygonDeposits from "../data/polygon/deposit-addresses.json";
import polygonSeeds from "../data/polygon/hot-wallets.json";
import { vaspKey } from "./desk";
import type { TracedChain } from "./desk-types";
import { fiuListing, type FiuListing } from "./fiu";
import { leContact, type LeContact } from "./le-contacts";

export interface ChainCoverage {
  seedWallets: number;
  depositAddresses: number;
}

export interface RegistryRow {
  vasp: string;
  chains: Partial<Record<TracedChain, ChainCoverage>>;
  seedWallets: number;
  depositAddresses: number;
  fiu: FiuListing | null;
  le: LeContact | null;
}

type Row = { exchange: string };
const TABLES: Record<TracedChain, { seeds: Row[]; deposits: Row[] }> = {
  tron: { seeds: tronSeeds, deposits: tronDeposits },
  ethereum: { seeds: ethSeeds, deposits: ethDeposits },
  polygon: { seeds: polygonSeeds, deposits: polygonDeposits },
};

export function registryRows(): RegistryRow[] {
  const book = new Map<string, RegistryRow>();
  const rowFor = (vasp: string) => {
    const key = vaspKey(vasp);
    let row = book.get(key);
    if (!row) {
      row = { vasp, chains: {}, seedWallets: 0, depositAddresses: 0, fiu: fiuListing(vasp), le: leContact(vasp) };
      book.set(key, row);
    }
    return row;
  };
  for (const [chain, { seeds, deposits }] of Object.entries(TABLES) as [TracedChain, (typeof TABLES)[TracedChain]][]) {
    for (const [rows, field] of [[seeds, "seedWallets"], [deposits, "depositAddresses"]] as const) {
      for (const r of rows) {
        const row = rowFor(r.exchange);
        const cov = (row.chains[chain] ??= { seedWallets: 0, depositAddresses: 0 });
        cov[field] += 1;
        row[field] += 1;
      }
    }
  }
  return [...book.values()].sort((a, b) => b.depositAddresses - a.depositAddresses || a.vasp.localeCompare(b.vasp));
}

export function registryTotals() {
  const rows = registryRows();
  return {
    vasps: rows.length,
    chains: Object.keys(TABLES).length,
    seedWallets: rows.reduce((s, r) => s + r.seedWallets, 0),
    depositAddresses: rows.reduce((s, r) => s + r.depositAddresses, 0),
    fiuListed: rows.filter((r) => r.fiu).length,
    leChannels: rows.filter((r) => r.le?.found).length,
  };
}
