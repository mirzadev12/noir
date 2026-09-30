// Stages the desk the demo film is recorded on: nine recorded wallets filed under three case
// references, and three requests at three stages (MEXC frozen, CoinDCX sent, Bitget drafted).
//
//   NOIR_BASE=http://localhost:3036 node stage-desk.mjs
//
// Run it once against a server started with DEMO_MODE=true and an empty state directory, so the
// wallets are answered from the recorded chain reads and no network is needed.

const BASE = process.env.NOIR_BASE || "http://localhost:3036";

const CASES = {
  "FIR 114/2026, Cyber PS Pune": [
    "TDii6vao7xyWg2rKPbCPWVRpSmne8xcqYx",
    "TUGHe9CTbZG44YvqfTSBd3mTAysCWcVNL6",
    "TXncpWJZ8ZxUcwrpTP4SE4nNhZnKZM4QzC",
    "0xda4E10D8B82ed53d950e2D4312A22331c515569c",
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", // Bitcoin: recognised and screened, not traced
  ],
  "FIR 77/2026": ["TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj", "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex"],
  "CR 88/2026": ["TBfVDwNS6hC2Ln2qTLTRKMMPddscFEhhrU", "0x77fB78EAC2021Cd52097168873324d3F1200E275"],
};

const call = async (method, path, body) => {
  const res = await fetch(BASE + path, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
};

for (const [caseRef, wallets] of Object.entries(CASES)) {
  const r = await call("POST", "/api/desk", { text: wallets.join("\n"), caseRef });
  console.log(`filed ${r.added.length} under ${caseRef}`);
}

// The worker reads them (recorded answers are instant); wait until nothing is pending.
for (let i = 0; i < 60; i++) {
  const desk = await call("GET", "/api/desk");
  if (desk.pending.length === 0) break;
  await new Promise((r) => setTimeout(r, 500));
}

const draft = (vasp, asks) => call("POST", "/api/desk/requests", { vasp, asks });
const mexc = await draft("MEXC", ["kyc", "access-logs", "transactions", "preservation", "freeze"]);
await call("PATCH", "/api/desk/requests", { id: mexc.id, status: "sent", reference: "SAH/2026/0913" });
await call("PATCH", "/api/desk/requests", { id: mexc.id, status: "frozen" });
const coindcx = await draft("CoinDCX", ["kyc", "transactions", "preservation", "freeze"]);
await call("PATCH", "/api/desk/requests", { id: coindcx.id, status: "sent" });
await draft("Bitget", ["kyc", "preservation"]);

const desk = await call("GET", "/api/desk");
console.log(`staged: ${desk.rows.length} VASPs on the desk, ${(await call("GET", "/api/desk/requests")).length} requests`);
