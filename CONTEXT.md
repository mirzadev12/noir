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
| `/` | Landing: the hall (the claim and the departures board), the counted figures, the two directions, the intake, many cases meeting at one exchange, the four stages, a recorded route |
| `/desk` | The follow-up clock, then the sign naming the next VASP to write to; every VASP on a departures board with filters and search; accounts that link cases; which wallets have sent USDT since they were read; pending, unreadable, screened-only, unrouted and failed wallets; the intake |
| `/vasp/[name]` | One VASP: its wallets in both directions, its FIU-IND line and LE channel, the asks, the request and its status history |
| `/vasp/[name]/request` | The consolidated request as a print-ready A4 letter, and its JSON package |
| `/wallet/[address]?chain=` | One filed wallet: funders, the wallet, the outbound VASP, the route line, typologies, leads, OFAC, movement since it was read, provenance |
| `/cases` | Every case reference with its wallets, the VASPs reached and its requests |
| `/requests` | Register of requests drafted, what each VASP did, and how VASPs answered |
| `/registry` | Every VASP NOIR can attribute to, across TRON, Ethereum and Polygon |
| `/method` | The coverage list from `lib/coverage.ts` (NOIR's own capability names), how attribution works, the truth rules |

## Visual world (summary; the brief is authoritative)

A dark, precise console (the user's pin of 29 Sep, night; DESIGN.md records it as built).
Near-black ground, raised panels, white type in IBM Plex Sans, JetBrains Mono for addresses
and figures, one electric-blue accent (a gradient only on the landing headline; the light
only in the landing's halls, direction panels and footer, and the glow on the product board
and the destination sign), light-blue links, green/amber/red status, hairline borders,
rounded controls, the sidebar on every screen. The desk is a departures
board. The request letter is always a white paper sheet. The site never names the
hackathon, the problem statement or any other project, and asks for no officer ID.

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
