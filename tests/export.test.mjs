// Integration: GET /api/desk/export on a temporary desk, and the CSV helpers.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.NOIR_STATE_DIR = mkdtempSync(join(tmpdir(), "noir-export-"));
process.env.DEMO_MODE = "true";

const actor = { "x-noir-officer": "I4C-2291", "x-noir-unit": encodeURIComponent("Cyber Crime Cell, Bengaluru") };
const post = (path, body) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", ...actor }, body: JSON.stringify(body) });
const get = (qs) => new Request(`http://localhost/api/desk/export${qs}`);

let exp, desk, requests, worker, lib;
before(async () => {
  exp = await import("../app/api/desk/export/route.ts");
  desk = await import("../app/api/desk/route.ts");
  requests = await import("../app/api/desk/requests/route.ts");
  worker = await import("../lib/desk-worker.ts");
  lib = await import("../lib/export.ts");
  await desk.POST(post("/api/desk", { text: "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex\nTXncpWJZ8ZxUcwrpTP4SE4nNhZnKZM4QzC", caseRef: "FIR 14/2026" }));
  await worker.deskWorker().kick();
});

test("csvCell quotes, doubles quotes and defuses a formula", () => {
  assert.equal(lib.csvCell("a,b"), '"a,b"');
  assert.equal(lib.csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(lib.csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(lib.csvCell("@x"), "'@x");
  assert.equal(lib.csvCell(-5), "-5", "a number is never prefixed");
  assert.equal(lib.csvCell(null), "");
});

test("a VASP's wallets download as CSV with its header and one line per wallet", async () => {
  const res = await exp.GET(get("?kind=wallets&vasp=MEXC"));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/csv/);
  assert.match(res.headers.get("content-disposition"), /attachment; filename="noir-mexc-wallets\.csv"/);
  const lines = (await res.text()).trim().split("\r\n");
  assert.match(lines[0], /^vasp,wallet,chain,direction,account_at_vasp,usdt,case_refs,evidence_seen/);
  assert.equal(lines.length, 3);
  assert.ok(lines.every((l, i) => i === 0 || l.startsWith("MEXC,T")));
  assert.ok(lines[1].includes("FIR 14/2026"));
});

test("the same wallets download as JSON", async () => {
  const res = await exp.GET(get("?kind=wallets&vasp=mexc&format=json"));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.vasp, "MEXC");
  assert.equal(body.wallets.length, 2);
  assert.ok(body.wallets.every((w) => w.direction === "outbound" && typeof w.usdt === "number"));
});

test("the register downloads, with a request once one is drafted", async () => {
  const empty = await (await exp.GET(get("?kind=requests"))).text();
  assert.equal(empty.trim().split("\r\n").length, 1, "header only before any request");
  const made = await requests.POST(post("/api/desk/requests", { vasp: "MEXC", asks: ["kyc", "transactions"] }));
  assert.equal(made.status, 201);
  const csv = (await (await exp.GET(get("?kind=requests"))).text()).trim().split("\r\n");
  assert.equal(csv.length, 2);
  assert.match(csv[1], /^r_[0-9a-f]{12},MEXC,/);
  const json = await (await exp.GET(get("?kind=requests&format=json"))).json();
  assert.equal(json[0].vasp, "MEXC");
  assert.equal(json[0].history[0].status, "drafted");
});

test("bad questions are 400 and an unrouted VASP is 404", async () => {
  assert.equal((await exp.GET(get(""))).status, 400);
  assert.equal((await exp.GET(get("?kind=wallets"))).status, 400);
  assert.equal((await exp.GET(get("?kind=wallets&vasp=MEXC&format=xml"))).status, 400);
  assert.equal((await exp.GET(get("?kind=wallets&vasp=Nowhere"))).status, 404);
});
