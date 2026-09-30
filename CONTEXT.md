# NOIR — working context

Read PRODUCT.md (what NOIR is), `docs/superpowers/specs/2026-09-29-dispatch-desk-design.md`
(the desk's design and its change log) and `.impeccable/briefs/console.md` (the visual
direction contract) before touching any screen. Team machines also keep internal notes in
`docs/private/` (git-ignored); `docs/private/engine-notes.md` records how the chain engine
was built and measured — read the relevant part before changing the tracer, the chain
clients or the data, if you have it.

## What this repository is

NOIR is the SIH26182 entry: attribute an unknown wallet to the nearest VASP in both
directions, file it under that VASP on a shared desk, and route one consolidated request
to each VASP. NOIR stands on its own: never name or compare it to any other project in
code, docs, the UI or the deck.

## Layout

- `lib/`, `app/api/`, `data/`, `scripts/`, `tests/`: the chain engine (clients, tracer,
  payers, attribution tables) and the dispatch desk (`lib/desk*.ts`, `lib/attribute.ts`,
  `lib/requests.ts`, `app/api/desk/**`). The desk's contract is `lib/desk-types.ts`.
- `app/` pages and `components/noir/`: NOIR's interface. Every visual value is a token in
  `app/globals.css`; pages are composed only from `components/noir/` primitives.

## Screens

| Route | Job |
| --- | --- |
| `/` | Landing: paste a wallet or a list, both directions in a line, a recorded route, the counted figures |
| `/desk` | The yellow sign names the next VASP to write to; every VASP as a row; pending, unreadable, screened-only, unrouted and failed wallets below; the intake |
| `/vasp/[name]` | One VASP: its wallets in both directions, its FIU-IND line and LE channel, the asks, the request and its status history |
| `/vasp/[name]/request` | The consolidated request as a print-ready A4 letter, and its JSON package |
| `/wallet/[address]?chain=` | One filed wallet: funders, the wallet, the outbound VASP, the route line, typologies, leads, OFAC, provenance |
| `/cases` | Every case reference with its wallets, the VASPs reached and its requests |
| `/requests` | Register of requests drafted, what each VASP did, and how VASPs answered |
| `/registry` | Every VASP NOIR can attribute to, across TRON, Ethereum and Polygon |
| `/method` | The SIH26182 checklist from `lib/coverage.ts`, how attribution works, the truth rules |

## Visual world (summary; the brief is authoritative)

Wayfinding signage. White ground, sign-black ink, signal-yellow destination fields as the
only colour at scale, route blue for links and actions. Archivo (heavy, for signs) and
JetBrains Mono (addresses, figures). Square corners, 2px black rules, arrows as structure.
No shadows, no gradients, no cards-grid, no dark theme.

## Standing rules

- Attribution is a deterministic lookup; no language model decides it.
- Confidence is how much evidence was seen, never accuracy.
- An unreadable wallet is never reported as empty.
- An explorer's tag is shown as a lead, never filed as an attribution.
- No statute on any request. Do not claim SAHYOG integration is live.
- No INR conversion. Timestamps UTC and absolute.
- Re-count any figure from `data/` before printing it.

## Commands

```
npm run dev
npx next typegen; npx tsc --noEmit
npx eslint .
node --import ./tests/register.mjs --test "tests/*.test.mjs"
DEMO_MODE=true npm run dev     # recorded cases, no network
node --import ./tests/register.mjs scripts/freeze-payers.mjs   # re-capture recorded payers (live)
```

State (the desk, the audit log, the alert watch) lives in `.noir/`, or `NOIR_STATE_DIR`.
