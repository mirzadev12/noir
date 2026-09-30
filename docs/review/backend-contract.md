# Backend contract — L2, L3, L5, L9 (and what L4, L6, L8 change for a screen)

Written by the local session before the code, for the cloud session to build screens from.
If the code has to differ, this file is changed in the same commit. Status of each item is at
the end. Everything here follows `lib/desk-http.ts`: JSON, `Cache-Control: no-store`, an error
is `{ "error": "<a sentence a person can read>" }`, and a desk that cannot be stored is `503`.

Every write route can also answer `413` (body too large) and `429` (too many writes from one
client, with a `Retry-After` header in seconds). See L6 below.

## New and changed types (`lib/desk-types.ts`)

```ts
/** A case reference the unit has closed. Closing files nothing and removes nothing. */
export interface CaseClosure {
  caseRef: string;
  closedAt: string; // ISO, UTC: when it was recorded
  by: Actor;
  note: string | null; // why, at most 500 characters
}

/** DeskEntry gains two optional fields (L5). Absent on entries written before retries existed. */
export interface DeskEntry {
  // …unchanged fields…
  /** Times the worker has read this wallet since it was last queued. */
  attempts?: number;
  /** When the worker will read an unreadable wallet again by itself (ISO, UTC); null when it will not. */
  retryAt?: string | null;
}
```

`CaseRow` (`lib/analytics.ts`) gains `closed: CaseClosure | null`. It is always present.

## L2 — bulk actions

### `POST /api/desk/reattribute` — read wallets again, one or many

Body: exactly one selector.

| Body | Reads again |
| --- | --- |
| `{ "id": "e_…" }` | that wallet (as before) |
| `{ "ids": ["e_…", …] }` | those wallets; 1 to 500 ids |
| `{ "vasp": "MEXC" }` | every wallet routed to that VASP, either direction |
| `{ "caseRef": "FIR 114/2026" }` | every wallet filed under that case reference; `null` means the wallets filed with no case reference |

`202`:

```ts
{
  ok: true;
  queued: DeskEntry[];                                   // now "pending"; their last record stays until the new one lands
  skipped: { id: string; wallet: string; reason: string }[]; // e.g. "Already being read."
  entry?: DeskEntry;                                     // only for { id }, as before
}
```

`400` no selector, more than one, an empty or oversized `ids`. `404` nothing matched: an unknown
id, a VASP no wallet routes to, a case reference nothing is filed under (for `ids`, only when
none of them is on the desk; unknown ids among known ones are listed in `skipped`). One audit
line per wallet queued (`desk.reattributed`, with `bulk` naming the selector).

### `PATCH /api/desk/requests` — record a status on one request or on several

One request, as before: `{ id, status, on?, reference?, note? }` → `200` the `VaspRequest`.

Several: `{ ids: string[], status, on?, reference?, note? }` (1 to 100 ids; `on`, `reference`
and `note` apply to each).

```ts
// 200 when at least one changed, 422 when none did. Same shape either way.
{
  changed: VaspRequest[];
  refused: { id: string; error: string }[]; // each request is judged by its own rules
}
```

`400` when both `id` and `ids` are given, `ids` is not 1 to 100 strings, or `status` is not a
request status. A request in `refused` is unchanged; its `error` is the same sentence the
single form would have answered (`"The request is already recorded as sent."`, `"No request
with that id."`, a date before the step it follows, and so on). One audit line per request
changed (`request.status`, with `bulk: true`).

## L3 — case close-out

A case is a case reference. Closing one records that the unit is done with it; its wallets,
attributions and requests stay exactly as they are. While a case is closed, a filing that names
it is refused (see L4), and it can be reopened.

### `GET /api/desk/cases` → `200` `CaseRow[]`

The by-case view (`groupByCase`), newest filing first, each row with `closed`.

### `POST /api/desk/cases` — close or reopen

Body: `{ "caseRef": "FIR 114/2026", "action": "close" | "reopen", "note"?: string }`.

`200`:

```ts
{
  caseRef: string;
  closed: CaseClosure | null; // null after a reopen
  open: { pendingWallets: number; requestsAwaiting: number; requestsNotSent: number }; // what was still in motion when it was closed; all 0 after a reopen
}
```

`400` a missing `caseRef` or an `action` that is neither. `404` no wallet on the desk is filed
under that case reference. `409` closing a closed case, or reopening one that is not closed.
`422` a note over 500 characters. Closing is never refused because work is still in motion;
`open` says what was, so the screen can say it. Audit: `case.closed`, `case.reopened`.

The wallets filed with no case reference are not a case and cannot be closed.

### `GET /api/desk/cases/file?caseRef=…[&format=json|csv]` — the case file

`200`, as a download (`Content-Disposition: attachment; filename="noir-case-<ref>.json"`).
`400` no `caseRef`. `404` nothing is filed under it. `format=json` is the default:

```ts
{
  schema: "noir-case-file-v1";
  generatedAt: string;                 // ISO, UTC
  caseRef: string;
  closed: CaseClosure | null;
  wallets: {
    entryId: string; wallet: string; chain: string; status: EntryStatus;
    filedAt: string[];                 // each time it was filed under this case
    otherCases: string[];              // other case references it is also filed under
    readAt: string | null;             // when the chain was read
    basis: "live" | "recorded" | null;
    outbound: { vasp: string; account: string; usdt: number; evidenceSeen: string; tier: string; evidence: string | null; txHashes: string[] } | null;
    outboundStop: string | null;       // why no VASP was named outbound, when none was
    inbound: { vasp: string; payers: number; paidUsdt: number; evidenceSeen: string; tier: string }[];
    leads: { tag: string; payers: number; paidUsdt: number }[]; // explorer tags, verbatim; never attributions
    ofac: { entity: string; program: string | null } | null;
    typologies: { code: string; reason: string; at: string }[];
    responseHashes: string[];          // SHA-256 of each chain response behind the record
  }[];
  vasps: { vasp: string; legalName: string | null; fiuListed: boolean; leChannel: string | null; wallets: number; outboundUsdt: number; inboundUsdt: number }[];
  requests: { id: string; vasp: string; asks: Ask[]; status: RequestStatus; coversWallets: string[]; history: StatusChange[] }[];
  audit: { intact: boolean; head: string | null; entries: AuditEntry[] }; // the audit lines about these wallets and requests
  notes: string[];                     // the truth rules, in words: evidence seen is not accuracy, no statute, SAHYOG designed not integrated, UTC, USDT
}
```

`evidenceSeen` is the word (`"Strong evidence"`), never a number. `format=csv` is one row per
wallet and direction: `wallet, chain, direction, vasp, account, usdt, evidence_seen, tier,
read_at_utc, basis, status, other_cases`.

## L5 — retry and backoff

No new route. When a wallet could not be read, the worker reads it again by itself: at most
`MAX_READ_ATTEMPTS = 3` reads in all, 30 seconds after the first and 2 minutes after the second.
Between reads and after the last one the entry's status is `"unreadable"`; it is never
`"attributed"` with nothing in it and never reported as empty.

- `GET /api/desk` → each entry in `unreadable` carries `attempts` (1 to 3) and `retryAt` (the
  next read, or `null` once the attempts are spent). A screen can say "Could not be read. NOIR
  reads it again at 07:45 UTC (2 of 3)." or, with `retryAt: null`, "Could not be read in 3
  attempts. Read it again yourself."
- `POST /api/desk/reattribute` starts the count again (`attempts` back to 0, `retryAt` cleared).
- A wallet the worker threw on (`"failed"`) is not retried by itself: its `error` says why.

## L9 — evidence and recorded cases

No rows were added: every new deposit address, tagged wallet or recorded case is a live chain
read, and `docs/review/backend-asks.md` says which commands produce them. What is new is a
count of the provenance the existing rows carry.

### `GET /api/registry` → `200`

```ts
{
  rows: RegistryRow[];                 // as the /registry screen reads them
  totals: { vasps: number; chains: number; seedWallets: number; depositAddresses: number; fiuListed: number; leChannels: number };
  evidence: EvidenceLedger;
}

// lib/evidence.ts
export interface EvidenceLedger {
  seedWallets: { total: number; withSource: number };                    // tagged exchange wallets; the source is the explorer page that tags each
  depositAddresses: { total: number; withEvidence: number; withSeed: number }; // derived addresses; each with its evidence sentence and the tagged wallet it forwards to
  recordedCases: { total: number; withReadAt: number; withPayers: number };    // recorded chain reads; each with the moment it was read
  byChain: Record<"tron" | "ethereum" | "polygon", { seedWallets: number; depositAddresses: number }>;
  missing: { file: string; address: string; lacks: string }[];           // rows without provenance; empty in a sound build, and a test keeps it so
}
```

## What L4, L6 and L8 change for a screen

- **L4, `POST /api/desk`.** Same shape (`{ added, merged, rejected }`). New reasons in
  `rejected[].reason`: a repeated line names the line it repeats (`"The same wallet as line 3;
  it is filed once."`), a transaction hash is called one, a wrong-length or wrong-checksum
  address says which, and a line naming a closed case says when it was closed. A wallet listed
  twice under two different case references is filed under both.
- **L6, every write route.** `413 { error }` over the route's size limit (64 KB for a filing,
  16 KB for everything else). `429 { error }` with `Retry-After: <seconds>` past 60 writes a
  minute from one client.
- **L8, `GET /api/health`.** Adds `state: { writable: boolean; reason: string | null }` always (the
  state directory is probed at most once a minute). With `?deep=1` it also adds
  `chains: { tron, ethereum, polygon: "reachable" | "unreachable" }` and
  `chainsWhy: { tron, ethereum, polygon: string | null }` (why one did not answer: `"it answered 429:
  this deployment is being rate-limited"`, `"it did not answer"`, a setting that is not a URL).
  Without `deep` no chain is read, so an uptime monitor stays cheap. `ok` stays `true` when a chain is
  down: it says the server answers.

## Status

| Item | State |
| --- | --- |
| L1 contract | this file |
| L2 bulk actions | built (`tests/bulk.test.mjs`). A VASP is matched by each wallet's last record, so wallets already waiting to be read again are found and listed in `skipped` |
| L3 case close-out | built (`tests/case-close.test.mjs`). The closures are kept beside the desk in `case-closures.json`; `lib/desk-read.ts` `readCases()` now returns rows with `closed` |
| L4 filing validation | built (`tests/intake-validation.test.mjs`) |
| L5 retry and backoff | built (`tests/worker-retry.test.mjs`). A desk with a retry waiting wakes the worker when anyone reads it, so a restart loses no retry |
| L6 rate limits and size guards | built (`tests/write-guard.test.mjs`): `lib/write-guard.ts` wraps every write handler. `NOIR_WRITE_LIMIT` sets the writes a minute (0 turns it off) |
| L7 backup and restore scripts | built (`tests/backup.test.mjs`): `scripts/backup-state.mjs`, `scripts/restore-state.mjs`, both standalone. No route |
| L8 health | built (`tests/health.test.mjs`): `lib/health.ts` |
| L9 evidence ledger | built (`tests/evidence.test.mjs`): `lib/evidence.ts`, `GET /api/registry`. No row was added; `docs/review/backend-asks.md` says what needs the live network |
