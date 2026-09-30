# NOIR dispatch desk — backend design

Approved by the user on 29 Sep 2026. Contract: `lib/desk-types.ts` (types only).
Read `CONTEXT.md` and `PRODUCT.md` first.

## Decisions

| Question | Decision |
| --- | --- |
| How wallets enter | Pasted list or CSV through one parser; a single wallet is a list of one; each line checked locally before any chain read; a batch-level case ref fills blanks |
| Whose desk | One shared desk per server (the unit). Every filing records who filed it and under which case ref. "Mine" is a view, not a store |
| What a request asks | Fixed asks, each a checkbox, all ticked by default: `kyc`, `access-logs`, `transactions`, `preservation`, `freeze`. `freeze` only when the VASP row has an outbound account. No statute; a blank legal basis the officer fills |
| When attribution runs | Server-side serial queue. Filing writes `pending`; the worker attributes one at a time and stores the record as a snapshot; restart resumes pending; re-attribute is explicit |

## Units

1. **`lib/attribute.ts`** — `attributeWallet(wallet, chain, deps)` → `AttributionRecord`.
   Outbound from `runTrace` (`lib/tracer.ts`, amount/date `"auto"`): `terminal` with kind
   `exchange_deposit`/`exchange_hot` → `outbound`; else `outboundStop` from the path
   (`mixer`, `sanctioned`, `contract`, otherwise `none-found`). Inbound from `tracePayers`
   (`lib/payers.ts`): `exchanges` with `via: "table"` → `inbound`; `via: "explorer"` →
   `inboundLeads` only, never filed. Untraced chains → `traced: false`, screening only.
   A wallet whose history failed to read → `readable: false`, no VASPs, never empty.
   Deps (trace, payers, screen, clock) injected. Demo mode: outbound from
   `frozenTrace()`, inbound from `data/demo-payers.json`, exact address+chain match, `basis: "recorded"`.
2. **`lib/desk-intake.ts`** — `parseIntake(text, batchCaseRef)` → `IntakeLine[]`. Accepts
   one address per line, or CSV `address[,chain][,case]` with an optional header row
   (case-insensitive `address`/`wallet`, `chain`/`network`, `case`/`case ref`/`fir`).
   Separators: comma, tab, semicolon. Blank lines and `#` comments skipped. Chain from
   `checkAddress` (`lib/address.ts`) for traced chains; `polygon` only when the chain column
   says so for a `0x` address; other recognised formats via `identifyChain` (`lib/chains.ts`)
   → `traced: false`. Unrecognised → `ok: false` with a reason. Duplicates within one
   paste collapse to the first line (later case refs merged). Line numbers are 1-based.
3. **`lib/desk.ts`** (pure)
   - `fileWallets(file, lines, actor, now, newId)` → `{ added: DeskEntry[], merged: DeskEntry[] }` (mutates `file`).
     Same wallet+chain already on the desk → append a `Filing`, no new entry, status untouched.
     EVM addresses compare lower-cased; others exactly.
   - `removeEntry(file, id)`, `setRecord(file, id, record | error, now)` (status from the
     record: `readable:false` → `unreadable`; `traced:false` → `screened-only`; else
     `attributed`; error → `failed`), `markPending(file, id)` for re-attribute.
   - `groupByVasp(file)` → `DeskView`. A wallet sits under its outbound VASP and under each
     inbound VASP (a `RoutedWallet` per direction). Row: FIU (`fiuListing`), LE (`leContact`),
     distinct case refs, USDT per direction (sum, 2 dp), `canFreeze` = any outbound wallet,
     `request` = latest request to that VASP by drafted time, `uncoveredEntryIds` = row
     entry ids not in that request. Rows sorted by wallet count desc, then name. `unrouted`
     = attributed, readable, traced, no VASP either way. VASP names compare case-insensitively
     on letters and digits (as `lib/fiu.ts` keys them).
4. **`lib/requests.ts`** (pure)
   - `allowedAsks(row)` = all five, minus `freeze` when `!row.canFreeze`.
   - `draftRequest(file, vasp, asks, actor, now, newId)` → refuses unknown VASP, empty asks,
     an ask not allowed; snapshots the row's entry ids; history `[drafted]`.
   - `changeStatus(request, change)` → `drafted` only as the first status; the first change
     must be `sent`; after `sent` any of `acknowledged | data-received | frozen | refused |
     no-response`, in any order, repeats allowed. `on` must be `YYYY-MM-DD` if given;
     `reference` ≤ 80 chars, `note` ≤ 500, trimmed, empty → null.
   - `buildLetter(row, request | null, now)` → `RequestLetter`. `addressee` = FIU legal name
     if listed, else the VASP name. `legalBasis` is always `""`.
5. **`lib/desk-store.ts`** — `loadDesk()` / `changeDesk(fn)` on `desk.json` through
   `lib/state-file.ts` (`readStateFile`, `writeStateFile`, `serially`), same shape as
   `lib/case-store.ts`. A missing file is an empty desk; an unreadable file throws (never
   silently emptied — a shared desk must not vanish). `readDesk(unknown)` validates.
6. **Audit** — `AuditAction` in `lib/audit.ts` gains `desk.filed`, `desk.removed`,
   `desk.reattributed`, `request.drafted`, `request.status`. `scripts/verify-audit.mjs`
   must still verify (it re-states the hash rule; the action list may need the same change).
7. **`lib/desk-worker.ts`** — `globalThis` singleton; `kickDesk()` processes pending entries
   serially through `attributeWallet`, writing each result through `changeDesk`; started
   from `instrumentation.ts` and kicked after every filing/re-attribute.
8. **Routes** (`force-dynamic`, `no-store`, errors 400/404/503 like `/api/cases`, actor from `actorOf`)
   - `GET /api/desk` → `DeskView`; `POST /api/desk { text, caseRef? }` → `{ added, merged, rejected }`;
     `DELETE /api/desk { id }`; `POST /api/desk/reattribute { id }`.
   - `GET /api/desk/vasp/[name]` → `{ row, letter, allowedAsks }`.
   - `POST /api/desk/requests { vasp, asks }` → `VaspRequest`; `PATCH /api/desk/requests { id, status, on?, reference?, note? }`.
9. **`scripts/freeze-payers.mjs`** → `data/demo-payers.json`: payers for every recorded case,
   captured live, keyed by chain+address.

## The split

Two branches that merge without conflicts, split by file ownership.

- **Cloud (no network), branch `cloud/desk-core`:** units 2, 3, 4, 5, 6 and their tests
  (`tests/desk-intake.test.mjs`, `tests/desk.test.mjs`, `tests/requests.test.mjs`,
  `tests/desk-store.test.mjs` with a temporary `NOIR_STATE_DIR`, `tests/audit.test.mjs` extended).
- **Local (chain network), branch `claude/loving-tu-812683`:** units 1, 7, 8, 9, and
  `tests/attribute.test.mjs` with stubbed deps; then merge `cloud/desk-core` and verify
  end to end in demo mode.
- `lib/desk-types.ts` is shared and frozen; a change needs a line in the change log below.

## Testing

TDD, `node --import ./tests/register.mjs --test "tests/*.test.mjs"`. Before any push:
`npx next typegen; npx tsc --noEmit`, `npx eslint .`, all tests green.

## Rules

Deterministic attribution; confidence is not accuracy; unreadable is never empty; explorer
tags never file a wallet; no statute; SAHYOG not claimed live; no INR; UTC; figures counted
from `data/`.

## Change log

- 29 Sep 2026 — first version.
- 29 Sep 2026 — unit 1: outbound is the exchange node the money reached with the largest share
  (the tracer's own exit rule), even when `terminal` is a mixer or sanctioned stop that took
  another share; a stop is named only when no exchange was reached. Polygon inbound is
  `not-run`, because `tracePayers` reads any `0x` address as Ethereum. In demo mode a recorded
  trace without recorded payers leaves inbound `not-run` rather than reading the network.
- 29 Sep 2026 — runtime identifiers renamed to NOIR's own: `x-noir-officer` / `x-noir-unit` /
  `x-noir-provenance` headers, `NOIR_*` environment variables, `.noir/` state directory,
  fingerprint scheme `noir-findings-v1`. The UI half moved to a cloud session (`cloud/ui`).
- 30 Sep 2026 — movement since read: the desk and each wallet page ask `POST /api/watch` whether the
  wallets NOIR has read have sent USDT since (`lib/movement.ts`: every attributed, traced, readable
  wallet, most traced money first, at most 25 a check). Three answers, never two: moved, not moved,
  not checked. A destination is named only from NOIR's own table. The answer is kept per browser tab
  for ten minutes. The coverage item "High-risk wallet flags" is built; nothing is sent when the
  desk is closed, and the item says so.
- 30 Sep 2026 — an empty desk in demo mode offers the recorded cases in one step
  (`lib/recorded-cases.ts`): the same paste through the same intake, under case references that say
  they are samples, because no case file came with the recordings.
