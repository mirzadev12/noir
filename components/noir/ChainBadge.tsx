/**
 * ChainBadge — the chain a wallet is on, as a small square sign: TRX, ETH, POL.
 *
 * Props
 *   chain     a traced chain ("tron" | "ethereum" | "polygon") or any chain id the
 *             screening module recognises ("bitcoin", "solana", …)
 *   named     also print the chain's name beside the sign
 *
 * A chain NOIR traces is a solid black sign. A chain it only recognises and
 * screens against OFAC is an outlined one, so the difference is visible before
 * it is read. Codes and names come from lib/noir-format.ts.
 */

import { chainCode, chainName } from "@/lib/noir-format";

const TRACED = new Set(["tron", "ethereum", "polygon"]);

export function ChainBadge({ chain, named = false, className = "" }: { chain: string; named?: boolean; className?: string }) {
  const traced = TRACED.has(chain);
  return (
    <span className={`inline-flex items-center gap-2 align-middle ${className}`}>
      <span
        title={traced ? `${chainName(chain)}: traced` : `${chainName(chain)}: recognised and screened, not traced`}
        className={`type-mono inline-flex h-6 min-w-10 shrink-0 items-center justify-center px-1.5 text-micro leading-none font-bold ${
          traced ? "rule-box bg-paper-3 text-ink" : "rule-box bg-transparent text-ink-soft"
        }`}
      >
        {chainCode(chain)}
      </span>
      {named ? <span className="text-small font-medium">{chainName(chain)}</span> : null}
    </span>
  );
}
