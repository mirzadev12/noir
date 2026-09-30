# Review feedback for `cloud/ui`

Written by the local session after each push it reviews. The cloud session fixes
every item marked **OPEN** before new work, and records each fix in
`docs/review/feedback-done.md` (`<id> — <commit> — what changed`). This file is
edited only by the local session.

## Round 1 — foundation

The foundation is strong: tokens locked down with Tailwind's own palette removed,
a NOIR-only README, a token-driven Sign. Fix these:

- **F1 — CLOSED — No kicker above a heading.** `Sign` has a `kicker` prop rendering
  small capitals above the title ("Destination · outbound"). The design rules ban
  eyebrow and kicker labels above headings outright. Remove the prop. Put that
  information in the sub-lines under the title, or let the arrow alone say the
  direction.
- **F2 — CLOSED — Fixed type scale on working screens.** `--text-title`, `--text-sign`,
  `--text-display` and `--text-figure` are `clamp()` fluid sizes. Operate screens
  (desk, VASP, wallet, cases, requests, registry, method, letter) want a fixed rem
  scale that steps at breakpoints, not with the viewport. Keep fluid sizing only
  for the landing page's headline if you want it (a separate token).
- **F3 — CLOSED — Minimum text size.** `--text-micro` is 0.6875rem (11px). Officers
  read this at a desk in daylight; nothing in the product goes below 0.75rem (12px).
- **F4 — CLOSED — Old internal docs must stay deleted.** `docs/BRAINSTORM.md`,
  `docs/HANDOFF.md`, `docs/backend-notes.md` and `docs/features/` exist on your
  branch because it started before they were moved off the repository. They name
  another project. When you merge `origin/claude/loving-tu-812683`, keep their
  deletion, and never recreate or reference them.

## Round 2 — landing, rendered at 1440×900 and 390×844

Round 1 (F1–F4) is confirmed fixed. The landing is strong: the condensed
headline, one yellow sign at the end of a real recorded route, counted figures,
no overflow at 390, and impeccable's detector reports nothing mechanical. Fix these:

- **L1 — CLOSED (verified on render) — Addresses break with orphan fragments.** Full addresses wrap
  anywhere, so the recorded wallet ends "…E27" with "5" alone on the next line
  (desktop) and the account splits unevenly. Give `Mono` a display that never
  orphans: either shorten from the middle (`shortAddress`) with the full value
  in `title` and a copy control, or split a full address into two equal halves
  that break only between them. Apply it everywhere an address is shown in running
  layout; tables and the printed letter may keep the full value.
- **L2 — CLOSED (verified on render) — The figures band is the hero-metric template.** Uppercase micro
  label, big number, small caption, repeated six times is the pattern the design
  rules refuse. Set the figures as a departure board instead: one ruled list
  where each row reads left to right, like signage: the figure (mono,
  right-aligned, fixed width), what it counts, and the source file or date.
  Same data, the world's own form.
- **L3 — CLOSED (verified on render) — Copy overclaims an obligation.** "drafts the one request that
  VASP must receive" makes the VASP sound legally bound. Say "drafts one request
  to that VASP" (or similar) instead.
- **L4 — CLOSED (verified on render) — Double label on the officer form.** The sidebar shows "OFFICER ID
  / UNIT", then "ID" and "UNIT" again above the fields. Keep one level: the two
  field labels, with the line "Recorded as stated, not verified" under them.
- **L5 — CLOUD — Cases route.** The sidebar lists Desk, Requests, Registry and
  Method; add Cases (between Desk and Requests) when /cases lands.

## Round 3 — desk, rendered with 9 recorded wallets from 2 cases, 1440 and 390

The desk works on real data: the yellow sign names the next VASP to write to
(MEXC, 4 wallets, no request yet), OFAC flags come first and are true
(TBfVDw… is itself on the SDN list, ISIL KHORASAN), other chains are listed
apart, and there's no overflow at 390. Round 2 items L1–L5 are still open. Also fix:

- **D1 — LOCAL (in progress) — The VASP rows repeat their labels.** Every row prints "WALLETS",
  "USDT OUT" and "USDT IN" again, so six rows show 18 micro labels. It reads as a
  stack of cards, not a board. Make it one table with a single header row:
  VASP · Wallets (out / in) · Cases · USDT out · USDT in · Request. Keep the heavy
  VASP name as the row's first cell, and stack the cells under the name on phones.
  Show a zero as "—" rather than "0.00" or "0 outbound", so the eye lands on what exists.
- **D2 — LOCAL (in progress) — Unlabelled counts beside section titles.** "OFAC flags … 2",
  "Where the wallets go … 6" and "On other chains … 1" set a bare number at the
  far right of the rule. Say what it counts ("2 wallets", "6 VASPs", "1 wallet")
  or drop it; the section lead already says it.
- **D3 — LOCAL (in progress) — L1 again, in tables.** The OFAC table wraps TUGHe9…/TBfVDw… with
  one character alone on a second line ("6", "U"). The same `Mono` fix applies.
- Not a defect: the hydration warning seen in automation comes from the
  screenshot tool hiding the caret; ignore it.

## Round 4 — from prototype to a professional, complete MVP (applies to every screen)

The user's verdict on what exists: correct, but it reads as a prototype. Raise
the whole product to the finish of a shipped government-grade tool. Every item
here is required; build each one fully.

- **P1 — LOCAL (in progress) — A landing that sells the product, not an app screen.** The
  landing shows the app sidebar and the officer form, so it looks like an
  unfinished screen. Give `/` its own frame: a black top band (NOIR wordmark on
  yellow, links Desk · Method · Registry, and an "Open the desk" button), no
  sidebar and no officer form. Then, top to bottom:
  1. Hero: the headline and lede on the left. On the right, a live preview of
     the desk as a departure board: 4–5 real rows computed offline from the
     recorded cases (VASP · wallets out/in · USDT · "Write next" on the top row),
     labelled "Recorded cases", linking to /desk. The yellow field is the top row.
  2. The intake box.
  3. "How NOIR routes a wallet": the four stages on one horizontal route line
     (File → Attribute both directions → One request per VASP → Track the reply),
     each stop with one plain sentence.
  4. The recorded route (what exists now).
  5. The departure board of figures.
  6. What NOIR does not say.
  7. A closing band with one call to action.
  8. A proper footer: "SIH 2026 · SIH26182 · MHA / I4C", the data sources with
     their dates (OFAC list of 18 Sep 2026, the FIU-IND annexure of 4 Dec 2023, LE
     contacts read on their stated dates), "Built to route into SAHYOG; not
     integrated", and links to Method, Registry and the README.
- **P2 — LOCAL (in progress) — App shell context.** Inside the app, every screen gets a context
  bar above the page title: a breadcrumb (Desk / MEXC / Request) and, on the
  right, the officer's stated identity ("Recorded as I4C-2291 · Cyber Crime
  Cell", which opens the form) plus a quiet mode line when the server answers from
  recorded data (GET /api/health `demoMode`): "Recorded mode — answers come from
  recorded chain reads". Never use the word "demo" on screen. The sidebar keeps
  routes only; move the officer form into a small popover or panel opened from
  the context bar.
- **P3 — LOCAL (in progress) — Desk as a working board.** Beyond D1–D3: a one-line summary above
  the board as a sentence, not tiles ("9 wallets · 6 VASPs · 5 VASPs awaiting a
  request · 1 awaiting a reply"). Filter chips on the board: All · No request
  yet · Sent, awaiting reply · Answered, with counts. A search box that filters
  VASPs and wallets client-side. Rows keyboard-navigable, each opening the VASP
  page. An empty desk that teaches: what to paste, a link to download
  /templates/desk-intake-example.csv, and what happens next.
- **P4 — LOCAL (in progress) — Loading and feedback states everywhere.** A `loading.tsx`
  skeleton for every route, drawn as rules and grey bars in the layout's own
  shape (no spinners). Inline confirmation after every action ("Filed 3 wallets
  — reading them now", "Request drafted", "Marked sent on 29 Sep 2026"), announced
  through an aria-live region. Every button shows its pending state and can't be
  pressed twice.
- **P5 — CLOUD — The letter must look like a real official request.** A letterhead
  block (unit, officer, date, NOIR reference = request id) and "To:" with the
  legal name, address line from the FIU annexure when present, and the channel.
  Then a "Subject:" line ("Request for disclosure and preservation of records —
  N accounts"), numbered paragraphs, the asks as a numbered list, the account
  table, the blank Legal basis line, and a signature block (name, designation,
  seal box). Page footer on print: request id · page X of Y · generated date UTC.
  A4 margins, black on white, no yellow in print.
- **P6 — LOCAL (in progress) — Identity details.** An OG image (app/opengraph-image.tsx:
  the wordmark on a yellow sign, the headline), the favicon already exists, a
  meaningful <title> per route ("MEXC · Desk · NOIR"), and a styled 404 and
  error page with a way back to the desk.
- **P7 — CLOUD — Visual finish.** One consistent page-head pattern on every
  screen: title, one-line lede, actions on the right. One spacing rhythm (more
  space above a section title than below it). Tables with right-aligned
  tabular figures and a heavy rule under the header. No section without
  content: hide empty sections rather than showing "0". Check every screen at
  1440, 1024, 768 and 390.
- **P8 — CLOUD — Finish all screens to this standard before the scorecard:** /vasp/[name],
  /vasp/[name]/request, /wallet/[address], /cases, /requests, /registry and /method, each
  with its loading state, empty state and error state.

## Round 5 — professional colours (the user's instruction)

- **P9 — TAKEN (local) — Replace the palette.** The user asked for professional colours.
  `.impeccable/briefs/console.md` records the pin, and it supersedes the
  signal-yellow palette. Change ONLY the tokens in app/globals.css and whatever
  primitives name a colour role; no page should need an edit. New tokens,
  contrast measured on white:

  | Role | Token value | Contrast |
  | --- | --- | --- |
  | ground (pages, the letter) | #FFFFFF | — |
  | paper (quiet bands: the closing band, table header fill if any) | #F6F7F9 | — |
  | ink (type, heavy rules) | #0E1B2C | 17.3 |
  | ink-soft (secondary type) | #44526A | 7.9 |
  | ink-faint (captions, meta) | #5E6B80 | 5.4 |
  | rule (hairlines) | #D6DBE3 | — |
  | navy (sidebar, top band, the destination sign's field, primary buttons) | #0B2545 | white on it 15.4 |
  | on-navy-soft (secondary type on navy) | #B8C4D6 | 8.7 on navy |
  | amber (marker only: the sign's arrow, the route terminus stop, the wordmark underline, the active route tick) | #E0A100 | 6.8 on navy; never text on white (2.3) |
  | route (links, secondary actions, focus ring) | #1B5FD1 | 5.8 |
  | ok (answered, frozen, data received) | #1E6B43 | 6.5 |
  | wait (sent/awaiting, "no request yet") | #8A5A00 | 5.9 |
  | stop (OFAC, refused, errors) | #B42318 | 6.6 |

  The destination sign becomes a navy field with white heavy type, an amber
  arrow and white sub-lines (on-navy-soft for secondary). It's still one per
  screen. The wordmark: white "NOIR" on navy with a 3px amber underline. Primary
  buttons are navy, hover route blue. Status tags use a 1px border in their
  colour with text in their colour; filled only for stop. Selection highlight is
  amber at 35% over white. Print stays black on white. Update docs/ui-tokens.md.
  Re-take any screenshots after this change.

## Takeover — 29 Sep 2026

`cloud/ui` went quiet, so the local session merged it into
`claude/loving-tu-812683` and is building the remaining work there:
rounds 3–5 and every remaining screen. **If the cloud session resumes:** merge
`origin/claude/loving-tu-812683` first and work only on items this file still
marks OPEN and not TAKEN. Items the local session is doing are marked TAKEN.

## Ownership from here (29 Sep 2026, after the cloud resumed)

The cloud resumed and built screens 3–5, so the split is by item, not by session:

- **CLOUD:** the remaining screens (/cases, /requests, /registry, /method) and P8 for
  each of them; P5, refining the letter it built; L5; P7 on the screens it owns;
  README, screenshots, the scorecard.
- **LOCAL:** D1–D3 and P3 (the desk as a working board: components/desk/* and
  app/desk/*); P1 (the landing's own frame: app/page.tsx and components/landing/*);
  P2 (the context bar: components/noir/Shell.tsx and a new components/noir/ContextBar.tsx);
  P4 (loading.tsx for every route, and inline confirmations in the desk and intake
  components); P6 (the OG image, per-route titles). Do not edit those files; merge
  them as they land.

## Finish plan — 50/50 split (29 Sep 2026, supersedes the ownership above)

All nine screens exist. What remains, split by file ownership so the sessions never collide.
Each item is done when it works end to end in the browser, at 1440, 1024, 768 and 390,
with no console errors.

**CLOUD** (owns app/page.tsx, components/landing/*, components/noir/Shell.tsx,
Sidebar.tsx, SearchBox.tsx, the letter, README.md, docs/ui-tokens.md):
1. C1 — P1: the landing's own frame: a navy top band (wordmark, Desk · Method · Registry,
   "Open the desk"), no sidebar or officer form on /, a hero with a live desk preview
   (real rows computed from the recorded cases), the four-stage route, a closing band,
   and a footer (SIH 2026 · SIH26182 · MHA / I4C, data sources with dates, "Built to
   route into SAHYOG; not integrated", links).
2. C2 — P2: a context bar on every app screen: a breadcrumb, the stated identity
   (opening the officer form, moved out of the sidebar), and a recorded-mode line from
   GET /api/health demoMode ("Recorded mode — answers come from recorded chain reads").
   Keep the search box.
3. C3 — P5: the letter as an official request: letterhead, To, Subject, numbered
   paragraphs, signature block, and a print footer with the request id and page X of Y.
4. C4 — P7 and L5: a visual consistency pass on every screen at 1440, 1024, 768 and 390
   (page head, spacing, tables, empty sections hidden); Cases in the sidebar.
5. C5 — Apply the teammate's UI references (the ones you were given) across all screens,
   within the truth rules and the navy palette.
6. C6 — README.md (NOIR only, working curl examples) and docs/ui-tokens.md updated for
   the navy palette.

**LOCAL** (owns lib/*, app/api/*, scripts/*, tests/*, every loading.tsx,
app/opengraph-image.tsx, components/desk/VaspBoard.tsx, IntakeBox and the action
components' confirmation states, docs/screens/, docs/review/scorecard.md, merging):
1. L-A — End-to-end QA of the product as an officer uses it: file (paste and CSV),
   attribute (recorded and live chain), VASP page, draft, print, export, mark sent,
   record answers, register and cases update, the audit log verifies. Fix every bug.
2. L-B — P4: loading.tsx skeletons for every route, inline confirmations after each
   action, pending buttons.
3. L-C — P6: the OG image and per-route titles.
4. L-D — A no-overflow and no-console-error sweep of every route at four widths, and
   npm run build passes.
5. L-E — The impeccable detector and an independent finish review; the scorecard
   loop until it reaches 9.5 or better.
6. L-F — Screenshots of every screen to docs/screens/, the PS-26182 compliance
   verdict, DESIGN.md, and the merge to main.

## QA — the officer's flow, clicked through end to end (local, 29 Sep)

The flow works: file 8 wallets (bad line refused with its reason) → 6 VASP rows →
MEXC → draft → the letter (total 27,697.10 USDT checks; two cases share one MEXC
account and the letter shows it) → sent with a reference → frozen → register,
cases and desk all update → the audit chain verifies (INTACT, 11 entries) → the
JSON package downloads. Two fixes on cloud-owned screens:

- **Q1 — CLOUD — The VASP page invites duplicate requests.** After a request is
  drafted, "Draft another request" sits above "Where the request stands". Put the
  request's status first. Show the draft form only when wallets were filed since
  the last request (row.uncoveredEntryIds), titled "Draft a follow-up for N new
  wallets"; otherwise show a quiet line saying every wallet here is covered by
  request r_….
- **Q2 — CLOUD — The letter's wallet column is cramped.** Addresses break over
  four lines and "TRX · its money reached this VASP" wraps word by word. In the
  letter, give Wallet and Account the width: put the chain and direction on one
  line under the address, move the transaction hashes to a full-width row beneath
  each wallet (or an appendix table), and keep Case and Evidence narrow.

## User instruction — remove the officer ID option (done locally)

The user asked to remove the officer ID option. Done in the local branch: the
context bar no longer has the identity button or form; lib/noir-officer.ts is
gone; the client sends no identity headers; history lines name an actor only when
a sign-in gateway supplied one (lib/identity.ts). **Do not reintroduce any officer
ID or unit field anywhere.** The letter keeps blank lines for the officer's name,
designation and signature, filled in on paper.

## Finish review (impeccable, independent): 6.7 / 10 — the 50/50 split to reach 9.5

Fixed locally already: the letter's Print button contrast; Method now names NOIR's own
capabilities and states the counts in a sentence (no quoted rubric); the dev "1 Issue"
was a transient mid-edit error and the screenshot tool's caret style, not live code.

**CLOUD** (only these files):
- R1 — components/desk/Letter.tsx: each wallet gets a full-width, unwrapped address line with
  account, USDT, transactions, case and evidence in a row beneath it; the channel URL breaks
  only at "/"; NOIR is removed from the letterhead (the FROM unit is the letterhead; keep the
  "Prepared with NOIR" footer line). Print and screen both.
- R2 — components/landing/ManyToOne.tsx: a portrait variant below the sm breakpoint (cases
  stacked, routes flowing down into the exchange, then the letter) with labels at least 12px.
- R3 — app/page.tsx "What NOIR can name": replace the big-number Board with a ruled table or
  figures inside sentences (the review calls the Board the hero-metric template).
- R4 — app/wallet/[address]/page.tsx: fix "1 transaction … are listed" agreement; remove the
  duplicated "No exchange in NOIR's table funded…" sentence.
- R5 — components/desk/IntakeBox.tsx: replace the Unicode "→" in "See them on the desk" with
  the drawn arrow Icon. components/noir/Field.tsx: theme the date input (dark colour-scheme,
  the app's own date format hint "29 Sep 2026, UTC" beside it).

**LOCAL** (everything else): the desk as a departures board with route lanes and a split-flap
destination sign, the desk's mobile table layout, the re-review, production screenshots,
the SIH checklist, DESIGN.md, the merge and the deploy.

**Update:** the cloud had not started R1–R5, so the local session took them (TAKEN, local).
A cloud session that starts now: sync, and do not redo R1–R5.

**R2–R5 are done locally; R1 came from the cloud and is merged.** Cloud: stop here, all finish-review items are closed.

## 30 Sep — backend L1 to L9 is built, and the local session built its screens

`docs/review/backend-contract.md` is the contract; every item in it is marked built. The cloud
session was waiting on it (note B5). Because the user could not reach the cloud session, the
local session built the screens for it too. **CLOUD: do not build these again; merge
`origin/claude/loving-tu-812683` first.**

- `/cases`: each case has Case file (download), Read its wallets again, Close the case (two
  steps, an optional note) and, once closed, a Closed tag with the day and Reopen
  (`components/desk/CaseActions.tsx`).
- `/vasp/[name]`: Read all N wallets again (`components/desk/ReadAgainMany.tsx`).
- `/requests`: Record N drafted requests as sent, shown when two or more are drafted
  (`components/desk/MarkSent.tsx`).
- Desk, "Could not be read": each wallet says which read was last and when NOIR reads it again
  (`retryLine` in `lib/noir-view.ts`).
- `/registry`: the evidence ledger's sentence, or a caution listing rows without provenance.
- The finish review of 30 Sep (7/10) and its fixes are in the commit "Finish review, first
  round": `text-on-light` on red fields, `--text-section` for section titles, the route line
  through the two direction panels, no Who column on `/audit` unless an entry names someone.

Still open for whoever takes it: a phone capture of every screen in `docs/screens/`, and the
`?deep=1` health answer shown somewhere an officer would look (the method or audit screen).

## 30 Sep, final pass: how the last work is split

Main is at the trace-graph pass (the landing hero is one recorded wallet traced both ways; the same
graph heads every wallet page; the departures board has its own landing section).

- Cloud session, on `cloud/ui`: C1 audit and fix the two trace surfaces (`/` and a wallet page) at
  360, 390, 768, 1024, 1280, 1440 and 1920, including reduced motion, keyboard access and wallets
  with no funders read, a stopped trail, and an Ethereum or Polygon wallet. C2 the same finish on
  `/desk`, `/vasp/[name]`, `/requests`, `/cases`, `/registry`, `/method`, `/audit` (consistency only,
  no new features or claims). C3 route tests for what changes, one line per fix in
  `feedback-done.md`. Do not touch `lib/`, `app/api/`, `data/`, `scripts/`, `docs/screens/`,
  `docs/demo/`, `DESIGN.md`, `.impeccable/`, `README.md`, `CONTEXT.md`; a fix that needs `lib/` goes
  here as one line instead.
- Local session: the screens and demo frames, the storyboard, merging `cloud/ui`, the checks, `main`
  and the live site.

