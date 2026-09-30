/**
 * How NOIR writes times, amounts, addresses and evidence — one place, so every
 * screen says them the same way. Deterministic (no locale, no clock), so a
 * server render and the browser's hydration always agree.
 *
 *  - Times are UTC and absolute: "14 Sep 2026, 08:02 UTC".
 *  - Amounts stay in USDT; nothing is converted to another currency.
 *  - Confidence is described as how much evidence was seen, never as a
 *    probability of being right.
 */

import { CHAINS, type ChainId } from "./chains";
import type { LabelSource } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

export function utcDay(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function utc(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return `${utcDay(iso)}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/** Grouped with commas, two decimals: "1,131.72". */
export function amount(n: number): string {
  const [whole, frac] = (Math.round(n * 100) / 100).toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac}`;
}

export const usdt = (n: number) => `${amount(n)} USDT`;

/** Integers grouped: "1,043". */
export const count = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function shortAddress(address: string): string {
  if (address.length <= 16) return address;
  const head = address.startsWith("0x") ? 8 : 6;
  return `${address.slice(0, head)}…${address.slice(-4)}`;
}

export function evidenceWord(confidence: number): string {
  if (confidence >= 0.9) return "Strong evidence";
  if (confidence >= 0.7) return "Moderate evidence";
  return "Limited evidence";
}

const TIERS: Record<LabelSource, string> = {
  ground_truth: "Explorer-tagged",
  heuristic: "Derived by sweep heuristic",
  sanctions: "OFAC SDN list",
  community: "Community list",
};
export const tierName = (source: LabelSource) => TIERS[source] ?? source;

const TRACED: Record<string, string> = { tron: "TRON", ethereum: "Ethereum", polygon: "Polygon" };
export function chainName(chain: string): string {
  return TRACED[chain] ?? CHAINS[chain as ChainId]?.name ?? chain;
}

/** A short code for the chain badge, like a transit line's bullet. */
export function chainCode(chain: string): string {
  const codes: Record<string, string> = { tron: "TRX", ethereum: "ETH", polygon: "POL", bitcoin: "BTC", solana: "SOL" };
  return codes[chain] ?? chainName(chain).slice(0, 3).toUpperCase();
}

/** Explorer link for an address on a traced chain, or null. */
export function explorerHref(chain: string, address: string): string | null {
  if (chain === "tron") return `https://tronscan.org/#/address/${address}`;
  if (chain === "ethereum") return `https://etherscan.io/address/${address}`;
  if (chain === "polygon") return `https://polygonscan.com/address/${address}`;
  return null;
}

export function txHref(chain: string, hash: string): string | null {
  if (chain === "tron") return `https://tronscan.org/#/transaction/${hash}`;
  if (chain === "ethereum") return `https://etherscan.io/tx/${hash}`;
  if (chain === "polygon") return `https://polygonscan.com/tx/${hash}`;
  return null;
}

/** The link to a wallet's page; Polygon has to be said, a bare 0x is Ethereum. */
export function walletHref(wallet: string, chain: string): string {
  return `/wallet/${encodeURIComponent(wallet)}${chain === "polygon" || !["tron", "ethereum"].includes(chain) ? `?chain=${chain}` : ""}`;
}

export const vaspHref = (vasp: string) => `/vasp/${encodeURIComponent(vasp)}`;
