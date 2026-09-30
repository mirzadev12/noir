# NOIR complete — the PS-26182 checklist and what closes it

29 Sep 2026. Builds on `2026-09-29-dispatch-desk-design.md`. The user asked for NOIR to be
complete and forbade questions until it is built, so this design was written and executed
without an approval round.

## The checklist

Source of truth: `lib/coverage.ts` (data, tested; the `/method` screen renders it and
computes its counts). Every expectation in `docs/PS-26182.md`:

| # | PS-26182 expects | Status | How |
|---|---|---|---|
| 1 | Analyse suspect wallets reported during investigations | built | Desk intake: paste or CSV, checked before any read; REST `POST /api/desk` |
| 2 | Nearest centralised exchange receiving deposits | built | Outbound attribution to the customer deposit address |
| 3 | Custodial wallet / VASP receiving direct deposits | built | Exchange hot wallets and derived deposit addresses |
| 4 | Who funded the wallet (the other direction) | built | Inbound: exchanges that funded its payers, one hop back |
| 5 | Multi-chain: Bitcoin, Ethereum, Tron, BNB, Solana, Polygon | partial | Traced: TRON, Ethereum, Polygon. Recognised and OFAC-screened: Bitcoin, Solana, BNB Beacon and 9 more. BNB Smart Chain needs a paid data key |
| 6 | Exchange clusters, hot wallets, deposit wallets | built | Seeds + sweep-heuristic deposit clusters, per chain |
| 7 | Mixers / tumblers | built | Trace stops and names a sanctioned mixer |
| 8 | DeFi bridges, cross-chain swap services | partial | Detected as a stop (contracts, bridges, swap services); not followed across chains |
| 9 | Automated tagging and confidence scoring | built | Confidence = evidence seen; evidence tier per label |
| 10 | Investigation-ready reports | built | Consolidated request letter per VASP; wallet report |
| 11 | Route requests to the correct VASP through SAHYOG | partial | Letter addressed to the VASP's legal name and LE channel; request package export; SAHYOG API integration designed, not live |
| 12 | Visualisation of fund movement | built | Route line from the wallet to the VASP |
| 13 | Cross-chain transaction mapping | not built | Bridge exits are named; following them needs the destination chain's reader |
| 14 | Risk scoring, laundering typologies | built | Typology flags from the trace: short dwell, peel chain, fan-out, round amounts, sanctions contact |
| 15 | Alerting for high-risk wallets | partial | OFAC listing flagged on filing; movement alerts not surfaced in NOIR yet |
| 16 | Dashboard with case-based analytics and reporting | built | Desk by VASP, cases view, requests register with VASP response times |
| 17 | Real-time intelligence | built | Server worker attributes as wallets are filed |
| 18 | Scalable architecture | partial | Paced, cached clients; own-node endpoints; no indexer |

## Additions (additive to `lib/desk-types.ts`)

- `OutboundAttribution.route: RouteStop[]` — `{ address, depth, label: { entity, kind } | null, usdt }`,
  from the wallet (depth 0) along the highest-taint path to the account.
- `AttributionRecord.typologies: Typology[]` — `{ code, reason, at }` from the trace's risk flags.
- `groupByCase(file) → CaseRow[]`, `vaspResponse(requests) → VaspResponse[]` (pure, `lib/desk.ts` / `lib/requests.ts`).
- `requestPackage(letter, request) → object` with `schema: "noir-request-v1"` and
  `sahyog: "designed, not integrated"`; `GET /api/desk/requests/[id]/export`.
- `lib/registry.ts` — `registryRows()` from the label files.
- `lib/coverage.ts` — the checklist above as data.

## UI

Tokens in `app/globals.css`, primitives in `components/noir/`, nine screens:
`/`, `/desk`, `/vasp/[name]`, `/vasp/[name]/request`, `/wallet/[address]`, `/cases`,
`/requests`, `/registry`, `/method`. Built with impeccable against
`.impeccable/briefs/console.md`, then its finish review.
