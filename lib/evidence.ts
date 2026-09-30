/**
 * The evidence ledger: how much provenance the rows attribution reads from
 * actually carry, counted from the files in `data/`.
 *
 * Attribution is a lookup against three kinds of row, and each kind has to say
 * where it came from:
 *
 *  - a **tagged exchange wallet** (a seed) names the explorer page that tags it;
 *  - a **deposit address** derived from a seed carries its evidence sentence
 *    (how many sweeps, what share of its inflow) and names the tagged wallet it
 *    forwards to, which must itself be a seed on the same chain;
 *  - a **recorded case** says the moment the chain was read.
 *
 * A row that lacks one of these is listed in `missing`, by file and address.
 * In a sound build `missing` is empty, and a test keeps it so: a row cannot be
 * added to the tables without its provenance.
 *
 * Nothing here is typed by hand, and nothing reads a chain.
 */

import tronDeposits from "../data/deposit-addresses.json";
import demoCases from "../data/demo-cases.json";
import demoPayers from "../data/demo-payers.json";
import ethDeposits from "../data/eth/deposit-addresses.json";
import ethSeeds from "../data/eth/hot-wallets.json";
import tronSeeds from "../data/hot-wallets.json";
import polygonDeposits from "../data/polygon/deposit-addresses.json";
import polygonSeeds from "../data/polygon/hot-wallets.json";
import type { TracedChain } from "./desk-types";

export interface EvidenceLedger {
  /** Tagged exchange wallets; the source is the explorer page that tags each. */
  seedWallets: { total: number; withSource: number };
  /** Derived deposit addresses; each with its evidence sentence and the tagged wallet it forwards to. */
  depositAddresses: { total: number; withEvidence: number; withSeed: number };
  /** Recorded chain reads; each with the moment it was read. `withPayers` have the inbound side recorded too. */
  recordedCases: { total: number; withReadAt: number; withPayers: number };
  byChain: Record<TracedChain, { seedWallets: number; depositAddresses: number }>;
  /** Rows without provenance. Empty in a sound build. */
  missing: { file: string; address: string; lacks: string }[];
}

type Seed = { address: string; source_url?: unknown };
type Deposit = { address: string; evidence?: unknown; hotWallet?: unknown; seed?: unknown };
type RecordedCase = { address: string; trace: { chain?: string; provenance?: { generatedAt?: unknown } } };

/** One chain's label tables, with the file each is read from and the field that names a deposit's seed. */
export interface EvidenceTable {
  seeds: Seed[];
  seedsFile: string;
  deposits: Deposit[];
  depositsFile: string;
  seedField: "hotWallet" | "seed";
}

const TABLES: Record<TracedChain, EvidenceTable> = {
  tron: { seeds: tronSeeds, seedsFile: "data/hot-wallets.json", deposits: tronDeposits, depositsFile: "data/deposit-addresses.json", seedField: "hotWallet" },
  ethereum: { seeds: ethSeeds, seedsFile: "data/eth/hot-wallets.json", deposits: ethDeposits, depositsFile: "data/eth/deposit-addresses.json", seedField: "seed" },
  polygon: { seeds: polygonSeeds, seedsFile: "data/polygon/hot-wallets.json", deposits: polygonDeposits, depositsFile: "data/polygon/deposit-addresses.json", seedField: "seed" },
};

const isUrl = (v: unknown): boolean => typeof v === "string" && /^https?:\/\/\S+$/.test(v);
const isText = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;
const isIso = (v: unknown): boolean => typeof v === "string" && !Number.isNaN(Date.parse(v));
/** EVM addresses compare lower-cased; TRON's exactly. */
const same = (chain: TracedChain, address: string) => (chain === "tron" ? address : address.toLowerCase());

/** The ledger of the tables attribution reads: the committed files in `data/`. */
export function evidenceLedger(): EvidenceLedger {
  return ledgerOf(TABLES, (demoCases as { cases: RecordedCase[] }).cases, (demoPayers as { cases: Record<string, unknown> }).cases);
}

/** The rule itself, over any tables: what is counted, and what a row must carry. */
export function ledgerOf(tables: Record<TracedChain, EvidenceTable>, cases: RecordedCase[], payers: Record<string, unknown>): EvidenceLedger {
  const ledger: EvidenceLedger = {
    seedWallets: { total: 0, withSource: 0 },
    depositAddresses: { total: 0, withEvidence: 0, withSeed: 0 },
    recordedCases: { total: 0, withReadAt: 0, withPayers: 0 },
    byChain: { tron: { seedWallets: 0, depositAddresses: 0 }, ethereum: { seedWallets: 0, depositAddresses: 0 }, polygon: { seedWallets: 0, depositAddresses: 0 } },
    missing: [],
  };

  for (const [chain, t] of Object.entries(tables) as [TracedChain, EvidenceTable][]) {
    const seedSet = new Set(t.seeds.map((s) => same(chain, s.address)));
    for (const s of t.seeds) {
      ledger.seedWallets.total += 1;
      ledger.byChain[chain].seedWallets += 1;
      if (isUrl(s.source_url)) ledger.seedWallets.withSource += 1;
      else ledger.missing.push({ file: t.seedsFile, address: s.address, lacks: "the explorer page that tags it" });
    }
    for (const d of t.deposits) {
      ledger.depositAddresses.total += 1;
      ledger.byChain[chain].depositAddresses += 1;
      if (isText(d.evidence)) ledger.depositAddresses.withEvidence += 1;
      else ledger.missing.push({ file: t.depositsFile, address: d.address, lacks: "its evidence" });
      const seed = d[t.seedField];
      if (typeof seed === "string" && seedSet.has(same(chain, seed))) ledger.depositAddresses.withSeed += 1;
      else ledger.missing.push({ file: t.depositsFile, address: d.address, lacks: "a tagged wallet in the seed table that it forwards to" });
    }
  }

  for (const c of cases) {
    ledger.recordedCases.total += 1;
    if (isIso(c.trace.provenance?.generatedAt)) ledger.recordedCases.withReadAt += 1;
    else ledger.missing.push({ file: "data/demo-cases.json", address: c.address, lacks: "the moment it was read" });
    const chain = c.trace.chain ?? (/^0x/i.test(c.address) ? "ethereum" : "tron");
    if (`${chain}:${/^0x/i.test(c.address) ? c.address.toLowerCase() : c.address}` in payers) ledger.recordedCases.withPayers += 1;
  }
  return ledger;
}
