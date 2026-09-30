# NOIR Dispatch Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build NOIR's VASP-first dispatch desk: file wallets, attribute each to the nearest VASP in both directions, group by VASP, draft one consolidated request per VASP and track its status, and then the screens.

**Architecture:** Pure modules (intake, desk, requests) over one JSON desk file (`desk.json` in the state directory), with a server-side serial worker that calls the inherited tracer and payers, and Next.js route handlers on top. Screens read the routes. Contract: `lib/desk-types.ts`.

**Tech Stack:** TypeScript 5, Next.js 16.3 (App Router, route handlers), React 19.2, Tailwind 4, Node 20.9+ (tests run on Node 24 with type stripping), `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-29-dispatch-desk-design.md`

## Global Constraints

- Attribution is a deterministic lookup; no language model decides it.
- Confidence is how much evidence was seen, never accuracy.
- An unreadable wallet is never reported as empty.
- An explorer tag never files a wallet under a VASP (`inboundLeads` only).
- No statute on any request; `legalBasis` is always `""`.
- SAHYOG integration is designed, not live; nothing claims otherwise.
- No INR conversion. Timestamps UTC, ISO 8601.
- Tests import `.ts` directly through Node type stripping: **no TS `enum`, no parameter properties, no `namespace`**; use `import type` for type-only imports.
- Test command: `node --import ./tests/register.mjs --test "tests/*.test.mjs"`.
- Before any push: `npx next typegen; npx tsc --noEmit` → 0, `npx eslint .` → 0, all tests pass.
- Push only to `origin` (mirzadev12/noir). Never touch any other repository or deployment.
- Shell for the user is PowerShell 5.1 (no `&&`); scripts in `package.json` must not rely on `&&`.
- Do not edit `lib/desk-types.ts` without a line in the spec's change log.

## Tracks and file ownership

| Track | Runs | Tasks | Branch |
| --- | --- | --- | --- |
| A — desk core (no network) | cloud agent | A1–A5 | `cloud/desk-core` |
| B — chain-facing + routes | local session | B1–B5 | `claude/loving-tu-812683` |
| Merge | local | M1 | `claude/loving-tu-812683` |
| C — UI, cloud half | cloud agent | C1–C2 | `cloud/ui-registry` |
| D — UI, local half | local session | D1–D5 | `claude/loving-tu-812683` |

A and B run side by side. C starts after M1 and D1 are pushed (it needs the merged API and the design tokens). No two tracks edit the same file.

Test fixtures used throughout (real, checksum-valid):

```js
const TRON_A = "TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN";   // MEXC customer deposit address
const TRON_B = "TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx";   // recorded case wallet
const ETH_A  = "0x77fB78EAC2021Cd52097168873324d3F1200E275"; // recorded Ethereum case
const BTC_A  = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";  // Bitcoin genesis, screened only
const OFFICER = { id: "I4C-2291", unit: "Cyber Crime Cell, Bengaluru", verified: false };
```

---

## Track A — desk core (cloud)

### Task A1: Intake parser

**Files:**
- Create: `lib/desk-intake.ts`
- Test: `tests/desk-intake.test.mjs`

**Interfaces:**
- Consumes: `checkAddress` (`lib/address.ts`), `identifyChain` (`lib/chains.ts`, returns `{ chain: ChainInfo, verified } | null`), `IntakeLine` (`lib/desk-types.ts`).
- Produces: `parseIntake(text: string, batchCaseRef?: string | null): IntakeLine[]`; `MAX_INTAKE_LINES = 500`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIntake, MAX_INTAKE_LINES } from "../lib/desk-intake.ts";

const TRON_A = "TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN";
const ETH_A = "0x77fB78EAC2021Cd52097168873324d3F1200E275";
const BTC_A = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

test("one address per line, batch case ref fills blanks", () => {
  const out = parseIntake(`${TRON_A}\n\n# note\n${ETH_A}`, "FIR 12/2026");
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { line: 1, ok: true, wallet: TRON_A, chain: "tron", traced: true, caseRef: "FIR 12/2026" });
  assert.equal(out[1].line, 4);
  assert.equal(out[1].chain, "ethereum");
});

test("csv with header, any column order, tab or semicolon", () => {
  const csv = `Case Ref;Wallet;Network\nC-1;${ETH_A.toLowerCase()};polygon\nC-2;${TRON_A};`;
  const out = parseIntake(csv, "BATCH");
  assert.equal(out.length, 2);
  assert.equal(out[0].ok && out[0].chain, "polygon");
  assert.equal(out[0].ok && out[0].wallet, ETH_A); // canonical EIP-55 spelling
  assert.equal(out[0].ok && out[0].caseRef, "C-1");
  assert.equal(out[1].ok && out[1].caseRef, "C-2");
});

test("untraced chains are accepted as screened-only", () => {
  const [line] = parseIntake(BTC_A);
  assert.equal(line.ok, true);
  assert.equal(line.chain, "bitcoin");
  assert.equal(line.traced, false);
});

test("bad lines are refused with a reason and a line number", () => {
  const out = parseIntake(`T123\nhello`);
  assert.equal(out.length, 2);
  assert.equal(out[0].ok, false);
  assert.equal(out[0].line, 1);
  assert.match(out[0].reason, /\S/);
  assert.equal(out[1].raw, "hello");
});

test("duplicates within one paste collapse to the first line", () => {
  const out = parseIntake(`${TRON_A},,C-1\n${TRON_A},,C-2`);
  assert.equal(out.length, 1);
  assert.equal(out[0].caseRef, "C-1");
});

test("polygon asked for a TRON address is refused", () => {
  const [line] = parseIntake(`${TRON_A},polygon`);
  assert.equal(line.ok, false);
});

test("too many lines are refused past the limit", () => {
  const out = parseIntake(Array(MAX_INTAKE_LINES + 1).fill(TRON_A).join("\n"));
  assert.ok(out.some((l) => !l.ok && /limit|at most/i.test(l.reason)));
});
```

- [ ] **Step 2: Run to verify failure** — `node --import ./tests/register.mjs --test tests/desk-intake.test.mjs` → FAIL (module not found).
- [ ] **Step 3: Implement.** Rules: split lines on `\r?\n`; skip empty and `#` lines; cell separator is the first of `\t`, `;`, `,` present in the line; header row = first non-skipped line whose cells contain a word matching `/^(address|wallet)$/i` (case-insensitive, trimmed) — map columns `address|wallet`, `chain|network|blockchain`, `case|case ref|case reference|fir|reference`; without a header, columns are `address, chain, case`. Chain cell (lower-cased): `""` → from address; `tron|trx|trc20` → must be TRON; `ethereum|eth|erc20` → must be `0x`; `polygon|matic|pol` → must be `0x`, chain `polygon`; anything else → refused `"Chain 'x' is not one NOIR reads"`. Address: `checkAddress(raw)`; valid → traced; invalid and `identifyChain(raw)` non-null → `{ ok: true, chain: guess.chain.id, traced: false }` unless `guess.chain.traceable` (then refuse with `checkAddress`'s reason); otherwise refuse with `checkAddress`'s reason. Case ref: cell trimmed, ≤ 80 chars, else batch ref, else null. Dedupe key: `chain + ":" + (0x ? lowercase : address)`. Past `MAX_INTAKE_LINES` valid-or-invalid lines, add one refusal `{ line, ok: false, raw: "", reason: "At most 500 lines per filing" }` and stop.
- [ ] **Step 4: Run tests** → PASS.
- [ ] **Step 5: Commit** `feat(desk): intake parser for pasted lists and CSV`.

### Task A2: Desk file operations and grouping

**Files:**
- Create: `lib/desk.ts`
- Test: `tests/desk.test.mjs`

**Interfaces:**
- Consumes: types from `lib/desk-types.ts`; `fiuListing` (`lib/fiu.ts`); `leContact` (`lib/le-contacts.ts`); `Actor` (`lib/identity.ts`).
- Produces:
  - `emptyDesk(): DeskFile`
  - `vaspKey(name: string): string` (lower-case, letters and digits only)
  - `fileWallets(file: DeskFile, lines: IntakeLine[], by: Actor, now: string, newId: () => string): { added: DeskEntry[]; merged: DeskEntry[] }` — mutates `file`.
  - `removeEntry(file: DeskFile, id: string): DeskEntry | null`
  - `setRecord(file: DeskFile, id: string, result: { record: AttributionRecord } | { error: string }, now: string): DeskEntry | null`
  - `markPending(file: DeskFile, id: string): DeskEntry | null`
  - `groupByVasp(file: DeskFile): DeskView`
  - `newEntryId()`, `newRequestId()` using `crypto.randomUUID()` hex → `"e_" + 12 hex` / `"r_" + 12 hex`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDesk, fileWallets, groupByVasp, markPending, removeEntry, setRecord, vaspKey } from "../lib/desk.ts";

const TRON_A = "TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN";
const TRON_B = "TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx";
const ETH_A = "0x77fB78EAC2021Cd52097168873324d3F1200E275";
const OFFICER = { id: "I4C-2291", unit: "Cyber Crime Cell, Bengaluru", verified: false };
const NOW = "2026-09-29T10:00:00.000Z";
let n = 0;
const id = () => `e_${String(++n).padStart(12, "0")}`;
const line = (wallet, chain, caseRef = null) => ({ line: 1, ok: true, wallet, chain, traced: true, caseRef });

function record(wallet, chain, over = {}) {
  return {
    wallet, chain, traced: true, readable: true,
    outbound: null, outboundStop: "none-found", inbound: [], inboundLeads: [], inboundRead: "read",
    sanctioned: null,
    provenance: { generatedAt: NOW, basis: "live", apiCalls: 3, responseHashes: ["a".repeat(64)] },
    ...over,
  };
}
const out = (vasp, account, usdt) => ({
  outbound: { vasp, kind: "exchange_deposit", account, confidence: 0.8, source: "heuristic", evidence: "12 sweeps", usdt, txHashes: ["h1"] },
  outboundStop: null,
});
const inb = (vasp, payers, paidUsdt) => ({ vasp, kind: "exchange_hot", payers, paidUsdt, confidence: 1, source: "ground_truth" });

test("filing twice merges case refs into one entry", () => {
  const desk = emptyDesk();
  const a = fileWallets(desk, [line(TRON_A, "tron", "C-1")], OFFICER, NOW, id);
  const b = fileWallets(desk, [line(TRON_A, "tron", "C-2")], OFFICER, NOW, id);
  assert.equal(a.added.length, 1);
  assert.equal(b.added.length, 0);
  assert.equal(b.merged.length, 1);
  assert.equal(desk.entries.length, 1);
  assert.deepEqual(desk.entries[0].filings.map((f) => f.caseRef), ["C-1", "C-2"]);
  assert.equal(desk.entries[0].status, "pending");
});

test("EVM addresses compare case-insensitively, per chain", () => {
  const desk = emptyDesk();
  fileWallets(desk, [line(ETH_A, "ethereum")], OFFICER, NOW, id);
  fileWallets(desk, [line(ETH_A.toLowerCase(), "ethereum")], OFFICER, NOW, id);
  fileWallets(desk, [line(ETH_A, "polygon")], OFFICER, NOW, id);
  assert.equal(desk.entries.length, 2);
});

test("setRecord derives the status from the record", () => {
  const desk = emptyDesk();
  const [e] = fileWallets(desk, [line(TRON_A, "tron")], OFFICER, NOW, id).added;
  setRecord(desk, e.id, { record: record(TRON_A, "tron", { readable: false, outboundStop: null, inboundRead: "not-run" }) }, NOW);
  assert.equal(desk.entries[0].status, "unreadable");
  setRecord(desk, e.id, { error: "boom" }, NOW);
  assert.equal(desk.entries[0].status, "failed");
  assert.equal(desk.entries[0].error, "boom");
  markPending(desk, e.id);
  assert.equal(desk.entries[0].status, "pending");
  assert.equal(removeEntry(desk, e.id)?.id, e.id);
  assert.equal(desk.entries.length, 0);
});

test("groupByVasp files a wallet under both directions and sums per direction", () => {
  const desk = emptyDesk();
  const [a] = fileWallets(desk, [line(TRON_A, "tron", "C-1")], OFFICER, NOW, id).added;
  const [b] = fileWallets(desk, [line(TRON_B, "tron", "C-2")], OFFICER, NOW, id).added;
  setRecord(desk, a.id, { record: record(TRON_A, "tron", { ...out("MEXC", "TACCT", 100.005), inbound: [inb("Binance", 2, 40)] }) }, NOW);
  setRecord(desk, b.id, { record: record(TRON_B, "tron", { ...out("mexc", "TACCT2", 50) }) }, NOW);
  const view = groupByVasp(desk);
  assert.deepEqual(view.rows.map((r) => r.vasp), ["MEXC", "Binance"]);
  const mexc = view.rows[0];
  assert.equal(mexc.wallets.length, 2);
  assert.deepEqual(mexc.caseRefs, ["C-1", "C-2"]);
  assert.equal(mexc.outboundUsdt, 150.01);
  assert.equal(mexc.canFreeze, true);
  const binance = view.rows[1];
  assert.equal(binance.wallets[0].direction, "inbound");
  assert.equal(binance.inboundUsdt, 40);
  assert.equal(binance.canFreeze, false);
});

test("explorer leads never make a row; unreadable, screened and unrouted are listed apart", () => {
  const desk = emptyDesk();
  const [a] = fileWallets(desk, [line(TRON_A, "tron")], OFFICER, NOW, id).added;
  const [b] = fileWallets(desk, [line(TRON_B, "tron")], OFFICER, NOW, id).added;
  fileWallets(desk, [line(ETH_A, "ethereum")], OFFICER, NOW, id);
  setRecord(desk, a.id, { record: record(TRON_A, "tron", { inboundLeads: [{ tag: "Some Exchange 3", payers: 1, paidUsdt: 5 }] }) }, NOW);
  setRecord(desk, b.id, { record: record(TRON_B, "tron", { readable: false, outboundStop: null, inboundRead: "not-run" }) }, NOW);
  const view = groupByVasp(desk);
  assert.equal(view.rows.length, 0);
  assert.equal(view.unrouted.length, 1);
  assert.equal(view.unreadable.length, 1);
  assert.equal(view.pending.length, 1);
});

test("row carries the latest request and the entries it does not cover", () => {
  const desk = emptyDesk();
  const [a] = fileWallets(desk, [line(TRON_A, "tron")], OFFICER, NOW, id).added;
  const [b] = fileWallets(desk, [line(TRON_B, "tron")], OFFICER, NOW, id).added;
  setRecord(desk, a.id, { record: record(TRON_A, "tron", out("MEXC", "T1", 1)) }, NOW);
  setRecord(desk, b.id, { record: record(TRON_B, "tron", out("MEXC", "T2", 1)) }, NOW);
  desk.requests.push({ id: "r_1", vasp: "MEXC", asks: ["kyc"], entryIds: [a.id], history: [{ status: "drafted", at: NOW, by: OFFICER, on: null, reference: null, note: null }] });
  const [row] = groupByVasp(desk).rows;
  assert.equal(row.request.id, "r_1");
  assert.deepEqual(row.uncoveredEntryIds, [b.id]);
});

test("vaspKey ignores case and punctuation", () => {
  assert.equal(vaspKey("Gate.io"), vaspKey("gateio"));
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** per the spec's unit 3. Row name = the spelling first seen. USDT sums rounded with `Math.round(x * 100) / 100`. Rows sorted by distinct wallet count desc, then `vasp` ascending. `fiu: fiuListing(vasp)`, `le: leContact(vasp)`. `request` = the request for that `vaspKey` whose `history[0].at` is latest. `caseRefs` = distinct non-null refs from each wallet's entry filings, in first-seen order. Wallets within a row sorted outbound first, then by `usdt` desc.
- [ ] **Step 4: Run tests** → PASS.
- [ ] **Step 5: Commit** `feat(desk): file, merge and group wallets by VASP`.

### Task A3: Requests and letter

**Files:**
- Create: `lib/requests.ts`
- Test: `tests/requests.test.mjs`

**Interfaces:**
- Consumes: `groupByVasp`, `vaspKey`, `newRequestId` (A2); types.
- Produces:
  - `ASK_LABEL: Record<Ask, string>` — `kyc`: "Identity (KYC) of the account holder", `access-logs`: "IP addresses, device and login records", `transactions`: "Transaction history of the named accounts", `preservation`: "Preservation of all records pending legal process", `freeze`: "Freeze of balances in the named accounts".
  - `STATUS_LABEL: Record<RequestStatus, string>` — "Drafted", "Sent", "Acknowledged", "Data received", "Frozen", "Refused", "No response".
  - `allowedAsks(row: VaspRow): Ask[]`
  - `draftRequest(file: DeskFile, vasp: string, asks: Ask[], by: Actor, now: string, newId: () => string): { ok: true; request: VaspRequest } | { ok: false; error: string }` — pushes onto `file.requests`.
  - `changeStatus(request: VaspRequest, change: { status: RequestStatus; on?: string | null; reference?: string | null; note?: string | null }, by: Actor, now: string): { ok: true } | { ok: false; error: string }` — mutates.
  - `currentStatus(request: VaspRequest): RequestStatus`
  - `buildLetter(row: VaspRow, request: VaspRequest | null, now: string): RequestLetter`

- [ ] **Step 1: Write the failing tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDesk, fileWallets, groupByVasp, setRecord } from "../lib/desk.ts";
import { allowedAsks, buildLetter, changeStatus, currentStatus, draftRequest } from "../lib/requests.ts";

const TRON_A = "TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN";
const OFFICER = { id: "I4C-2291", unit: "Cyber Crime Cell, Bengaluru", verified: false };
const NOW = "2026-09-29T10:00:00.000Z";
let n = 0;
const id = () => `x_${++n}`;

function deskWith(outbound) {
  const desk = emptyDesk();
  const [e] = fileWallets(desk, [{ line: 1, ok: true, wallet: TRON_A, chain: "tron", traced: true, caseRef: "C-1" }], OFFICER, NOW, id).added;
  setRecord(desk, e.id, { record: {
    wallet: TRON_A, chain: "tron", traced: true, readable: true,
    outbound: outbound ? { vasp: "CoinDCX", kind: "exchange_deposit", account: "TACCT", confidence: 0.9, source: "heuristic", evidence: null, usdt: 10, txHashes: [] } : null,
    outboundStop: outbound ? null : "none-found",
    inbound: outbound ? [] : [{ vasp: "CoinDCX", kind: "exchange_hot", payers: 1, paidUsdt: 5, confidence: 1, source: "ground_truth" }],
    inboundLeads: [], inboundRead: "read", sanctioned: null,
    provenance: { generatedAt: NOW, basis: "live", apiCalls: 1, responseHashes: [] },
  } }, NOW);
  return desk;
}

test("freeze is allowed only with an outbound account", () => {
  assert.ok(allowedAsks(groupByVasp(deskWith(true)).rows[0]).includes("freeze"));
  assert.ok(!allowedAsks(groupByVasp(deskWith(false)).rows[0]).includes("freeze"));
});

test("drafting validates asks and snapshots the row's entries", () => {
  const desk = deskWith(false);
  assert.equal(draftRequest(desk, "CoinDCX", ["freeze"], OFFICER, NOW, id).ok, false);
  assert.equal(draftRequest(desk, "CoinDCX", [], OFFICER, NOW, id).ok, false);
  assert.equal(draftRequest(desk, "Nowhere", ["kyc"], OFFICER, NOW, id).ok, false);
  const r = draftRequest(desk, "coindcx", ["kyc", "kyc", "preservation"], OFFICER, NOW, id);
  assert.equal(r.ok, true);
  assert.deepEqual(r.request.asks, ["kyc", "preservation"]); // deduped, in ASKS order
  assert.equal(r.request.vasp, "CoinDCX");
  assert.equal(r.request.entryIds.length, 1);
  assert.equal(currentStatus(r.request), "drafted");
});

test("status must go drafted → sent → any answer", () => {
  const desk = deskWith(true);
  const { request } = draftRequest(desk, "CoinDCX", ["kyc", "freeze"], OFFICER, NOW, id);
  assert.equal(changeStatus(request, { status: "frozen" }, OFFICER, NOW).ok, false);
  assert.equal(changeStatus(request, { status: "sent", on: "2026-09-29", reference: " SAH/1 " }, OFFICER, NOW).ok, true);
  assert.equal(request.history[1].reference, "SAH/1");
  assert.equal(changeStatus(request, { status: "drafted" }, OFFICER, NOW).ok, false);
  assert.equal(changeStatus(request, { status: "acknowledged", on: "29-09-2026" }, OFFICER, NOW).ok, false);
  assert.equal(changeStatus(request, { status: "acknowledged" }, OFFICER, NOW).ok, true);
  assert.equal(changeStatus(request, { status: "frozen", note: "" }, OFFICER, NOW).ok, true);
  assert.equal(request.history.at(-1).note, null);
  assert.equal(currentStatus(request), "frozen");
});

test("the letter prints no statute and addresses the FIU legal name", () => {
  const desk = deskWith(true);
  const row = groupByVasp(desk).rows[0];
  const letter = buildLetter(row, null, NOW);
  assert.equal(letter.legalBasis, "");
  assert.equal(letter.addressee, row.fiu ? row.fiu.legalName : "CoinDCX");
  assert.ok(row.fiu, "CoinDCX is in the FIU-IND annexure");
  assert.deepEqual(letter.asks, allowedAsks(row));
  assert.equal(JSON.stringify(letter).match(/Section|Act,|BNSS|CrPC|PMLA/), null);
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** per spec unit 4. `buildLetter` asks = the request's asks when given, else `allowedAsks(row)`; wallets = the row's wallets (when a request is given, only those whose `entryId` is in `request.entryIds`); caseRefs recomputed from those wallets.
- [ ] **Step 4: Run tests** → PASS.
- [ ] **Step 5: Commit** `feat(desk): consolidated requests, status history and letter`.

### Task A4: Desk store

**Files:**
- Create: `lib/desk-store.ts`
- Test: `tests/desk-store.test.mjs`

**Interfaces:**
- Consumes: `readStateFile`, `writeStateFile`, `serially` (`lib/state-file.ts`); `emptyDesk` (A2).
- Produces: `readDesk(v: unknown): DeskFile` (throws on a shape it cannot read), `loadDesk(): Promise<DeskFile>`, `changeDesk<T>(change: (file: DeskFile) => T): Promise<T>`; file name `desk.json`.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "noir-desk-"));
process.env.NOIR_STATE_DIR = dir;
const { changeDesk, loadDesk, readDesk } = await import("../lib/desk-store.ts");

test.after(() => rmSync(dir, { recursive: true, force: true }));

test("a missing file is an empty desk", async () => {
  assert.deepEqual(await loadDesk(), { version: 1, entries: [], requests: [] });
});

test("changes are serialised and persisted", async () => {
  await Promise.all([1, 2, 3].map((i) => changeDesk((f) => { f.requests.push({ id: `r_${i}` }); })));
  assert.equal((await loadDesk()).requests.length, 3);
});

test("an unreadable file throws rather than emptying the shared desk", async () => {
  writeFileSync(path.join(dir, "desk.json"), "{not json");
  await assert.rejects(loadDesk());
  assert.throws(() => readDesk({ version: 2 }));
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement** like `lib/case-store.ts`, but `loadDesk` rethrows parse errors (with message `"desk.json could not be read"`). `readDesk` requires `version === 1` and array `entries`/`requests`.
- [ ] **Step 4: Run tests** → PASS.
- [ ] **Step 5: Commit** `feat(desk): shared desk file in the state directory`.

### Task A5: Audit actions

**Files:**
- Modify: `lib/audit.ts:27` and `lib/audit.ts:57`
- Modify: `scripts/verify-audit.mjs` (only if it lists actions)
- Test: `tests/audit.test.mjs` (append)

**Interfaces:**
- Produces: `AuditAction` gains `"desk.filed" | "desk.removed" | "desk.reattributed" | "request.drafted" | "request.status"`.

- [ ] **Step 1: Append failing test**

```js
test("desk and request actions are valid audit entries", () => {
  for (const action of ["desk.filed", "desk.removed", "desk.reattributed", "request.drafted", "request.status"]) {
    const e = nextEntry(null, { action, actor: officer, chain: "tron", address: "TX1so33jdGd8JkYD7JVB6q1i4QUDhPB2MN", detail: { n: 1 } }, "2026-09-29T10:00:00.000Z");
    assert.deepEqual(parseEntry(JSON.stringify(e)), e);
  }
});
```

- [ ] **Step 2: Run** → FAIL (`parseEntry` returns null).
- [ ] **Step 3: Add the five actions** to the union and `ACTIONS`; mirror in `scripts/verify-audit.mjs` if it checks actions.
- [ ] **Step 4: Run all tests, tsc, eslint** → PASS.
- [ ] **Step 5: Commit** `feat(audit): desk and request actions`; push `cloud/desk-core`.

---

## Track B — chain-facing + routes (local)

### Task B1: Attribution record

**Files:**
- Create: `lib/attribute.ts`
- Test: `tests/attribute.test.mjs`

**Interfaces:**
- Consumes: `runTrace` (`lib/tracer.ts`), `tracePayers` (`lib/payers.ts`), `screenAddress` (`lib/screen.ts`), `frozenTrace` / `DEMO_MODE` (`lib/demo.ts`), `data/demo-payers.json`.
- Produces: `attributeWallet(wallet: string, chain: EntryChain, deps?: Partial<AttributeDeps>): Promise<AttributionRecord>`; `recordFrom(trace: TraceResult | null, payers: PayersTrace | null, screening, wallet, chain, basis): AttributionRecord` (pure, tested directly).

- [ ] **Step 1: Tests** with stub trace/payers objects: exchange_deposit terminal → outbound with account = `depositAddress ?? address`, usdt = terminal node's `taintedValueUsdt`, txHashes = edges into the terminal; mixer/sanctioned/contract node on path with no terminal → matching stop; readable path with none → `none-found`; subject unread (tracer marks it) → `readable:false`, no VASPs; payers `via:"explorer"` → leads only; payers unreadable → `inboundRead:"unreadable"`; bitcoin → `traced:false`, `sanctioned` from screening.
- [ ] **Step 2–4:** red, implement, green.
- [ ] **Step 5: Commit** `feat(desk): attribution record from tracer and payers`.

### Task B2: Recorded payers for demo mode

**Files:**
- Create: `scripts/freeze-payers.mjs`, `data/demo-payers.json`
- Modify: `lib/attribute.ts` (read recorded payers by `chain:address`)

- [ ] Script reads `data/demo-cases.json`, calls `tracePayers` through a running server's `/api/payers/[address]` (as `freeze-cases.mjs` does), keeps only readable answers, writes `{ capturedAt, cases: { "tron:T…": PayersTrace } }`. Run it live; commit the data.

### Task B3: Worker

**Files:**
- Create: `lib/desk-worker.ts`; Modify: `instrumentation.ts`

- [ ] `kickDesk()` on `globalThis.__noirDesk`; loop: `changeDesk` to pick the first pending id; `attributeWallet`; `changeDesk(setRecord)`; until none pending; never two loops. Instrumentation starts it after the alert loop.

### Task B4: Routes

**Files:**
- Create: `app/api/desk/route.ts`, `app/api/desk/reattribute/route.ts`, `app/api/desk/vasp/[name]/route.ts`, `app/api/desk/requests/route.ts`

- [ ] Per spec unit 8, each mutation appends its audit action with `actorOf(request.headers)`.

### Task B5: Verify end to end

- [ ] `DEMO_MODE=true` production build; file the recorded wallets through `POST /api/desk`; `GET /api/desk` groups them; draft and advance a request; audit verifies (`node scripts/verify-audit.mjs`).

### Task M1: Merge

- [ ] `git fetch origin; git merge origin/cloud/desk-core`; full checks; push.

---

## Track D — UI, local half (after M1)

Design contract: `.impeccable/briefs/console.md`. **Every visual value lives in one place** so a reference image can restyle the app quickly: colour, type, spacing, rule weights and radii are CSS custom properties in `app/globals.css` (`@theme` for Tailwind), and every screen is composed from `components/noir/*` primitives — no hex, font name or pixel value inside a page.

### Task D1: Tokens and primitives
- [ ] `app/globals.css` tokens: `--noir-ground #FFFFFF`, `--noir-ink #111111`, `--noir-sign #FFCC00`, `--noir-route #0A4FD6`, `--noir-rule #D4D4D0`, `--noir-rule-heavy 2px`, fonts Archivo + JetBrains Mono via `next/font`, spacing scale. `components/noir/`: `Shell` (black sidebar + main), `Sign` (yellow destination block), `Arrow`, `Rule`, `Mono`, `Figure`, `Button`, `ChainBadge`, `Table`, `Tag`. Push before Track C starts.

### Task D2: Desk (`/desk`) — VASP rows, pending/unreadable/unrouted, intake box.
### Task D3: VASP page (`/vasp/[name]`) and request letter (`/request/[id]` or `/vasp/[name]/request`) — asks checkboxes, print-ready, status changes.
### Task D4: Wallet (`/wallet/[address]?chain=`) — both directions, confidence, evidence tier.
### Task D5: Landing (`/`) — paste a wallet, the argument, figures counted from `data/`.

## Track C — UI, cloud half (after D1 pushed)

### Task C1: Registry (`/registry`) — `lib/registry.ts` (pure, tested): one row per VASP across chains from the label tables: chains, seed wallets, derived deposit addresses, FIU-IND listing, LE channel. Screen built only from `components/noir/*`.
### Task C2: Requests register (`/requests`) — every request from `GET /api/desk` rows, status, dates, VASP, wallets covered; built only from `components/noir/*`.
