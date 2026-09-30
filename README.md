# NOIR

**Attribute an unknown wallet to the nearest VASP, in both directions, and send one request per VASP.**

Built for SIH 2026 problem statement **SIH26182** (Ministry of Home Affairs · I4C, CIS Division):
*Automated Attribution of Unknown Cryptocurrency Wallets to Nearest Virtual Asset Service Providers
(VASPs) through Blockchain Intelligence APIs.* The text is in [`docs/PS-26182.md`](docs/PS-26182.md).

An investigator meets a wallet whose VASP is unknown. NOIR finds the nearest VASP on both sides of it:

- **Outbound — where the money went.** The exchange, and the customer deposit account there, that the
  wallet's USDT reached. This is the account a freeze request must name.
- **Inbound — who funded it.** The exchange that funded the wallet's payers.

Wallets from many cases are filed on one shared **desk** and grouped under the VASP they route to. The
officer sends **one consolidated disclosure or freeze request per VASP** and records what the VASP did.
The unit of work is a VASP, not a complaint.

Every attribution states its **confidence** (how much evidence was seen), its **evidence tier**, whether the
VASP is listed with **FIU-IND**, and where its **law-enforcement channel** is.

---

## The screens

| Route | What it is |
| --- | --- |
| `/` | The argument. What NOIR does in plain words and as four stages on a route line; a paste box that files to the desk; a real recorded route; the figures, counted from `data/` at build time. |
| `/desk` | Home. The sign names the next VASP to write to; every VASP is a row (wallets out and in, cases, USDT each way, FIU-IND mark where listed, request status, "N filed since request"). Beneath: OFAC flags, what is being read (refreshing every 3 seconds), what could not be read, what routed to no VASP, wallets on other chains, failures. The intake (paste, CSV, case reference) is beside it. |
| `/vasp/[name]` | One VASP: its wallets by direction with case, account, USDT, evidence in words and tier, and transaction links; the addressee, FIU-IND sentence (only where listed) and law-enforcement channel; the asks (a freeze only where an account is known); **Draft one request**; and the request's status history as stops on a line with a form to record the next status. |
| `/vasp/[name]/request` | The request as an A4 letter: letterhead, To, Subject, numbered paragraphs, asks, the wallet table, a **blank legal-basis line**, signature block and seal box; every page ends with the reference and "Page X of Y". Print and "Request package (JSON)" on screen. |
| `/wallet/[address]?chain=` | One filed wallet: an overview, a signpost (funders, the wallet, the outbound VASP), the route line, typologies observed, funders, explorer-tag leads (verbatim, never an attribution), OFAC listing, provenance, **Read again** and **Take off the desk**. |
| `/cases` | Every case reference with its wallets, the VASPs they reach and the status of its requests. |
| `/requests` | The register (VASP, asks, wallets, status, sent and answered, reference, letter) and how VASPs answered, always stating how many requests it counts. |
| `/registry` | Every VASP NOIR can attribute to across TRON, Ethereum and Polygon: chains, seed wallets, deposit addresses, FIU-IND listing, whether a law-enforcement channel was found. |
| `/method` | The SIH26182 checklist from `lib/coverage.ts` with its gaps, how attribution decides in each direction, what the evidence words mean, and the truth rules. |

A search box on every screen opens a wallet address or a VASP by name.

Screenshots are in [`docs/screens/`](docs/screens/).

## Run it

```bash
npm ci
DEMO_MODE=true npm run dev      # recorded cases, no network needed
```

Open <http://localhost:3000>. Without `DEMO_MODE`, NOIR reads TRON, Ethereum and Polygon from public
endpoints; set `TRONGRID_API_KEY` (and `BLOCKSCOUT_API_KEY`) to avoid rate limits.

To build and serve:

```bash
npx next build --webpack
DEMO_MODE=true npx next start
```

### Demo mode

`DEMO_MODE=true` answers from recorded real cases in `data/` by **exact address match**, and never invents an
answer for an address it does not hold. Records answered this way carry the badge **Recorded**, and show the
moment the chain was read. These wallets attribute offline; file them on the desk to populate it:

```
TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx  TJjc21brTnnmKhiYHQuBD9Pxpfy7BwXHYQ  TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex
TRWDtgCfXzTcMv8W6iJxh6umeqeF3zG7n5  TXncpWJZ8ZxUcwrpTP4SE4nNhZnKZM4QzC  TVebSaNSdNHirwz46UPEzMgGy6pSQQu2aR
TUGHe9CTbZG44YvqfTSBd3mTAysCWcVNL6  TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj  TBfVDwNS6hC2Ln2qTLTRKMMPddscFEhhrU
TQGFsqQcGMSozKhjmEU9C4eA4gfbn5gQDn  0x77fB78EAC2021Cd52097168873324d3F1200E275
0x16a8D032ffe880535CD3e1815fe917e96A0715dd  0xda4E10D8B82ed53d950e2D4312A22331c515569c
1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa   (Bitcoin: recognised and screened, not traced)
```

### Where the desk lives

The shared desk is one file, `desk.json`, in `.noir/` (git-ignored). Set `NOIR_STATE_DIR` to put it on a
persistent disk. Delete it to start fresh. A desk file that cannot be read is reported as unreadable — never
shown as an empty desk.

### Who is at the desk

NOIR asks for no name and holds no passwords. Behind a department sign-in gateway, set `NOIR_IDENTITY_HEADER`
to the header the gateway adds and NOIR records that verified name against each filing and status change;
without one, actions are recorded without an actor. The letter's officer, designation, signature and seal are
always left blank for the officer to complete.

## API

The screens are built on these routes, so anything the interface does can be done from another system. All
`/api/desk` responses are `Cache-Control: no-store`. Types are in [`lib/desk-types.ts`](lib/desk-types.ts).

| Method | Route | Returns |
| --- | --- | --- |
| `GET` | `/api/desk` | `DeskView`: `rows` (one per VASP), `pending`, `unreadable`, `screenedOnly`, `failed`, `unrouted` |
| `POST` | `/api/desk` `{ text, caseRef? }` | `201 { added, merged, rejected }`. `text` is a pasted list or CSV `address[,chain][,case]`; every line is checked before any chain is read. `422` when no line is valid. Wallets are attributed in the background, one at a time. |
| `DELETE` | `/api/desk` `{ id }` | Takes a wallet off the desk. `404` if it is not there. |
| `POST` | `/api/desk/reattribute` `{ id }` | `202`. Reads the wallet again; the old record stays until the new one is written. |
| `GET` | `/api/desk/vasp/[name]` | `{ row, allowedAsks, letter }` for one VASP. `404` if nothing on the desk routes to it. |
| `GET` | `/api/desk/requests` | Every `VaspRequest`, newest first |
| `POST` | `/api/desk/requests` `{ vasp, asks }` | `201` the drafted `VaspRequest`. `422` for an unknown VASP, no asks, or a freeze where no account is known. |
| `GET` | `/api/desk/requests/[id]/export` | The request as a downloadable JSON package (`noir-request-v1`; `sahyog` reads "designed, not integrated"; `legalBasis` is `""`) |
| `PATCH` | `/api/desk/requests` `{ id, status, on?, reference?, note? }` | The request with its new status. Order: `drafted` → `sent` → `acknowledged` \| `data-received` \| `frozen` \| `refused` \| `no-response`. |

Examples, run against `DEMO_MODE=true npm run dev`:

```bash
# File wallets, with a case reference for lines that have none
curl -X POST localhost:3000/api/desk -H "content-type: application/json" \
  -d '{"text":"TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx\n0x77fB78EAC2021Cd52097168873324d3F1200E275","caseRef":"FIR 14/2026"}'
# → 201 {"added":[…2 entries, status "pending"…],"merged":[],"rejected":[]}

# A line that is not a wallet is refused, by line number, with the reason
curl -X POST localhost:3000/api/desk -H "content-type: application/json" -d '{"text":"not-a-wallet"}'
# → 422 {"added":[],"merged":[],"rejected":[{"line":1,"ok":false,"raw":"not-a-wallet","reason":"A TRON address starts with 'T' and an Ethereum address with '0x'."}]}

# The desk, grouped by VASP
curl localhost:3000/api/desk
# → {"rows":[{"vasp":"MEXC","wallets":[…],"outboundUsdt":27930.22,"inboundUsdt":10271.5,"canFreeze":true,…}, …],"pending":[],…}

# One VASP: its wallets, the asks it may be sent, and the letter as it would print
curl localhost:3000/api/desk/vasp/MEXC
# → {"row":{…},"allowedAsks":["kyc","access-logs","transactions","preservation","freeze"],"letter":{"legalBasis":"",…}}

# Draft one consolidated request for everything routed to MEXC, then record it as sent
curl -X POST localhost:3000/api/desk/requests -H "content-type: application/json" \
  -d '{"vasp":"MEXC","asks":["kyc","access-logs","transactions","preservation","freeze"]}'
# → 201 {"id":"r_6e1d0354eea1","vasp":"MEXC","entryIds":[…5…],"history":[{"status":"drafted",…}]}
curl -X PATCH localhost:3000/api/desk/requests -H "content-type: application/json" \
  -d '{"id":"r_6e1d0354eea1","status":"sent","on":"2026-09-29","reference":"LE-2026-88231"}'
# → the request, history: drafted, sent

# The request as a JSON package, for whatever intake follows
curl -OJ localhost:3000/api/desk/requests/r_6e1d0354eea1/export
# → noir-request-r_6e1d0354eea1.json: {"schema":"noir-request-v1","sahyog":"designed, not integrated","legalBasis":"",…,"accounts":[…5…]}

# The server says why it refused
curl -X POST localhost:3000/api/desk/requests -H "content-type: application/json" -d '{"vasp":"Bitget","asks":["freeze"]}'
# → 422 {"error":"A freeze cannot be asked of Bitget: no account there is known."}
```

The chain-reading routes the desk is built on are also served: `POST /api/trace`, `GET /api/trace/[address]`,
`GET /api/payers/[address]`, `GET /api/wallet/[address]`, `GET /api/tx/[hash]`, `GET /api/issuer/[address]`,
`GET /api/screen/[address]`, `GET /api/health`, and the shared case file and audit log at `/api/cases` and
`/api/audit` (`?format=jsonl` returns the audit log exactly as written; check it with
`node scripts/verify-audit.mjs`).

## What NOIR will not say

These are product rules; the interface and the printed letter are written to keep them.

- **Attribution is a deterministic lookup** against a provenance-tagged table. No language model, and no
  machine-learning model, decides an attribution.
- **Confidence is how much evidence was seen**, on a scale of 0 to 1. It is never a probability of being
  right and is never printed as a percentage.
- **An unreadable wallet is never reported as empty.** It says *could not be read*, and can be read again.
- **No statute is printed on a request.** The legal-basis line is blank for the officer to write.
- **SAHYOG integration is designed, not live.** NOIR is *built to route into SAHYOG*; it sends nothing itself.
  Recording a request as "sent" records that the officer sent it.
- **No rupee conversion.** Amounts are USDT. Timestamps are UTC and absolute ("14 Sep 2026, 08:02 UTC").
- **The FIU-IND line is a December 2023 fact** (Ministry of Finance, Lok Sabha Unstarred Question 112). A VASP
  absent from it is never described as unregistered.
- **An explorer tag is a lead, not an attribution.** It is shown verbatim on the wallet's page and never files
  a wallet under a VASP.
- **Tracing is live for TRON, Ethereum and Polygon (USDT).** Other chains are recognised and screened against
  the OFAC list, not traced.

## Restyling

Every visual value lives in `app/globals.css`; pages are composed only from the primitives in
`components/noir/`. [`docs/ui-tokens.md`](docs/ui-tokens.md) says which token controls what and how to apply a
reference image by editing tokens first.

## Checks

```bash
npx next typegen && npx tsc --noEmit
npx eslint .
node --import ./tests/register.mjs --test "tests/*.test.mjs"
npx next build --webpack
```

`tests/routes.test.mjs` calls the real route handlers on a temporary desk in recorded mode: it files wallets,
lets the worker attribute them, checks the grouping, drafting, the freeze refusal, the status order, the
`noir-request-v1` export and that the audit chain verifies.

## Layout

```
app/                 pages and the API routes (app/api/desk is the desk)
components/noir/     the primitives every screen is drawn from
components/desk/     the desk's own client pieces: intake, live progress, request forms
lib/                 chain clients, tracer, attribution, desk, requests, registry, coverage, analytics (backend);
                     lib/noir-format.ts (wording), lib/noir-view.ts and lib/desk-read.ts (what the screens read)
data/                label tables, FIU-IND annexure, law-enforcement channels, recorded cases
tests/               node:test suites
docs/                design notes, the problem statement, the UI token guide, screenshots
```
