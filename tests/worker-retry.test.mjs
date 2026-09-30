// L5 — retry and backoff: a wallet that could not be read is read again by the
// worker itself, a bounded number of times, further apart each time. Between
// reads and after the last one it is "unreadable": never attributed with
// nothing in it, never empty.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_READ_ATTEMPTS, RETRY_DELAYS_MS, emptyDesk, fileWallets, groupByVasp, markPending, markPendingWhere, nextRetryAt, requeueDue, setRecord } from "../lib/desk.ts";
import { createWorker } from "../lib/desk-worker.ts";

const T0 = "2026-09-30T10:00:00.000Z";
const at = (ms) => new Date(Date.parse(T0) + ms).toISOString();
const by = { id: null, unit: null, verified: false };

const record = (wallet, over = {}) => ({
  wallet,
  chain: "tron",
  traced: true,
  readable: true,
  outbound: null,
  outboundStop: "none-found",
  inbound: [],
  inboundLeads: [],
  inboundRead: "read",
  sanctioned: null,
  provenance: { generatedAt: T0, basis: "live", apiCalls: 1, responseHashes: [] },
  ...over,
});
const unread = (wallet) => record(wallet, { readable: false, outboundStop: null, inboundRead: "unreadable" });

function deskWith(...wallets) {
  const desk = emptyDesk();
  let n = 0;
  fileWallets(desk, wallets.map((wallet, i) => ({ line: i + 1, ok: true, wallet, chain: "tron", traced: true, caseRef: null })), by, T0, () => `e_${++n}`);
  return desk;
}

test("the bounds: three reads in all, 30 seconds then 2 minutes apart", () => {
  assert.equal(MAX_READ_ATTEMPTS, 3);
  assert.deepEqual(RETRY_DELAYS_MS, [30_000, 120_000]);
});

test("an unreadable wallet is scheduled to be read again, later each time, and then left", () => {
  const desk = deskWith("TA");
  const e = desk.entries[0];

  setRecord(desk, e.id, { record: unread("TA") }, at(0));
  assert.equal(e.status, "unreadable");
  assert.equal(e.attempts, 1);
  assert.equal(e.retryAt, at(30_000));

  requeueDue(desk, at(30_000));
  assert.equal(e.status, "pending");
  setRecord(desk, e.id, { record: unread("TA") }, at(31_000));
  assert.equal(e.attempts, 2);
  assert.equal(e.retryAt, at(31_000 + 120_000));

  requeueDue(desk, at(200_000));
  setRecord(desk, e.id, { record: unread("TA") }, at(201_000));
  assert.equal(e.status, "unreadable", "still unreadable after the last attempt");
  assert.equal(e.attempts, 3);
  assert.equal(e.retryAt, null, "the attempts are spent; the worker will not read it again by itself");
  assert.equal(e.record.readable, false, "the record says it could not be read; nothing says it is empty");
});

test("an unreadable wallet is never a row on the desk and never listed as routed nowhere", () => {
  const desk = deskWith("TA");
  setRecord(desk, desk.entries[0].id, { record: unread("TA") }, at(0));
  const view = groupByVasp(desk);
  assert.equal(view.rows.length, 0);
  assert.equal(view.unrouted.length, 0, "unrouted means read and found nothing; this was not read");
  assert.deepEqual(view.unreadable.map((e) => [e.wallet, e.attempts, e.retryAt]), [["TA", 1, at(30_000)]]);
});

test("only a wallet whose time has come is queued again, and its count is kept", () => {
  const desk = deskWith("TA", "TB", "TC");
  const [a, b, c] = desk.entries;
  setRecord(desk, a.id, { record: unread("TA") }, at(0)); // due at +30s
  setRecord(desk, b.id, { record: unread("TB") }, at(20_000)); // due at +50s
  setRecord(desk, c.id, { record: record("TC") }, at(0)); // read: nothing to retry
  assert.equal(nextRetryAt(desk), at(30_000));

  assert.deepEqual(requeueDue(desk, at(29_999)).map((e) => e.wallet), []);
  assert.deepEqual(requeueDue(desk, at(30_000)).map((e) => e.wallet), ["TA"]);
  assert.equal(a.status, "pending");
  assert.equal(a.attempts, 1, "a retry keeps the count");
  assert.equal(a.retryAt, null);
  assert.equal(b.status, "unreadable");
  assert.equal(nextRetryAt(desk), at(50_000));
  assert.equal(c.status, "attributed");
  assert.equal(c.retryAt, null);
});

test("a wallet read on a retry is attributed, and nothing more is scheduled", () => {
  const desk = deskWith("TA");
  const e = desk.entries[0];
  setRecord(desk, e.id, { record: unread("TA") }, at(0));
  requeueDue(desk, at(30_000));
  setRecord(desk, e.id, { record: record("TA") }, at(31_000));
  assert.equal(e.status, "attributed");
  assert.equal(e.attempts, 2);
  assert.equal(e.retryAt, null);
  assert.equal(nextRetryAt(desk), null);
});

test("reading a wallet again by hand starts the count again", () => {
  const desk = deskWith("TA", "TB");
  for (const e of desk.entries) {
    setRecord(desk, e.id, { record: unread(e.wallet) }, at(0));
    requeueDue(desk, at(30_000));
    setRecord(desk, e.id, { record: unread(e.wallet) }, at(31_000));
    assert.equal(e.attempts, 2);
  }
  markPending(desk, desk.entries[0].id);
  markPendingWhere(desk, { ids: [desk.entries[1].id] });
  for (const e of desk.entries) {
    assert.equal(e.status, "pending");
    assert.equal(e.attempts, 0);
    assert.equal(e.retryAt, null);
  }
});

test("a wallet the worker threw on is failed with its reason, and is not retried by itself", () => {
  const desk = deskWith("TA");
  const e = desk.entries[0];
  setRecord(desk, e.id, { error: "socket hang up" }, at(0));
  assert.equal(e.status, "failed");
  assert.equal(e.error, "socket hang up");
  assert.equal(e.retryAt, null);
  assert.equal(nextRetryAt(desk), null);
  assert.deepEqual(requeueDue(desk, at(10 * 60_000)), []);
});

/** A worker over an in-memory desk, with a clock and timers the test moves by hand. */
function rig(wallets, answer) {
  const desk = deskWith(...wallets);
  let now = Date.parse(T0);
  const timers = [];
  const reads = [];
  const worker = createWorker({
    async nextPending() {
      const e = desk.entries.find((x) => x.status === "pending");
      return e ? { id: e.id, wallet: e.wallet, chain: e.chain } : null;
    },
    async attribute(wallet) {
      reads.push(wallet);
      return answer(wallet, reads.filter((w) => w === wallet).length);
    },
    async save(id, result) {
      setRecord(desk, id, result, new Date(now).toISOString());
    },
    async requeueDue() {
      requeueDue(desk, new Date(now).toISOString());
      const next = nextRetryAt(desk);
      return next === null ? null : Date.parse(next);
    },
    now: () => now,
    schedule: (delayMs, run) => timers.push({ delayMs, run }),
  });
  return {
    desk,
    reads,
    timers,
    worker,
    /** Let the time of the latest timer pass, and run it. */
    async fire() {
      const t = timers.pop();
      now += t.delayMs;
      t.run();
      await worker.kick();
    },
  };
}

test("the worker reads an unreadable wallet again when its time comes, and stops when it is read", async () => {
  const r = rig(["TA"], (wallet, n) => (n < 3 ? unread(wallet) : record(wallet)));
  await r.worker.kick();
  assert.deepEqual(r.reads, ["TA"]);
  assert.equal(r.desk.entries[0].status, "unreadable");
  assert.deepEqual(r.timers.map((t) => t.delayMs), [30_000]);

  await r.fire();
  assert.deepEqual(r.reads, ["TA", "TA"]);
  assert.deepEqual(r.timers.map((t) => t.delayMs), [120_000]);

  await r.fire();
  assert.deepEqual(r.reads, ["TA", "TA", "TA"]);
  assert.equal(r.desk.entries[0].status, "attributed");
  assert.equal(r.timers.length, 0, "nothing more is scheduled");
});

test("the retries are bounded: a wallet that never reads is read three times and left unreadable", async () => {
  const r = rig(["TA"], (wallet) => unread(wallet));
  await r.worker.kick();
  await r.fire();
  await r.fire();
  assert.equal(r.reads.length, 3);
  assert.equal(r.timers.length, 0);
  const e = r.desk.entries[0];
  assert.equal(e.status, "unreadable");
  assert.equal(e.attempts, 3);
  assert.equal(e.retryAt, null);
  await r.worker.kick();
  assert.equal(r.reads.length, 3, "a later kick does not read it again");
});

test("a retry does not hold up the rest of the queue", async () => {
  const r = rig(["TA", "TB"], (wallet) => (wallet === "TA" ? unread(wallet) : record(wallet)));
  await r.worker.kick();
  assert.deepEqual(r.reads, ["TA", "TB"]);
  assert.equal(r.desk.entries[1].status, "attributed");
  assert.equal(r.timers.length, 1, "one timer, for the one wallet waiting");
});
