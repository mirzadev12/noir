/**
 * The recorded cases as one filing, for a desk with nothing on it.
 *
 * In recorded mode the desk answers these wallets from the chain reads kept in
 * `data/`, by exact address. Filing them by hand means pasting thirteen
 * addresses; this builds the same paste, so an empty desk can be filled in one
 * step. The wallets and everything NOIR says about them are real and recorded.
 * The case references are not: no case file came with the recordings, so each
 * wallet is filed under a reference that says it is a sample.
 *
 * Pure: the text goes through the desk's own intake like any other paste.
 */

import { frozenAddresses } from "./demo";

export const SAMPLE_CASES = ["Sample case 1", "Sample case 2", "Sample case 3"] as const;

/** A Bitcoin address: recognised and screened against the OFAC list, not traced. */
const SCREENED_ONLY = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

export interface RecordedIntake {
  /** CSV the desk's intake accepts: a header row, then `address,chain,case`. */
  text: string;
  wallets: number;
  cases: number;
}

export function recordedIntake(): RecordedIntake {
  const traced = frozenAddresses();
  const lines = traced.map((wallet, i) => `${wallet},${/^0x/i.test(wallet) ? "ethereum" : "tron"},${SAMPLE_CASES[i % SAMPLE_CASES.length]}`);
  lines.push(`${SCREENED_ONLY},,${SAMPLE_CASES[0]}`);
  return {
    text: ["address,chain,case", ...lines].join("\n"),
    wallets: lines.length,
    cases: Math.min(SAMPLE_CASES.length, traced.length),
  };
}
