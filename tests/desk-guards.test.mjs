import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "noir-guards-"));
process.env.NOIR_STATE_DIR = dir;
const desk = await import("../app/api/desk/route.ts");
const vasp = await import("../app/api/desk/vasp/[name]/route.ts");
const requests = await import("../app/api/desk/requests/route.ts");

test.after(() => rmSync(dir, { recursive: true, force: true }));

const post = (body) =>
  new Request("http://x/api/desk", { method: "POST", headers: { "content-type": "application/json" }, body });

test("a paste larger than the desk takes is refused before it is parsed", async () => {
  const res = await desk.POST(post(JSON.stringify({ text: "T".repeat(300_000) })));
  assert.equal(res.status, 413);
  assert.match((await res.json()).error, /too large/i);
});

test("a body that is not JSON is a 400, not a crash", async () => {
  const res = await desk.POST(post("{not json"));
  assert.equal(res.status, 400);
});

test("a VASP name that is not valid percent-encoding is a 404, not a 500", async () => {
  const res = await vasp.GET(new Request("http://x"), { params: Promise.resolve({ name: "100%" }) });
  assert.equal(res.status, 404);
});

test("a request status change needs a request id and a known status", async () => {
  const res = await requests.PATCH(
    new Request("http://x", { method: "PATCH", body: JSON.stringify({ id: "r_x", status: "approved" }) }),
  );
  assert.equal(res.status, 400);
});
