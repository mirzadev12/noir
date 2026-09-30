// L2 — bulk actions: read every wallet under a VASP or a case again in one call,
// and record a status on several requests in one call. The real route handlers,
// on a temporary desk; the environment is set BEFORE any app module is imported.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.NOIR_STATE_DIR = mkdtempSync(join(tmpdir(), "noir-bulk-"));
process.env.DEMO_MODE = "true";

const FILING = [
  "address,chain,case",
  "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex,tron,Case A", // reaches MEXC
  "TXncpWJZ8ZxUcwrpTP4SE4nNhZnKZM4QzC,tron,Case B", // reaches MEXC
  "TJjc21brTnnmKhiYHQuBD9Pxpfy7BwXHYQ,tron,Case A", // reaches Bybit
  "0x77fB78EAC2021Cd52097168873324d3F1200E275,ethereum,Case B", // reaches CoinDCX
  "TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx,tron,", // no case reference
].join("\n");

const req = (path, method = "GET", body) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let desk, again, requests, worker, audit, deskRules, requestRules;
before(async () => {
  desk = await import("../app/api/desk/route.ts");
  again = await import("../app/api/desk/reattribute/route.ts");
  requests = await import("../app/api/desk/requests/route.ts");
  worker = await import("../lib/desk-worker.ts");
  audit = await import("../lib/audit-store.ts");
  deskRules = await import("../lib/desk.ts");
  requestRules = await import("../lib/requests.ts");
  const filed = await desk.POST(req("/api/desk", "POST", { text: FILING }));
  assert.equal(filed.status, 201);
  await worker.deskWorker().kick();
});

const view = async () => (await desk.GET()).json();
const readAgain = (body) => again.POST(req("/api/desk/reattribute", "POST", body));
const today = () => new Date().toISOString().slice(0, 10);

test("every wallet under one VASP is queued in one call, and its last record stays until the new one lands", async () => {
  const before = await view();
  const mexc = before.rows.find((r) => r.vasp === "MEXC");
  const under = [...new Set(mexc.wallets.map((w) => w.entryId))];
  assert.ok(under.length >= 2);

  const res = await readAgain({ vasp: "mexc" });
  assert.equal(res.status, 202);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.queued.map((e) => e.id).sort(), [...under].sort());
  assert.ok(body.queued.every((e) => e.status === "pending" && e.record !== null), "pending, with the last record kept");
  assert.deepEqual(body.skipped, []);
  assert.equal(body.entry, undefined, "`entry` is for the single form only");
});

test("a wallet already being read is skipped with the reason, not queued twice", async () => {
  const res = await readAgain({ vasp: "MEXC" });
  assert.equal(res.status, 202);
  const body = await res.json();
  assert.equal(body.queued.length, 0);
  assert.ok(body.skipped.length >= 2);
  assert.ok(body.skipped.every((s) => s.reason === "Already being read." && s.wallet));
  await worker.deskWorker().kick();
  assert.equal((await view()).pending.length, 0);
});

test("every wallet filed under one case is queued; null means the wallets with no case reference", async () => {
  const a = await (await readAgain({ caseRef: "Case A" })).json();
  assert.deepEqual(a.queued.map((e) => e.wallet).sort(), ["TJjc21brTnnmKhiYHQuBD9Pxpfy7BwXHYQ", "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex"]);
  const none = await (await readAgain({ caseRef: null })).json();
  assert.deepEqual(none.queued.map((e) => e.wallet), ["TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx"]);
  await worker.deskWorker().kick();
});

test("a list of ids queues the ones on the desk and names the ones that are not", async () => {
  const known = (await view()).rows.find((r) => r.vasp === "Bybit").wallets[0].entryId;
  const res = await readAgain({ ids: [known, "e_000000000000", known] });
  assert.equal(res.status, 202);
  const body = await res.json();
  assert.deepEqual(body.queued.map((e) => e.id), [known], "a repeated id is queued once");
  assert.deepEqual(body.skipped, [{ id: "e_000000000000", wallet: "", reason: "No wallet with that id is on the desk." }]);
  await worker.deskWorker().kick();
});

test("the single form answers as before, with `entry`", async () => {
  const known = (await view()).rows.find((r) => r.vasp === "Bybit").wallets[0].entryId;
  const res = await readAgain({ id: known });
  assert.equal(res.status, 202);
  const body = await res.json();
  assert.equal(body.entry.id, known);
  assert.deepEqual(body.queued.map((e) => e.id), [known]);
  await worker.deskWorker().kick();
});

test("a selector that names nothing is a 404, and no selector or two selectors a 400", async () => {
  assert.equal((await readAgain({ vasp: "Nowhere" })).status, 404);
  assert.equal((await readAgain({ caseRef: "No such case" })).status, 404);
  assert.equal((await readAgain({ id: "e_000000000000" })).status, 404);
  assert.equal((await readAgain({ ids: ["e_000000000000"] })).status, 404);
  assert.equal((await readAgain({})).status, 400);
  assert.equal((await readAgain({ vasp: "MEXC", caseRef: "Case A" })).status, 400);
  assert.equal((await readAgain({ ids: [] })).status, 400);
  assert.equal((await readAgain({ ids: "e_1" })).status, 400);
  assert.equal((await readAgain({ ids: Array.from({ length: 501 }, (_, i) => `e_${i}`) })).status, 400);
  assert.equal((await readAgain({ caseRef: 7 })).status, 400);
});

test("each wallet queued in bulk has its own audit line, naming the selector", async () => {
  const { entries } = await audit.readAudit();
  const lines = entries.filter((e) => e && e.action === "desk.reattributed");
  assert.ok(lines.some((e) => e.detail.bulk === "vasp:MEXC"));
  assert.ok(lines.some((e) => e.detail.bulk === "case:Case A"));
  assert.ok(lines.some((e) => e.detail.bulk === "case:(none)"));
  assert.ok(lines.some((e) => e.detail.bulk === "ids"));
});

let ids;
test("several requests are recorded as sent in one call; each is judged by its own rules", async () => {
  ids = {};
  for (const vasp of ["MEXC", "Bybit", "CoinDCX"]) {
    const res = await requests.POST(req("/api/desk/requests", "POST", { vasp, asks: ["kyc", "preservation"] }));
    assert.equal(res.status, 201);
    ids[vasp] = (await res.json()).id;
  }
  const res = await requests.PATCH(req("/api/desk/requests", "PATCH", { ids: [ids.MEXC, ids.Bybit, "r_000000000000", ids.MEXC], status: "sent", on: today(), note: "Sent together." }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.changed.map((r) => r.id), [ids.MEXC, ids.Bybit], "a repeated id is changed once");
  assert.ok(body.changed.every((r) => r.history.at(-1).status === "sent" && r.history.at(-1).note === "Sent together."));
  assert.deepEqual(body.refused, [{ id: "r_000000000000", error: "No request with that id." }]);
});

test("when nothing changes the answer is a 422 with the reason for each", async () => {
  const res = await requests.PATCH(req("/api/desk/requests", "PATCH", { ids: [ids.MEXC, ids.Bybit], status: "sent" }));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.deepEqual(body.changed, []);
  assert.deepEqual(body.refused.map((r) => r.error), ["The request is already recorded as sent.", "The request is already recorded as sent."]);

  const early = await requests.PATCH(req("/api/desk/requests", "PATCH", { ids: [ids.CoinDCX], status: "frozen" }));
  assert.equal(early.status, 422);
  assert.match((await early.json()).refused[0].error, /sent before/);
});

test("a bulk status with a bad body is a 400", async () => {
  const patch = (b) => requests.PATCH(req("/api/desk/requests", "PATCH", b));
  assert.equal((await patch({ id: ids.MEXC, ids: [ids.Bybit], status: "sent" })).status, 400);
  assert.equal((await patch({ ids: [], status: "sent" })).status, 400);
  assert.equal((await patch({ ids: "r_1", status: "sent" })).status, 400);
  assert.equal((await patch({ ids: [ids.MEXC], status: "posted" })).status, 400);
  assert.equal((await patch({ ids: Array.from({ length: 101 }, (_, i) => `r_${i}`), status: "sent" })).status, 400);
});

test("the single status form still answers the request itself", async () => {
  const res = await requests.PATCH(req("/api/desk/requests", "PATCH", { id: ids.CoinDCX, status: "sent", on: today() }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).id, ids.CoinDCX);
});

test("each request changed in bulk has its own audit line, marked bulk", async () => {
  const { entries } = await audit.readAudit();
  const bulk = entries.filter((e) => e && e.action === "request.status" && e.detail.bulk === true);
  assert.deepEqual(bulk.map((e) => e.detail.requestId).sort(), [ids.MEXC, ids.Bybit].sort());
});

test("the rules alone: markPendingWhere and changeStatuses", () => {
  const by = { id: null, unit: null, verified: false };
  const entry = (id, wallet, status, caseRef) => ({ id, wallet, chain: "tron", filings: [{ caseRef, by, at: "2026-09-30T00:00:00.000Z" }], status, record: null, error: "x", attributedAt: null });
  const file = { version: 1, entries: [entry("e_1", "TA", "unreadable", "K"), entry("e_2", "TB", "pending", "K"), entry("e_3", "TC", "failed", null)], requests: [] };
  const r = deskRules.markPendingWhere(file, { caseRef: "K" });
  assert.equal(r.matched, 2);
  assert.deepEqual(r.queued.map((e) => e.id), ["e_1"]);
  assert.deepEqual(r.skipped, [{ id: "e_2", wallet: "TB", reason: "Already being read." }]);
  assert.equal(file.entries[0].status, "pending");
  assert.equal(file.entries[0].error, null);
  assert.equal(deskRules.markPendingWhere(file, { caseRef: null }).queued[0].id, "e_3");
  assert.equal(deskRules.markPendingWhere(file, { vasp: "MEXC" }).matched, 0);

  const request = (id) => ({ id, vasp: "MEXC", asks: ["kyc"], entryIds: [], history: [{ status: "drafted", at: "2026-09-30T00:00:00.000Z", by, on: null, reference: null, note: null }] });
  const book = { version: 1, entries: [], requests: [request("r_1"), request("r_2")] };
  const out = requestRules.changeStatuses(book, ["r_1", "r_9", "r_1"], { status: "sent" }, by, "2026-09-30T01:00:00.000Z");
  assert.deepEqual(out.changed.map((x) => x.id), ["r_1"]);
  assert.deepEqual(out.refused, [{ id: "r_9", error: "No request with that id." }]);
  assert.equal(book.requests[1].history.length, 1, "a request not named is untouched");
});
