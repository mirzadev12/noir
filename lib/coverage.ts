/**
 * SIH26182, item by item: what NOIR does for each thing the problem statement
 * asks, and where an evaluator can see it — or, where it is partial or not
 * built, exactly what is missing. The `/method` screen renders this list and
 * computes its counts from it; `tests/coverage.test.mjs` checks every quoted
 * phrase against `docs/PS-26182.md`, so an item cannot answer a sentence the
 * statement does not contain.
 *
 * If something is built later, move its row. Never let this list claim more
 * than the software does.
 */

export type CoverageStatus = "built" | "partial" | "not-built";

export interface CoverageItem {
  id: string;
  /** NOIR's own name for the capability, as the Method page shows it. */
  name: string;
  /** Phrases quoted from PS-26182, verbatim. */
  ps: string[];
  status: CoverageStatus;
  /** What NOIR does, in one or two sentences. */
  answer: string;
  /** Where to see it in NOIR. */
  see?: string;
  /** For partial and not-built: what is missing and the route to it. */
  gap?: string;
}

export const COVERAGE: CoverageItem[] = [
  {
    id: "analyse",
    name: "Wallet intake and screening",
    ps: ["Automatically analyze suspect cryptocurrency wallet addresses"],
    status: "built",
    answer: "Wallets are filed on a shared desk — pasted, as a CSV, or through the REST API — checked line by line before any chain read, and attributed by a server worker as they arrive.",
    see: "/desk",
  },
  {
    id: "nearest-exchange",
    name: "Deposit-account attribution",
    ps: ["nearest centralized exchange", "VASP receiving direct deposits from the suspect wallet"],
    status: "built",
    answer: "The wallet's USDT is traced forward to the first exchange it reached, naming the customer deposit address — the account a request can name.",
    see: "/wallet",
  },
  {
    id: "custodial",
    name: "Custodial wallet attribution",
    ps: ["custodial wallet service"],
    status: "built",
    answer: "Exchange hot wallets tagged by block explorers are the seeds; a wallet paid by one is attributed to that custodian.",
    see: "/registry",
  },
  {
    id: "funding",
    name: "Funding-exchange attribution",
    ps: ["identification of the beneficial owner"],
    status: "built",
    answer: "The other direction: the wallet's payers are read one hop back, and the exchanges that funded them are named — each can identify its own customer.",
    see: "/wallet",
  },
  {
    id: "multichain",
    name: "Chain coverage",
    ps: ["multiple blockchain networks", "Bitcoin", "Solana", "BNB Chain"],
    status: "partial",
    answer: "USDT is traced on TRON, Ethereum and Polygon. Bitcoin, Solana, BNB Beacon Chain and nine more are recognised by address format and screened against the OFAC list.",
    gap: "Bitcoin and Solana tracing needs their transaction readers added behind the same client interface; BNB Smart Chain needs a paid data key, since no keyless source serves it.",
  },
  {
    id: "clusters",
    name: "Exchange clusters and deposit wallets",
    ps: ["exchange clusters", "hot wallets", "deposit wallets"],
    status: "built",
    answer: "Deposit addresses are derived from the tagged hot wallets by a sweep heuristic — addresses that repeatedly forward nearly everything to one exchange — each with its evidence and a confidence.",
    see: "/registry",
  },
  {
    id: "mixers",
    name: "Mixer detection",
    ps: ["mixers/tumblers"],
    status: "built",
    answer: "A trace that reaches a sanctioned mixer stops there and names it; the wallet is not filed under any VASP past that point.",
    see: "/wallet",
  },
  {
    id: "bridges",
    name: "Bridge and swap-service detection",
    ps: ["DeFi bridges", "cross-chain swap services"],
    status: "partial",
    answer: "Money entering a DEX pool, router, bridge or swap service stops the trace, and the contract is named from the explorer's tag.",
    gap: "The trail is not followed onto the destination chain; that needs the bridge's deposit-to-release matching and a reader for the chain it lands on.",
  },
  {
    id: "confidence",
    name: "Evidence tiers and confidence words",
    ps: ["automated tagging and confidence scoring"],
    status: "built",
    answer: "Every attribution carries a confidence — how much evidence was seen, never a probability of being right — and an evidence tier: explorer-tagged, derived by heuristic, or sanctions list.",
    see: "/vasp",
  },
  {
    id: "reports",
    name: "The consolidated request letter",
    ps: ["investigation-ready reports"],
    status: "built",
    answer: "One consolidated request per VASP, printable, listing every wallet, account, amount and transaction across cases, addressed to the VASP's registered legal name.",
    see: "/requests",
  },
  {
    id: "routing",
    name: "Routing requests to the right VASP",
    ps: ["routing lawful disclosure or freezing requests to the correct VASP through the SAHYOG Portal"],
    status: "partial",
    answer: "The desk decides the VASP, drafts the request to its legal name and its law-enforcement channel, and exports it as a machine-readable package; the officer records every reply.",
    gap: "The SAHYOG API integration is designed, not live: the package is built for its intake, and sending it needs SAHYOG's API access for I4C.",
  },
  {
    id: "visualisation",
    name: "Route line of fund movement",
    ps: ["visualization of fund movement"],
    status: "built",
    answer: "Each wallet's route is drawn as a line of stops from the wallet to the account, with the USDT that reached each stop.",
    see: "/wallet",
  },
  {
    id: "cross-chain",
    name: "Cross-chain mapping",
    ps: ["cross-chain transaction mapping"],
    status: "not-built",
    answer: "A wallet's trail on one chain ends at the bridge it used, named.",
    gap: "Mapping across chains needs bridge matching (see DeFi bridges above) and is the next build after Bitcoin tracing.",
  },
  {
    id: "typologies",
    name: "Laundering typologies",
    ps: ["risk scoring", "identification of laundering typologies"],
    status: "built",
    answer: "The trace reports the typologies it observed — funds forwarded within minutes, peel chains, fan-out to many wallets, round amounts, contact with a sanctioned address — each with the wallet and the figures behind it.",
    see: "/wallet",
  },
  {
    id: "alerting",
    name: "High-risk wallet flags",
    ps: ["alerting for high-risk wallets"],
    status: "partial",
    answer: "A filed wallet on the OFAC list, or whose trail reaches one, is flagged on the desk the moment it is attributed.",
    gap: "Alerts on later movement exist in the engine's watch but are not surfaced on the desk yet.",
  },
  {
    id: "dashboard",
    name: "Desk, cases and response analytics",
    ps: ["Dashboard for LEAs with case-based analytics and reporting"],
    status: "built",
    answer: "The desk by VASP, a view by case reference, and a requests register counting how each VASP answered and how long it took.",
    see: "/cases",
  },
  {
    id: "real-time",
    name: "Attribution as wallets are filed",
    ps: ["Real-time generation of investigative intelligence"],
    status: "built",
    answer: "Attribution starts when a wallet is filed and the desk updates as each answer lands; nothing waits for a batch run.",
    see: "/desk",
  },
  {
    id: "scale",
    name: "Scale and self-hosting",
    ps: ["Scalable architecture"],
    status: "partial",
    answer: "Chain clients cache, pace themselves and can be pointed at the agency's own nodes; the desk and audit log are plain files a single server holds.",
    gap: "Large-volume analysis needs an indexer over the chains and a database behind the desk; neither is built.",
  },
];

export function coverageCounts() {
  const count = (s: CoverageStatus) => COVERAGE.filter((i) => i.status === s).length;
  return { total: COVERAGE.length, built: count("built"), partial: count("partial"), notBuilt: count("not-built") };
}
