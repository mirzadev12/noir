// L3 — case close-out: a case reference can be closed and reopened, a closed
// case refuses new filings, and a case's whole file can be downloaded. The real
// route handlers, on a temporary desk.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.NOIR_STATE_DIR = mkdtempSync(join(tmpdir(), "noir-close-"));
process.env.DEMO_MODE = "true";

const FILING = [
  "address,chain,case",
  "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex,tron,Case A", // reaches MEXC
  "TJjc21brTnnmKhiYHQuBD9Pxpfy7BwXHYQ,tron,Case A", // reaches Bybit
  "TXncpWJZ8ZxUcwrpTP4SE4nNhZnKZM4QzC,tron,Case B", // reaches MEXC
  "TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx,tron,", // no case reference
].join("\n");

const actor = { "x-noir-officer": "I4C-2291" };
const req = (path, method = "GET", body) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...actor },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let desk, cases, caseFile, requests, worker, audit, rules;
before(async () => {
  desk = await import("../app/api/desk/route.ts");
  cases = await import("../app/api/desk/cases/route.ts");
  caseFile = await import("../app/api/desk/cases/file/route.ts");
  requests = await import("../app/api/desk/requests/route.ts");
  worker = await import("../lib/desk-worker.ts");
  audit = await import("../lib/audit-store.ts");
  rules = await import("../lib/case-file.ts");
  assert.equal((await desk.POST(req("/api/desk", "POST", { text: FILING }))).status, 201);
  await worker.deskWorker().kick();
  // One request to MEXC, drafted and sent: it covers a Case A wallet and a Case B wallet.
  const drafted = await (await requests.POST(req("/api/desk/requests", "POST", { vasp: "MEXC", asks: ["kyc", "freeze"] }))).json();
  await requests.PATCH(req("/api/desk/requests", "PATCH", { id: drafted.id, status: "sent" }));
  // And one to Bybit, drafted only.
  await requests.POST(req("/api/desk/requests", "POST", { vasp: "Bybit", asks: ["kyc"] }));
});

const act = (body) => cases.POST(req("/api/desk/cases", "POST", body));
const rows = async () => (await cases.GET()).json();

test("every case is listed with whether it is closed", async () => {
  const list = await rows();
  assert.deepEqual(list.map((r) => r.caseRef).sort(), ["Case A", "Case B", null].sort());
  assert.ok(list.every((r) => r.closed === null));
});

test("closing a case records who, when and why, and says what was still in motion", async () => {
  const res = await act({ caseRef: "Case A", action: "close", note: "  Charge sheet filed.  " });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.caseRef, "Case A");
  assert.equal(body.closed.caseRef, "Case A");
  assert.equal(body.closed.note, "Charge sheet filed.");
  assert.equal(body.closed.by.id, "I4C-2291");
  assert.match(body.closed.closedAt, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  assert.deepEqual(body.open, { pendingWallets: 0, requestsAwaiting: 1, requestsNotSent: 1 });

  const list = await rows();
  assert.equal(list.find((r) => r.caseRef === "Case A").closed.note, "Charge sheet filed.");
  assert.equal(list.find((r) => r.caseRef === "Case B").closed, null);
});

test("closing changes nothing on the desk: the wallets and requests stay as they were", async () => {
  const view = await (await desk.GET()).json();
  const mexc = view.rows.find((r) => r.vasp === "MEXC");
  assert.equal(new Set(mexc.wallets.map((w) => w.entryId)).size, 2);
  assert.ok(mexc.caseRefs.includes("Case A"));
});

test("what cannot be closed or reopened is refused with the reason", async () => {
  assert.equal((await act({ caseRef: "Case A", action: "close" })).status, 409, "already closed");
  assert.equal((await act({ caseRef: "Case B", action: "reopen" })).status, 409, "not closed");
  assert.equal((await act({ caseRef: "No such case", action: "close" })).status, 404);
  assert.equal((await act({ caseRef: "Case B", action: "archive" })).status, 400);
  assert.equal((await act({ action: "close" })).status, 400);
  assert.equal((await act({ caseRef: null, action: "close" })).status, 400, "wallets with no case reference are not a case");
  const long = await act({ caseRef: "Case B", action: "close", note: "x".repeat(501) });
  assert.equal(long.status, 422);
  assert.match((await long.json()).error, /500 characters/);
  assert.equal((await rows()).find((r) => r.caseRef === "Case B").closed, null, "a refused close closes nothing");
});

test("a filing that names a closed case is refused on that line, and the other lines are filed", async () => {
  const res = await desk.POST(
    req("/api/desk", "POST", { text: "TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj,tron,Case A\nTVebSaNSdNHirwz46UPEzMgGy6pSQQu2aR,tron,Case B" }),
  );
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.deepEqual(body.added.map((e) => e.wallet), ["TVebSaNSdNHirwz46UPEzMgGy6pSQQu2aR"]);
  assert.equal(body.rejected.length, 1);
  assert.equal(body.rejected[0].line, 1);
  assert.match(body.rejected[0].reason, /^Case 'Case A' was closed on \d{1,2} \w{3} \d{4}; reopen it to file under it\.$/);

  const only = await desk.POST(req("/api/desk", "POST", { text: "TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj", caseRef: "Case A" }));
  assert.equal(only.status, 422, "nothing else to file");
  assert.equal((await only.json()).rejected.length, 1);
  await worker.deskWorker().kick();
});

test("the case file holds the case's wallets, the VASPs they reach, the requests that cover them and their audit lines", async () => {
  const res = await caseFile.GET(req("/api/desk/cases/file?caseRef=Case%20A"));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /application\/json/);
  assert.equal(res.headers.get("content-disposition"), 'attachment; filename="noir-case-Case-A.json"');
  const doc = await res.json();
  assert.equal(doc.schema, "noir-case-file-v1");
  assert.equal(doc.caseRef, "Case A");
  assert.equal(doc.closed.note, "Charge sheet filed.");
  assert.match(doc.generatedAt, /Z$/);

  assert.deepEqual(doc.wallets.map((w) => w.wallet).sort(), ["TJjc21brTnnmKhiYHQuBD9Pxpfy7BwXHYQ", "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex"]);
  const toMexc = doc.wallets.find((w) => w.wallet.startsWith("TXq2"));
  assert.equal(toMexc.outbound.vasp, "MEXC");
  assert.match(toMexc.outbound.evidenceSeen, /evidence$/, "evidence seen is a word");
  assert.equal(typeof toMexc.outbound.evidenceSeen, "string");
  assert.ok(!("confidence" in toMexc.outbound), "no number that reads as accuracy");
  assert.ok(toMexc.outbound.txHashes.length > 0);
  assert.equal(toMexc.basis, "recorded");
  assert.ok(toMexc.readAt);
  assert.equal(toMexc.filedAt.length, 1);
  assert.deepEqual(toMexc.otherCases, []);

  const vaspNames = doc.vasps.map((v) => v.vasp);
  assert.ok(vaspNames.includes("MEXC") && vaspNames.includes("Bybit"));
  assert.equal(doc.vasps.find((v) => v.vasp === "MEXC").wallets, 1, "counted within this case only");

  assert.equal(doc.requests.length, 2);
  const mexc = doc.requests.find((r) => r.vasp === "MEXC");
  assert.equal(mexc.status, "sent");
  assert.deepEqual(mexc.coversWallets, [toMexc.entryId], "only this case's wallets are named, though the request covers Case B too");
  assert.equal(mexc.history.length, 2);

  assert.equal(doc.audit.intact, true);
  assert.match(doc.audit.head, /^[0-9a-f]{64}$/);
  const actions = doc.audit.entries.map((e) => e.action);
  assert.ok(actions.includes("desk.filed") && actions.includes("request.drafted") && actions.includes("request.status") && actions.includes("case.closed"));
  assert.ok(doc.audit.entries.every((e) => e.address === null || doc.wallets.some((w) => w.wallet === e.address)), "no other case's wallet is in it");

  const notes = doc.notes.join(" ");
  assert.match(notes, /never a probability/);
  assert.match(notes, /SAHYOG/);
  assert.ok(!/section \d|IPC|BNSS|CrPC|\bAct\b/.test(JSON.stringify(doc)), "no statute");
});

test("the case file as CSV is one row per wallet and direction", async () => {
  const res = await caseFile.GET(req("/api/desk/cases/file?caseRef=Case%20A&format=csv"));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/csv/);
  assert.equal(res.headers.get("content-disposition"), 'attachment; filename="noir-case-Case-A.csv"');
  const lines = (await res.text()).trim().split("\r\n");
  assert.equal(lines[0], "wallet,chain,direction,vasp,account,usdt,evidence_seen,tier,read_at_utc,basis,status,other_cases");
  assert.ok(lines.length >= 3);
  assert.ok(lines.some((l) => l.startsWith("TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex,tron,outbound,MEXC,")));
});

test("a case file for nothing is refused", async () => {
  assert.equal((await caseFile.GET(req("/api/desk/cases/file"))).status, 400);
  assert.equal((await caseFile.GET(req("/api/desk/cases/file?caseRef=Nope"))).status, 404);
  assert.equal((await caseFile.GET(req("/api/desk/cases/file?caseRef=Case%20A&format=pdf"))).status, 400);
});

test("a reopened case takes filings again", async () => {
  const res = await act({ caseRef: "Case A", action: "reopen" });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.closed, null);
  assert.deepEqual(body.open, { pendingWallets: 0, requestsAwaiting: 0, requestsNotSent: 0 });
  const filed = await desk.POST(req("/api/desk", "POST", { text: "TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj", caseRef: "Case A" }));
  assert.equal(filed.status, 201);
  await worker.deskWorker().kick();
});

test("closing and reopening are in the audit log, and the chain verifies", async () => {
  const { entries, check } = await audit.readAudit();
  assert.equal(check.intact, true);
  const closed = entries.find((e) => e.action === "case.closed");
  assert.equal(closed.detail.caseRef, "Case A");
  assert.equal(closed.actor.id, "I4C-2291");
  assert.ok(entries.some((e) => e.action === "case.reopened" && e.detail.caseRef === "Case A"));
});

test("the rules alone: closures are read back trusting nothing, and a case is matched exactly", () => {
  const by = { id: null, unit: null, verified: false };
  const good = { caseRef: "K 1", closedAt: "2026-09-30T00:00:00.000Z", by, note: null };
  assert.deepEqual(rules.readClosures([good, { caseRef: 7 }, null, { caseRef: "K 2", closedAt: "yesterday", by }, "x"]), [good]);
  assert.deepEqual(rules.readClosures({ not: "a list" }), []);
  assert.equal(rules.closureOf([good], "K 1"), good);
  assert.equal(rules.closureOf([good], "k 1"), null, "a case reference is matched as it was filed");

  const entry = (id, caseRef, status = "attributed") => ({ id, wallet: `T${id}`, chain: "tron", filings: [{ caseRef, by, at: "2026-09-29T00:00:00.000Z" }], status, record: null, error: null, attributedAt: null });
  const file = { version: 1, entries: [entry("e_1", "K 9", "pending"), entry("e_2", "K 9")], requests: [] };
  const closures = [];
  const done = rules.closeCase(closures, file, "K 9", null, by, "2026-09-30T00:00:00.000Z");
  assert.equal(done.ok, true);
  assert.deepEqual(done.open, { pendingWallets: 1, requestsAwaiting: 0, requestsNotSent: 0 });
  assert.equal(closures.length, 1);
  assert.deepEqual(rules.closeCase(closures, file, "K 9", null, by, "2026-09-30T00:00:01.000Z"), { ok: false, status: 409, error: "Case 'K 9' is already closed." });
  assert.equal(rules.reopenCase(closures, "K 9").ok, true);
  assert.equal(closures.length, 0);
  assert.deepEqual(rules.reopenCase(closures, "K 9"), { ok: false, status: 409, error: "Case 'K 9' is not closed." });
});
