// Captures the payers of every recorded case, live, into data/demo-payers.json,
// so demo mode can answer a recorded wallet in both directions with no network.
//
//   node --import ./tests/register.mjs scripts/freeze-payers.mjs
//
// Polygon cases are skipped: NOIR does not run inbound on Polygon (payers read
// any 0x address as Ethereum). A wallet whose payers could not be read is left
// out rather than recorded as unreadable, so a throttled run can be repeated;
// entries already in the file are kept unless re-captured.
import { readFileSync, writeFileSync } from "node:fs";
import { tracePayers } from "../lib/payers.ts";

const DEMO = new URL("../data/demo-cases.json", import.meta.url);
const OUT = new URL("../data/demo-payers.json", import.meta.url);

const cases = JSON.parse(readFileSync(DEMO, "utf8")).cases;
const file = JSON.parse(readFileSync(OUT, "utf8"));
const key = (chain, address) => `${chain}:${/^0x/i.test(address) ? address.toLowerCase() : address}`;

for (const c of cases) {
  const chain = c.trace.chain;
  if (chain === "polygon") continue;
  const k = key(chain, c.address);
  if (file.cases[k] && !process.argv.includes("--again")) {
    console.log(`kept      ${k}`);
    continue;
  }
  const started = Date.now();
  try {
    const p = await tracePayers(c.address);
    const secs = ((Date.now() - started) / 1000).toFixed(0);
    if (!p.readable) {
      console.log(`unread    ${k} (${secs}s) — not recorded`);
      continue;
    }
    file.cases[k] = p;
    file.capturedAt = new Date().toISOString();
    writeFileSync(OUT, JSON.stringify(file, null, 2) + "\n");
    const unread = p.payers.filter((x) => x.status === "unreadable").length;
    console.log(`recorded  ${k} (${secs}s): ${p.payers.length} payers, ${unread} unreadable, exchanges ${p.exchanges.map((e) => `${e.entity}/${e.via}`).join(", ") || "none"}`);
  } catch (err) {
    console.log(`failed    ${k}: ${err instanceof Error ? err.message : err}`);
  }
}
