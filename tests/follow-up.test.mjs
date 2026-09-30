import { test } from "node:test";
import assert from "node:assert/strict";
import { followUp, timingOf } from "../lib/follow-up.ts";

const by = { id: null, unit: null, verified: false };
const h = (status, day, extra = {}) => ({ status, at: `2026-09-${String(day).padStart(2, "0")}T10:00:00.000Z`, by, on: null, reference: null, note: null, ...extra });
const req = (asks, ...history) => ({ id: "r_1", vasp: "X", asks, entryIds: [], history });
const le = (notes) => ({ exchange: "X", found: true, channels: [], notes, source: "https://example.org/le", checked: "2026-09-20" });

test("timing is read from the exchange's own notes, with the sentence it came from", () => {
  const t = timingOf(le([
    "A preservation request keeps records for 90 days.",
    "MEXC freezes for at most 30 days unless the order says otherwise, and lifts the restriction if no duration is given.",
    "Usually answered within about 48 working hours of a complete request.",
  ]));
  assert.equal(t.preservationDays, 90);
  assert.equal(t.freezeMaxDays, 30);
  assert.equal(t.answerHours, 48);
  assert.match(t.sources.freezeMaxDays, /at most 30 days/);
  assert.deepEqual(timingOf(null), { preservationDays: null, freezeMaxDays: null, answerHours: null, sources: {} });
});

test("a sent request past its expected answer is overdue; the default wait is 7 days", () => {
  const sent = req(["kyc"], h("drafted", 1), h("sent", 2));
  const f = followUp(sent, null, "2026-09-12T10:00:00.000Z");
  assert.equal(f.waitingDays, 10);
  assert.equal(f.dueOn, "2026-09-09");
  assert.equal(f.dueBasis, "default");
  assert.equal(f.overdue, true);
  const quick = followUp(sent, le(["Answers within 12 hours."]), "2026-09-02T20:00:00.000Z");
  assert.equal(quick.dueBasis, "vasp");
  assert.equal(quick.overdue, false);
});

test("an answered or unsent request is not waiting", () => {
  assert.equal(followUp(req(["kyc"], h("drafted", 1)), null, "2026-09-20T00:00:00.000Z").waitingDays, null);
  const answered = followUp(req(["kyc"], h("drafted", 1), h("sent", 2), h("acknowledged", 3)), null, "2026-09-20T00:00:00.000Z");
  assert.equal(answered.overdue, false);
  assert.equal(answered.waitingDays, null);
});

test("a freeze lapses at the VASP's stated maximum, counted from the day it was frozen", () => {
  const r = req(["freeze"], h("drafted", 1), h("sent", 2), h("frozen", 5, { on: "2026-09-05" }));
  const f = followUp(r, le(["Freezes for at most 30 days unless the order says otherwise."]), "2026-09-20T00:00:00.000Z");
  assert.equal(f.freezeLapsesOn, "2026-10-05");
  assert.equal(f.freezeDaysLeft, 15);
});

test("preservation runs from the day the request was sent, only when it was asked", () => {
  const notes = le(["A preservation request keeps records for 90 days."]);
  const asked = followUp(req(["preservation"], h("drafted", 1), h("sent", 2)), notes, "2026-09-03T00:00:00.000Z");
  assert.equal(asked.preservedUntil, "2026-12-01");
  const notAsked = followUp(req(["kyc"], h("drafted", 1), h("sent", 2)), notes, "2026-09-03T00:00:00.000Z");
  assert.equal(notAsked.preservedUntil, null);
});
