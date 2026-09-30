// Integration: the real route handlers, end to end, on a temporary desk.
// The environment is set BEFORE any app module is imported.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.NOIR_STATE_DIR = mkdtempSync(join(tmpdir(), "noir-routes-"));
process.env.DEMO_MODE = "true";

const RECORDED = [
  "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex", // reaches MEXC
  "TXncpWJZ8ZxUcwrpTP4SE4nNhZnKZM4QzC", // reaches MEXC
  "TJjc21brTnnmKhiYHQuBD9Pxpfy7BwXHYQ", // reaches Bybit
  "TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx", // funded by Bitget, Binance, OKX; reaches none
  "0x77fB78EAC2021Cd52097168873324d3F1200E275", // reaches CoinDCX
  "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", // Bitcoin: screened only
];

const actor = { "x-noir-officer": "I4C-2291", "x-noir-unit": encodeURIComponent("Cyber Crime Cell, Bengaluru") };
const req = (path, method = "GET", body) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...actor },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let desk, requests, vasp, exportRoute, worker, audit;
before(async () => {
  desk = await import("../app/api/desk/route.ts");
  requests = await import("../app/api/desk/requests/route.ts");
  vasp = await import("../app/api/desk/vasp/[name]/route.ts");
  exportRoute = await import("../app/api/desk/requests/[id]/export/route.ts");
  worker = await import("../lib/desk-worker.ts");
  audit = await import("../lib/audit-store.ts");
});

const ctx = (params) => ({ params: Promise.resolve(params) });

test("filing recorded wallets, a bad line is refused with its reason and the rest are filed", async () => {
  const res = await desk.POST(req("/api/desk", "POST", { text: [...RECORDED, "not-a-wallet"].join("\n"), caseRef: "FIR 14/2026" }));
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.added.length, RECORDED.length);
  assert.equal(body.rejected.length, 1);
  assert.equal(body.rejected[0].line, RECORDED.length + 1);
  assert.match(body.rejected[0].reason, /TRON address/);
  assert.ok(body.added.every((e) => e.status === "pending"));
  assert.ok(body.added.every((e) => e.filings[0].caseRef === "FIR 14/2026" && e.filings[0].by.id === "I4C-2291"));
});

test("nothing valid is a 422, and an empty body a 400", async () => {
  const none = await desk.POST(req("/api/desk", "POST", { text: "not-a-wallet" }));
  assert.equal(none.status, 422);
  assert.equal((await none.json()).added.length, 0);
  assert.equal((await desk.POST(req("/api/desk", "POST", {}))).status, 400);
});

test("the worker attributes them, and the desk groups them under the VASP they route to", async () => {
  await worker.deskWorker().kick();
  const view = await (await desk.GET()).json();
  assert.equal(view.pending.length, 0);
  const names = view.rows.map((r) => r.vasp);
  for (const expected of ["MEXC", "Bybit", "CoinDCX"]) assert.ok(names.includes(expected), `${expected} is a row`);
  const mexc = view.rows.find((r) => r.vasp === "MEXC");
  assert.equal(mexc.wallets.filter((w) => w.direction === "outbound").length, 2);
  assert.ok(mexc.canFreeze);
  assert.deepEqual(mexc.caseRefs, ["FIR 14/2026"]);
  assert.equal(view.screenedOnly.length, 1, "the Bitcoin address is screened, not traced");
  assert.equal(view.screenedOnly[0].chain, "bitcoin");
  // Funders (inbound) are rows too: a wallet funded by Bitget sits under Bitget with no account.
  const bitget = view.rows.find((r) => r.vasp === "Bitget");
  assert.ok(bitget && bitget.wallets.every((w) => w.direction === "inbound" && w.account === null));
  assert.equal(bitget.canFreeze, false);
});

test("one VASP's page: the row, the asks it may be sent, and a letter with a blank legal basis", async () => {
  const res = await vasp.GET(req("/api/desk/vasp/MEXC"), ctx({ name: "MEXC" }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.row.vasp, "MEXC");
  assert.ok(body.allowedAsks.includes("freeze"));
  assert.equal(body.letter.legalBasis, "");
  assert.equal((await vasp.GET(req("/api/desk/vasp/Nowhere"), ctx({ name: "Nowhere" }))).status, 404);
  const bitget = await (await vasp.GET(req("/api/desk/vasp/Bitget"), ctx({ name: "Bitget" }))).json();
  assert.ok(!bitget.allowedAsks.includes("freeze"), "no account at Bitget, so no freeze");
});

let requestId;
test("a request is drafted; a freeze is refused where no account is known", async () => {
  const refused = await requests.POST(req("/api/desk/requests", "POST", { vasp: "Bitget", asks: ["kyc", "freeze"] }));
  assert.equal(refused.status, 422);
  assert.match((await refused.json()).error, /freeze cannot be asked of Bitget/i);
  assert.equal((await requests.POST(req("/api/desk/requests", "POST", { vasp: "MEXC", asks: [] }))).status, 422);

  const res = await requests.POST(req("/api/desk/requests", "POST", { vasp: "MEXC", asks: ["kyc", "access-logs", "transactions", "preservation", "freeze"] }));
  assert.equal(res.status, 201);
  const drafted = await res.json();
  requestId = drafted.id;
  assert.equal(drafted.history.length, 1);
  assert.equal(drafted.history[0].status, "drafted");
  assert.equal(drafted.entryIds.length, 2);
});

test("status order: sent first, then any answer, and only valid days", async () => {
  const patch = (b) => requests.PATCH(req("/api/desk/requests", "PATCH", { id: requestId, ...b }));
  assert.equal((await patch({ status: "frozen" })).status, 422, "no answer before it was sent");
  assert.equal((await patch({ status: "sent", on: "29-09-2026" })).status, 422, "the day is YYYY-MM-DD");
  const sent = await patch({ status: "sent", on: new Date().toISOString().slice(0, 10), reference: "LE-2026-88231", note: "Through the portal." });
  assert.equal(sent.status, 200);
  assert.equal((await patch({ status: "sent" })).status, 422, "already sent");
  assert.equal((await patch({ status: "acknowledged" })).status, 200);
  const frozen = await (await patch({ status: "frozen", reference: "F-1" })).json();
  assert.deepEqual(frozen.history.map((h) => h.status), ["drafted", "sent", "acknowledged", "frozen"]);
  assert.equal(frozen.history[1].reference, "LE-2026-88231");
  const register = await (await requests.GET()).json();
  assert.equal(register.length, 1);
});

test("the export package is noir-request-v1, says SAHYOG is designed not integrated, and carries no statute", async () => {
  const res = await exportRoute.GET(req(`/api/desk/requests/${requestId}/export`), ctx({ id: requestId }));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-disposition"), /attachment; filename="noir-request-r_/);
  const pkg = JSON.parse(await res.text());
  assert.equal(pkg.schema, "noir-request-v1");
  assert.equal(pkg.sahyog, "designed, not integrated");
  assert.equal(pkg.legalBasis, "");
  assert.equal(pkg.addressee.vasp, "MEXC");
  assert.equal(pkg.request.status, "frozen");
  assert.equal(pkg.accounts.length, 2);
  assert.equal((await exportRoute.GET(req("/api/desk/requests/r_missing/export"), ctx({ id: "r_missing" }))).status, 404);
});

test("wallets filed after a request are 'filed since request' on that VASP's row", async () => {
  const more = await desk.POST(req("/api/desk", "POST", { text: "TVebSaNSdNHirwz46UPEzMgGy6pSQQu2aR", caseRef: "FIR 15/2026" }));
  assert.equal(more.status, 201);
  await worker.deskWorker().kick();
  const view = await (await desk.GET()).json();
  const mexc = view.rows.find((r) => r.vasp === "MEXC");
  assert.equal(mexc.uncoveredEntryIds.length, 1);
  assert.deepEqual(mexc.caseRefs, ["FIR 14/2026", "FIR 15/2026"]);
});

test("a wallet can be read again and taken off the desk", async () => {
  const reattribute = await import("../app/api/desk/reattribute/route.ts");
  const view = await (await desk.GET()).json();
  const id = view.screenedOnly[0].id;
  const res = await reattribute.POST(req("/api/desk/reattribute", "POST", { id }));
  assert.equal(res.status, 202);
  await worker.deskWorker().kick();
  assert.equal((await desk.DELETE(req("/api/desk", "DELETE", { id }))).status, 200);
  assert.equal((await desk.DELETE(req("/api/desk", "DELETE", { id }))).status, 404);
});

test("every filing, status change and removal is in the audit log, and its hash chain verifies", async () => {
  const { entries, check } = await audit.readAudit();
  assert.equal(check.intact, true, "the chain is intact");
  assert.ok(check.entries >= 10, "every action wrote an entry");
  const actions = new Set(entries.filter(Boolean).map((e) => e.action));
  for (const a of ["desk.filed", "request.drafted", "request.status", "desk.reattributed", "desk.removed"]) assert.ok(actions.has(a), a);
  assert.ok(entries.filter(Boolean).every((e) => e.actor.id === "I4C-2291" && e.actor.verified === false), "recorded as stated, not verified");
});
