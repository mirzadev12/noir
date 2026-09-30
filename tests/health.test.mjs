// L8 — /api/health says whether the state directory can be written, and, when
// asked with ?deep=1, which chains answer. Without ?deep=1 no chain is read.
import { test, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STATE = mkdtempSync(join(tmpdir(), "noir-health-"));
process.env.NOIR_STATE_DIR = STATE;
process.env.DEMO_MODE = "true";

const KEYS = ["TRONGRID_API_KEY", "BLOCKSCOUT_API_KEY", "TRONGRID_URL", "BLOCKSCOUT_URL", "POLYGON_BLOCKSCOUT_URL"];
const realFetch = globalThis.fetch;

let health, route;
before(async () => {
  health = await import("../lib/health.ts");
  route = await import("../app/api/health/route.ts");
});
afterEach(() => {
  for (const k of KEYS) delete process.env[k];
  process.env.NOIR_STATE_DIR = STATE;
  globalThis.fetch = realFetch;
});

const get = (query = "") => route.GET(new Request(`http://localhost/api/health${query}`));

test("a state directory that can be written says so, and the probe leaves nothing behind", async () => {
  assert.deepEqual(await health.stateWritable(0), { writable: true, reason: null });
  assert.deepEqual(readdirSync(STATE).filter((n) => n.includes("probe")), []);
});

test("a state directory that cannot be written says why, in words", async () => {
  // A path under a file can never be a directory.
  const file = join(STATE, "not-a-directory");
  writeFileSync(file, "x");
  process.env.NOIR_STATE_DIR = join(file, "state");
  const answer = await health.stateWritable(0);
  assert.equal(answer.writable, false);
  assert.match(answer.reason, /could not be written/);
});

test("the answer is remembered for a minute, so a health check every few seconds does not write every time", async () => {
  const first = await health.stateWritable(0);
  assert.equal(first.writable, true);
  const file = join(STATE, "blocker");
  writeFileSync(file, "x");
  process.env.NOIR_STATE_DIR = join(file, "state");
  assert.deepEqual(await health.stateWritable(), first, "still the remembered answer, though the directory changed");
  assert.equal((await health.stateWritable(0)).writable, false, "asked afresh, it is checked again");
});

test("each chain has one cheap probe, to the endpoint its reads go to, with the key only where it belongs", () => {
  const plain = health.chainProbes();
  assert.equal(plain.tron.url, "https://api.trongrid.io/v1/contracts/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t/events?limit=1");
  assert.deepEqual(plain.tron.headers, { accept: "application/json" });
  assert.equal(plain.ethereum.url, "https://eth.blockscout.com/api/v2/tokens/0xdAC17F958D2ee523a2206206994597C13D831ec7");
  assert.equal(plain.polygon.url, "https://polygon.blockscout.com/api/v2/tokens/0xc2132D05D31c914a87C6611C10748AEb04B58e8F");

  process.env.TRONGRID_API_KEY = "k-tron";
  process.env.BLOCKSCOUT_API_KEY = "k-scout";
  const keyed = health.chainProbes();
  assert.equal(keyed.tron.headers["TRON-PRO-API-KEY"], "k-tron");
  assert.match(keyed.ethereum.url, /^https:\/\/api\.blockscout\.com\/1\/api\/v2\/tokens\//);
  assert.equal(keyed.ethereum.headers.authorization, "Bearer k-scout");
  assert.equal(keyed.polygon.headers.authorization, undefined, "Polygon is read keyless");

  process.env.TRONGRID_URL = "https://tron.agency.example/";
  process.env.BLOCKSCOUT_URL = "not a url";
  const own = health.chainProbes();
  assert.match(own.tron.url, /^https:\/\/tron\.agency\.example\/v1\/contracts\//);
  assert.equal(own.tron.headers["TRON-PRO-API-KEY"], undefined, "a key is never sent to an agency's own endpoint");
  assert.equal(own.ethereum.url, null);
  assert.match(own.ethereum.why, /BLOCKSCOUT_URL is set but is not an http\(s\) URL/);
});

test("a chain is reachable when its probe answers 2xx, and unreachable with the reason otherwise", async () => {
  const probe = { url: "https://x.example/probe", headers: {}, why: null };
  assert.deepEqual(await health.reach(probe, async () => new Response("{}", { status: 200 })), { state: "reachable", why: null });
  assert.deepEqual(await health.reach(probe, async () => new Response("", { status: 429 })), { state: "unreachable", why: "it answered 429: this deployment is being rate-limited" });
  assert.deepEqual(await health.reach(probe, async () => new Response("", { status: 503 })), { state: "unreachable", why: "it answered 503" });
  assert.deepEqual(await health.reach(probe, async () => { throw new Error("connect ETIMEDOUT"); }), { state: "unreachable", why: "it did not answer" });
  assert.deepEqual(await health.reach({ url: null, headers: {}, why: "X is set but is not an http(s) URL" }, async () => { throw new Error("never asked"); }), { state: "unreachable", why: "X is set but is not an http(s) URL" });
});

test("GET /api/health reads no chain, and says whether the state directory can be written", async () => {
  let asked = 0;
  globalThis.fetch = async () => {
    asked += 1;
    throw new Error("health must not read a chain unless asked to");
  };
  const res = await get();
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.demoMode, true);
  assert.equal(typeof body.state.writable, "boolean");
  assert.ok("reason" in body.state);
  assert.equal(body.chains, undefined);
  assert.equal(asked, 0);
  assert.deepEqual(Object.keys(body.reads).sort(), ["ethHistory", "ethNode", "polygonHistory", "polygonNode", "tronHistory", "tronNode"]);
});

test("GET /api/health?deep=1 asks each chain once and says which answered", async () => {
  const asked = [];
  globalThis.fetch = async (url) => {
    asked.push(String(url));
    if (String(url).includes("trongrid")) return new Response("{}", { status: 200 });
    if (String(url).includes("eth.blockscout")) return new Response("", { status: 502 });
    throw new Error("socket hang up");
  };
  const body = await (await get("?deep=1")).json();
  assert.equal(asked.length, 3);
  assert.deepEqual(body.chains, { tron: "reachable", ethereum: "unreachable", polygon: "unreachable" });
  assert.deepEqual(body.chainsWhy, { tron: null, ethereum: "it answered 502", polygon: "it did not answer" });
  assert.equal(body.ok, true, "the server itself is up; a chain being down is reported, not a failure of health");
});

test("the key is never in the answer", async () => {
  process.env.TRONGRID_API_KEY = "super-secret-tron-key";
  process.env.BLOCKSCOUT_API_KEY = "super-secret-scout-key";
  globalThis.fetch = async () => new Response("{}", { status: 200 });
  const text = await (await get("?deep=1")).text();
  assert.ok(!text.includes("super-secret"));
  assert.equal(JSON.parse(text).chainAccess, "keyed");
});
