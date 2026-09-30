/**
 * Does demo mode attribute every recorded wallet, from the file, exactly?
 *
 *   node scripts/check-demo.mjs [port]
 *
 * Against a server started with DEMO_MODE=true and an empty desk (default
 * port 3000). The pitch runs on demo mode, so this is the check that matters
 * most on the day. Every recorded case in data/demo-cases.json is filed on the
 * desk; each must come back attributed — offline, a wallet that bypassed the
 * file comes back unreadable, which fails here — and every recorded outbound
 * exit must name the exchange the frozen trace names.
 *
 * Waits up to a minute for the server and two minutes for the queue, so CI can
 * start the server in the background and call this straight after. Exits
 * non-zero on any failure.
 */

import { readFileSync } from "node:fs";

const port = Number(process.argv[2] ?? 3000);
const base = `http://localhost:${port}`;
const cases = JSON.parse(readFileSync(new URL("../data/demo-cases.json", import.meta.url), "utf8")).cases;
const traced = cases.filter((c) => c.trace.chain !== "polygon");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(path, init) {
  const res = await fetch(base + path, init);
  return { status: res.status, body: await res.json() };
}

async function waitFor(what, test, seconds) {
  for (let i = 0; i < seconds; i++) {
    try {
      const v = await test();
      if (v) return v;
    } catch {
      // not up yet
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${what}.`);
}

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.log(`FAIL  ${msg}`);
};

await waitFor("the server", async () => (await fetch(`${base}/api/health`)).ok, 60);

const filed = await json("/api/desk", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-noir-officer": "check-run" },
  body: JSON.stringify({ text: traced.map((c) => `${c.address},${c.trace.chain}`).join("\n"), caseRef: "CHECK-RUN" }),
});
if (filed.status !== 201) fail(`filing answered ${filed.status}: ${JSON.stringify(filed.body).slice(0, 200)}`);

const view = await waitFor("the queue to drain", async () => {
  const { body } = await json("/api/desk");
  return body.pending.length === 0 ? body : null;
}, 120);

const entries = new Map();
for (const list of [view.unreadable, view.screenedOnly, view.failed, view.unrouted]) for (const e of list) entries.set(e.wallet.toLowerCase(), e);
for (const row of view.rows) for (const w of row.wallets) entries.set(w.wallet.toLowerCase(), w);

const vaspOf = (wallet) =>
  view.rows.filter((r) => r.wallets.some((w) => w.wallet.toLowerCase() === wallet.toLowerCase() && w.direction === "outbound")).map((r) => r.vasp);

for (const c of traced) {
  const key = c.address.toLowerCase();
  const wanted = c.trace.nodes
    .filter((n) => n.depth > 0 && n.taintedValueUsdt > 0 && ["exchange_deposit", "exchange_hot"].includes(n.label?.kind))
    .sort((a, b) => b.taintedValueUsdt - a.taintedValueUsdt)[0]?.label.entity;
  const failed = view.failed.find((e) => e.wallet.toLowerCase() === key);
  const unread = view.unreadable.find((e) => e.wallet.toLowerCase() === key);
  if (failed) fail(`${c.address}: worker failed — ${failed.error}`);
  else if (unread) fail(`${c.address}: unreadable, so it was read live, not from the file`);
  else if (!entries.has(key)) fail(`${c.address}: not on the desk`);
  else {
    const got = vaspOf(c.address);
    if (wanted && !got.includes(wanted)) fail(`${c.address}: outbound ${got.join("/") || "none"}, recorded trace says ${wanted}`);
    else if (!wanted && got.length) fail(`${c.address}: outbound ${got.join("/")}, recorded trace names no exchange`);
    else console.log(`ok    ${c.address} → ${wanted ?? "no exchange (stop)"}`);
  }
}


console.log(failures ? `\n${failures} failure(s).` : `\nAll ${traced.length} recorded wallets attributed from the file.`);
process.exit(failures ? 1 : 0);
