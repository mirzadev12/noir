/**
 * How wallets reach the desk: one parser for a pasted list and for a CSV.
 *
 * Every line is checked here, locally, before any chain is read. A single
 * wallet is a list of one. The accepted shapes:
 *
 *  - one address per line;
 *  - CSV `address[,chain][,case]`, or any column order under a header row
 *    naming `address`/`wallet`, `chain`/`network`, `case`/`case ref`/`fir`.
 *
 * A line's separator is the first of tab, semicolon, comma that it contains.
 * Blank lines and `#` comments are skipped. Line numbers are 1-based over the
 * text as pasted, so the officer can find a refused line in their own file.
 *
 * TRON, Ethereum and Polygon addresses are traced; Polygon only when the chain
 * column says so, because a `0x` address alone does not name its chain. Other
 * formats `lib/chains.ts` recognises are accepted as screened-only. Anything
 * else is refused with the reason. Nothing here reads a chain.
 */

import { checkAddress } from "./address";
import { identifyChain } from "./chains";
import type { EntryChain, IntakeLine } from "./desk-types";

export const MAX_INTAKE_LINES = 500;

const MAX_CASE_REF = 80;

type Column = "address" | "chain" | "case";

const HEADER_NAMES: Record<string, Column> = {
  address: "address",
  wallet: "address",
  chain: "chain",
  network: "chain",
  blockchain: "chain",
  case: "case",
  "case ref": "case",
  "case reference": "case",
  fir: "case",
  reference: "case",
};

const DEFAULT_COLUMNS: Record<Column, number> = { address: 0, chain: 1, case: 2 };

function cellsOf(line: string): string[] {
  const sep = ["\t", ";", ","].find((s) => line.includes(s));
  return (sep ? line.split(sep) : [line]).map((c) => c.trim());
}

const headerWord = (cell: string) => cell.toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();

/** Column positions when `cells` is a header row, else null. */
function headerColumns(cells: string[]): Record<Column, number> | null {
  const words = cells.map(headerWord);
  if (!words.some((w) => /^(address|wallet)$/.test(w))) return null;
  const columns: Record<Column, number> = { address: -1, chain: -1, case: -1 };
  words.forEach((w, i) => {
    const column = HEADER_NAMES[w];
    if (column && columns[column] === -1) columns[column] = i;
  });
  return columns;
}

/** Printable, single-line, at most 80 characters; empty is null. */
function cleanCaseRef(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const clean = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CASE_REF);
  return clean || null;
}

type Checked =
  | { ok: true; wallet: string; chain: EntryChain; traced: boolean }
  | { ok: false; reason: string };

/** The address and the chain cell together: the one place a line is accepted or refused. */
function checkLine(rawAddress: string, rawChain: string): Checked {
  const chainCell = rawChain.trim().toLowerCase();
  const check = checkAddress(rawAddress);

  if (chainCell === "") {
    if (check.valid) return { ok: true, wallet: check.address, chain: check.chain, traced: true };
    const guess = identifyChain(rawAddress);
    if (guess && !guess.chain.traceable) {
      return { ok: true, wallet: rawAddress.trim(), chain: guess.chain.id, traced: false };
    }
    return { ok: false, reason: check.reason };
  }

  if (/^(tron|trx|trc20)$/.test(chainCell)) {
    if (!check.valid) return { ok: false, reason: check.reason };
    if (check.chain !== "tron") {
      return { ok: false, reason: `Chain '${rawChain.trim()}' was given, but this is not a TRON address.` };
    }
    return { ok: true, wallet: check.address, chain: "tron", traced: true };
  }

  const evm = /^(ethereum|eth|erc20)$/.test(chainCell)
    ? "ethereum"
    : /^(polygon|matic|pol)$/.test(chainCell)
      ? "polygon"
      : null;
  if (evm) {
    if (!/^0x/i.test(rawAddress.trim())) {
      return {
        ok: false,
        reason: `Chain '${rawChain.trim()}' was given, but the address does not start with '0x'.`,
      };
    }
    if (!check.valid) return { ok: false, reason: check.reason };
    return { ok: true, wallet: check.address, chain: evm, traced: true };
  }

  // A chain NOIR screens but does not trace, named for an address of that chain.
  const guess = check.valid ? null : identifyChain(rawAddress);
  if (
    guess &&
    !guess.chain.traceable &&
    (chainCell === guess.chain.id || chainCell === guess.chain.name.toLowerCase())
  ) {
    return { ok: true, wallet: rawAddress.trim(), chain: guess.chain.id, traced: false };
  }
  return { ok: false, reason: `Chain '${rawChain.trim()}' is not one NOIR reads.` };
}

const dedupeKey = (wallet: string, chain: EntryChain) =>
  `${chain}:${/^0x/i.test(wallet) ? wallet.toLowerCase() : wallet}`;

/**
 * Every line of `text` that is not blank or a comment, checked. Valid lines
 * carry the canonical address; refused lines carry the text as typed and the
 * reason. A wallet repeated on the same chain is kept once, at its first line.
 */
export function parseIntake(text: string, batchCaseRef: string | null = null): IntakeLine[] {
  const batchRef = cleanCaseRef(batchCaseRef);
  const out: IntakeLine[] = [];
  const seen = new Map<string, Extract<IntakeLine, { ok: true }>>();
  let columns: Record<Column, number> | null = null;
  let first = true;
  let counted = 0;

  const rows = text.split(/\r?\n/);
  for (let i = 0; i < rows.length; i++) {
    const line = i + 1;
    const raw = rows[i].trim();
    if (!raw || raw.startsWith("#")) continue;
    const cells = cellsOf(raw);

    if (first) {
      first = false;
      const header = headerColumns(cells);
      if (header) {
        columns = header;
        continue;
      }
    }

    if (++counted > MAX_INTAKE_LINES) {
      out.push({ line, ok: false, raw: "", reason: `At most ${MAX_INTAKE_LINES} lines per filing` });
      break;
    }

    const at = columns ?? DEFAULT_COLUMNS;
    const cell = (c: Column) => (at[c] >= 0 ? (cells[at[c]] ?? "") : "");
    const checked = checkLine(cell("address"), cell("chain"));
    if (!checked.ok) {
      out.push({ line, ok: false, raw, reason: checked.reason });
      continue;
    }

    const caseRef = cleanCaseRef(cell("case")) ?? batchRef;
    const key = dedupeKey(checked.wallet, checked.chain);
    const earlier = seen.get(key);
    if (earlier) {
      // The first line stands; a case ref it lacked is taken from a later one.
      if (earlier.caseRef === null) earlier.caseRef = caseRef;
      continue;
    }
    const accepted: Extract<IntakeLine, { ok: true }> = {
      line,
      ok: true,
      wallet: checked.wallet,
      chain: checked.chain,
      traced: checked.traced,
      caseRef,
    };
    seen.set(key, accepted);
    out.push(accepted);
  }
  return out;
}
