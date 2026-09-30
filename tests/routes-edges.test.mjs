// Integration: the edges of every /api/desk/** handler — bad bodies, unknown ids,
// an oversize filing, and a desk file that cannot be read (503, never an empty desk).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "noir-edges-"));
process.env.NOIR_STATE_DIR = dir;
process.env.DEMO_MODE = "true";

const req = (path, method = "GET", body) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
const ctx = (params) => ({ params: Promise.resolve(params) });

let desk, requests, vasp, requestExport, reattribute, exportRoute;
before(async () => {
  desk = await import("../app/api/desk/route.ts");
  requests = await import("../app/api/desk/requests/route.ts");
  vasp = await import("../app/api/desk/vasp/[name]/route.ts");
  requestExport = await import("../app/api/desk/requests/[id]/export/route.ts");
  reattribute = await import("../app/api/desk/reattribute/route.ts");
  exportRoute = await import("../app/api/desk/export/route.ts");
});

test("a fresh desk is an empty desk, and its request list is []", async () => {
  const view = await (await desk.GET()).json();
  assert.deepEqual([view.rows.length, view.pending.length], [0, 0]);
  const list = await requests.GET();
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), []);
});

test("bodies that are not JSON, or not an object, are a 400 on every write", async () => {
  assert.equal((await desk.POST(req("/api/desk", "POST", "{not json"))).status, 400);
  assert.equal((await desk.POST(req("/api/desk", "POST", "[1,2]"))).status, 400);
  assert.equal((await desk.DELETE(req("/api/desk", "DELETE", "{not json"))).status, 400);
  assert.equal((await reattribute.POST(req("/api/desk/reattribute", "POST", {}))).status, 400);
  assert.equal((await requests.POST(req("/api/desk/requests", "POST", "nope"))).status, 400);
  assert.equal((await requests.PATCH(req("/api/desk/requests", "PATCH", {}))).status, 400);
  assert.equal((await requests.PATCH(req("/api/desk/requests", "PATCH", { id: "r_x", status: "teleported" }))).status, 400);
});

test("an id that is not on the desk is a 404 everywhere it is used", async () => {
  assert.equal((await desk.DELETE(req("/api/desk", "DELETE", { id: "e_nothing" }))).status, 404);
  assert.equal((await reattribute.POST(req("/api/desk/reattribute", "POST", { id: "e_nothing" }))).status, 404);
  assert.equal((await requests.PATCH(req("/api/desk/requests", "PATCH", { id: "r_nothing", status: "sent" }))).status, 404);
  assert.equal((await requestExport.GET(req("/x"), ctx({ id: "r_nothing" }))).status, 404);
  assert.equal((await vasp.GET(req("/x"), ctx({ name: "Nowhere" }))).status, 404);
  assert.equal((await vasp.GET(req("/x"), ctx({ name: "100%" }))).status, 404, "a bare % is not decoded twice");
});

test("a request to a VASP nothing routes to is a 422 with its reason", async () => {
  const res = await requests.POST(req("/api/desk/requests", "POST", { vasp: "Nowhere", asks: ["kyc"] }));
  assert.equal(res.status, 422);
  assert.ok((await res.json()).error.length > 0);
});

test("a filing over the size limit is refused before it is read", async () => {
  const big = new Request("http://localhost/api/desk", {
    method: "POST",
    headers: { "content-type": "application/json", "content-length": String(70 * 1024) },
    body: JSON.stringify({ text: "x" }),
  });
  const res = await desk.POST(big);
  assert.equal(res.status, 413);
  assert.match((await res.json()).error, /at most 500 wallets/);
});

test("a desk file that cannot be read is a 503 on every read and write, never an empty desk", async () => {
  writeFileSync(join(dir, "desk.json"), "{ this is not a desk");
  const responses = [
    await desk.GET(),
    await requests.GET(),
    await vasp.GET(req("/x"), ctx({ name: "MEXC" })),
    await exportRoute.GET(req("/api/desk/export?kind=requests")),
    await desk.POST(req("/api/desk", "POST", { text: "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex" })),
    await desk.DELETE(req("/api/desk", "DELETE", { id: "e_x" })),
  ];
  for (const res of responses) {
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /cannot keep the desk/);
  }
});
