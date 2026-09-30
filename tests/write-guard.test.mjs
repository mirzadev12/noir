// L6 — every route that changes something or spends chain reads stands behind
// a body-size limit and a per-client write limit.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.NOIR_STATE_DIR = mkdtempSync(join(tmpdir(), "noir-guard-"));
process.env.DEMO_MODE = "true";

let guard, routes;
before(async () => {
  guard = await import("../lib/write-guard.ts");
  routes = {
    desk: await import("../app/api/desk/route.ts"),
    reattribute: await import("../app/api/desk/reattribute/route.ts"),
    requests: await import("../app/api/desk/requests/route.ts"),
    deskCases: await import("../app/api/desk/cases/route.ts"),
    watch: await import("../app/api/watch/route.ts"),
    trace: await import("../app/api/trace/route.ts"),
    alerts: await import("../app/api/alerts/route.ts"),
    cases: await import("../app/api/cases/route.ts"),
  };
});

const req = (path, method, body, headers = {}) =>
  new Request(`http://localhost${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

test("a client is the first hop the proxy names, or nobody when there is no proxy", () => {
  assert.equal(guard.clientOf(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.2" })), "203.0.113.7");
  assert.equal(guard.clientOf(new Headers({ "x-real-ip": " 203.0.113.9 " })), "203.0.113.9");
  assert.equal(guard.clientOf(new Headers()), null);
});

test("sixty writes a minute from one client, and the next is refused with the wait", () => {
  const book = new Map();
  const t0 = 1_000_000;
  for (let i = 0; i < 60; i++) assert.deepEqual(guard.allowWrite("203.0.113.7", t0 + i * 100, 60, book), { ok: true });
  assert.deepEqual(guard.allowWrite("203.0.113.7", t0 + 6_000, 60, book), { ok: false, retryAfter: 54 });
  assert.deepEqual(guard.allowWrite("203.0.113.8", t0 + 6_000, 60, book), { ok: true }, "another client is not held up");
  assert.deepEqual(guard.allowWrite("203.0.113.7", t0 + 60_001, 60, book), { ok: true }, "the oldest write has left the window");
});

test("a refused write is not counted, so waiting is enough", () => {
  const book = new Map();
  for (let i = 0; i < 3; i++) guard.allowWrite("c", 0, 3, book);
  for (let i = 0; i < 50; i++) assert.equal(guard.allowWrite("c", 1_000, 3, book).ok, false);
  assert.equal(guard.allowWrite("c", 60_000, 3, book).ok, true);
});

test("clients the server cannot tell apart share one larger allowance", () => {
  const book = new Map();
  for (let i = 0; i < 30; i++) assert.equal(guard.allowWrite(null, 0, 3, book).ok, true);
  assert.equal(guard.allowWrite(null, 0, 3, book).ok, false);
});

test("the limit is set by NOIR_WRITE_LIMIT, and 0 turns it off", () => {
  assert.equal(guard.writeLimit(undefined), 60);
  assert.equal(guard.writeLimit(""), 60);
  assert.equal(guard.writeLimit("5"), 5);
  assert.equal(guard.writeLimit("nonsense"), 60);
  assert.equal(guard.writeLimit("0"), 0);
  const book = new Map();
  for (let i = 0; i < 500; i++) assert.equal(guard.allowWrite("c", 0, 0, book).ok, true);
});

test("a handler behind the guard reads its body as it always did", async () => {
  const echo = guard.guarded(async (request) => Response.json({ got: await request.json(), method: request.method, officer: request.headers.get("x-noir-officer") }));
  const res = await echo(req("/x", "PATCH", { a: 1 }, { "x-noir-officer": "I4C-1" }));
  assert.deepEqual(await res.json(), { got: { a: 1 }, method: "PATCH", officer: "I4C-1" });
});

test("a body over the limit is a 413, whether or not its length was declared", async () => {
  const never = guard.guarded(async () => {
    throw new Error("the handler must not run");
  });
  const big = JSON.stringify({ note: "x".repeat(guard.MAX_WRITE_BYTES) });
  const declared = await never(req("/x", "POST", big, { "content-length": String(big.length) }));
  assert.equal(declared.status, 413);
  const undeclared = await never(req("/x", "POST", big));
  assert.equal(undeclared.status, 413);
  assert.match((await undeclared.json()).error, /at most 16 KB/);
});

test("every write route answers 413 to a body over its limit", async () => {
  const big = JSON.stringify({ note: "x".repeat(guard.MAX_WRITE_BYTES) });
  const calls = [
    ["DELETE /api/desk", () => routes.desk.DELETE(req("/api/desk", "DELETE", big))],
    ["POST /api/desk/reattribute", () => routes.reattribute.POST(req("/api/desk/reattribute", "POST", big))],
    ["POST /api/desk/requests", () => routes.requests.POST(req("/api/desk/requests", "POST", big))],
    ["PATCH /api/desk/requests", () => routes.requests.PATCH(req("/api/desk/requests", "PATCH", big))],
    ["POST /api/desk/cases", () => routes.deskCases.POST(req("/api/desk/cases", "POST", big))],
    ["POST /api/watch", () => routes.watch.POST(req("/api/watch", "POST", big))],
    ["POST /api/trace", () => routes.trace.POST(req("/api/trace", "POST", big))],
    ["POST /api/alerts", () => routes.alerts.POST(req("/api/alerts", "POST", big))],
    ["DELETE /api/alerts", () => routes.alerts.DELETE(req("/api/alerts", "DELETE", big))],
    ["POST /api/cases", () => routes.cases.POST(req("/api/cases", "POST", big))],
    ["DELETE /api/cases", () => routes.cases.DELETE(req("/api/cases", "DELETE", big))],
  ];
  for (const [name, call] of calls) assert.equal((await call()).status, 413, name);

  const filing = JSON.stringify({ text: "T".repeat(guard.MAX_FILING_BYTES) });
  const res = await routes.desk.POST(req("/api/desk", "POST", filing));
  assert.equal(res.status, 413);
  assert.match((await res.json()).error, /500 wallets \(64 KB\)/);
  const fits = await routes.desk.POST(req("/api/desk", "POST", { text: "x".repeat(guard.MAX_WRITE_BYTES + 100) }));
  assert.equal(fits.status, 422, "a filing may be larger than other writes; this one is only not a wallet");
});

test("past the limit a route answers 429 with Retry-After, and another client is served", async () => {
  process.env.NOIR_WRITE_LIMIT = "3";
  try {
    const from = (ip) => routes.reattribute.POST(req("/api/desk/reattribute", "POST", { id: "e_nothing" }, { "x-forwarded-for": ip }));
    for (let i = 0; i < 3; i++) assert.equal((await from("198.51.100.20")).status, 404);
    const refused = await from("198.51.100.20");
    assert.equal(refused.status, 429);
    const wait = Number(refused.headers.get("retry-after"));
    assert.ok(wait >= 1 && wait <= 60);
    assert.match((await refused.json()).error, /Too many changes from this client in a minute\. Try again in \d+ seconds?\./);
    assert.equal((await from("198.51.100.21")).status, 404);
  } finally {
    delete process.env.NOIR_WRITE_LIMIT;
  }
});

test("reading the desk is never limited", async () => {
  process.env.NOIR_WRITE_LIMIT = "1";
  try {
    for (let i = 0; i < 20; i++) assert.equal((await routes.desk.GET()).status, 200);
  } finally {
    delete process.env.NOIR_WRITE_LIMIT;
  }
});
