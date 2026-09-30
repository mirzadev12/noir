// A wallet whose money reached an OFAC-listed address on its way to an exchange
// has a VASP to write to and a listing to report. The desk flags it with the
// wallets that are listed themselves and the ones whose trail ended at a listing.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.NOIR_STATE_DIR = mkdtempSync(join(tmpdir(), "noir-contact-"));
process.env.DEMO_MODE = "true";

const WALLETS = {
  contact: "TTQd8Bo1nhKEVgkKJVP3SRYZ1nDNStckvj", // reaches Binance; part of its money reached a listed address
  ended: "TUGHe9CTbZG44YvqfTSBd3mTAysCWcVNL6", // its trail ended at a listed address
  listed: "TRWDtgCfXzTcMv8W6iJxh6umeqeF3zG7n5", // the wallet itself is listed
  clean: "TXq2kpXz13Z16b2Fjq58NerQTmU7gkkGex", // reaches MEXC; no listing anywhere
};

let read;
before(async () => {
  const desk = await import("../app/api/desk/route.ts");
  const worker = await import("../lib/desk-worker.ts");
  read = await import("../lib/desk-read.ts");
  const res = await desk.POST(new Request("http://localhost/api/desk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: Object.values(WALLETS).join("\n") }) }));
  assert.equal(res.status, 201);
  await worker.deskWorker().kick();
});

test("the desk flags all three kinds of listing, and not a wallet with none", async () => {
  const page = await read.readDeskView();
  assert.equal(page.ok, true);
  const flagged = page.value.flagged.map((e) => e.wallet).sort();
  assert.deepEqual(flagged, [WALLETS.contact, WALLETS.ended, WALLETS.listed].sort());
});

test("a wallet flagged for a contact is still a row under the VASP its money reached", async () => {
  const page = await read.readDeskView();
  const binance = page.value.view.rows.find((r) => r.vasp === "Binance");
  assert.ok(binance.wallets.some((w) => w.wallet === WALLETS.contact && w.direction === "outbound"));
  const entry = page.value.flagged.find((e) => e.wallet === WALLETS.contact);
  assert.equal(entry.record.sanctioned, null, "the wallet itself is not listed");
  assert.equal(entry.record.outboundStop, null, "its trail did not end at the listing");
});

test("the record keeps how much of the wallet's traced money reached the listed address", async () => {
  const { listedContact } = await import("../lib/listed-contact.ts");
  const page = await read.readDeskView();
  const entry = page.value.flagged.find((e) => e.wallet === WALLETS.contact);
  const contact = entry.record.typologies.find((t) => t.code === "SANCTIONED_CONTACT");
  assert.equal(contact.usdt, 800);
  assert.deepEqual(listedContact(entry.record), { address: contact.at, entity: "ISIL KHORASAN", usdt: 800 });
  // Only a contact carries the figure; the other typologies stay as the trace worded them.
  for (const t of entry.record.typologies) if (t.code !== "SANCTIONED_CONTACT") assert.equal("usdt" in t, false);
  // A record read before the figure was kept still names the listing, without one.
  const old = { ...entry.record, typologies: entry.record.typologies.map(({ code, reason, at }) => ({ code, reason, at })) };
  assert.deepEqual(listedContact(old), { address: contact.at, entity: "ISIL KHORASAN", usdt: null });
});
