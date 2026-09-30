// GET /api/attribute/[address]: one wallet's nearest VASP on both sides, answered from the recorded cases (no network).
import { test, before } from "node:test";
import assert from "node:assert/strict";

process.env.DEMO_MODE = "true";
process.env.NOIR_WRITE_LIMIT = "0";

let GET;
before(async () => {
  GET = (await import("../app/api/attribute/[address]/route.ts")).GET;
});
const call = (address, query = "") => GET(new Request(`http://x/api/attribute/${address}${query}`), { params: Promise.resolve({ address }) });

test("a recorded TRON wallet is attributed both ways, with its listed contact", async () => {
  const res = await call("TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const r = await res.json();
  assert.equal(r.outbound.vasp, "Binance");
  assert.ok(r.inbound.some((i) => i.vasp === "MEXC"));
  assert.equal(r.provenance.basis, "recorded");
  assert.equal(r.readable, true);
  assert.equal(r.typologies.find((t) => t.code === "SANCTIONED_CONTACT").usdt, 800);
});

test("a recorded Ethereum wallet reaches its exchange", async () => {
  const r = await (await call("0x77fB78EAC2021Cd52097168873324d3F1200E275")).json();
  assert.equal(r.outbound.vasp, "CoinDCX");
});

test("a chain NOIR screens but does not trace says so, without reading any chain", async () => {
  const res = await call("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
  assert.equal(res.status, 200);
  const r = await res.json();
  assert.equal(r.traced, false);
  assert.equal(r.outbound, null);
  assert.equal(r.provenance.apiCalls, 0);
});

test("a bad address, a bad escape and a wrong chain are refused with a reason", async () => {
  for (const [addr, q] of [["notanaddress", ""], ["100%", ""], ["TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj", "?chain=polygon"], ["TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj", "?chain=solana"]]) {
    const res = await call(addr, q);
    assert.equal(res.status, 400, `${addr}${q}`);
    assert.equal(typeof (await res.json()).error, "string");
  }
});
