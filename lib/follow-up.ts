/**
 * The follow-up clock: what the officer must chase, and by when.
 *
 *  - A sent request is overdue once its expected answer has passed: the time
 *    the exchange itself says it answers in, else NOIR's default of 7 days.
 *  - A freeze lapses: some exchanges freeze for a fixed maximum unless the
 *    order states a duration (MEXC: 30 days). The desk says when.
 *  - Preserved records expire: a preservation request keeps records for the
 *    period the exchange states (WazirX: 90 days).
 *
 * Every figure comes from the exchange's own published law-enforcement notes
 * (`data/le-contacts.json`), read by pattern, and the sentence it came from is
 * kept so the screen can quote it. Where a note states nothing, NOIR states
 * nothing either, apart from the labelled default wait. Pure; dates are UTC
 * calendar days.
 */

import type { StatusChange, VaspRequest } from "./desk-types";
import type { LeContact } from "./le-contacts";

export interface VaspTiming {
  preservationDays: number | null;
  freezeMaxDays: number | null;
  answerHours: number | null;
  /** The note each figure was read from, verbatim. */
  sources: Partial<Record<"preservationDays" | "freezeMaxDays" | "answerHours", string>>;
}

export const DEFAULT_WAIT_DAYS = 7;

const PATTERNS: { field: keyof Omit<VaspTiming, "sources">; re: RegExp; unit: "days" | "hours" }[] = [
  { field: "preservationDays", re: /(?:keeps records|records are preserved|preserv\w*)[^.]*?\bfor\s+(\d+)\s+days/i, unit: "days" },
  { field: "freezeMaxDays", re: /freezes?\s+for\s+at\s+most\s+(\d+)\s+days/i, unit: "days" },
  { field: "answerHours", re: /(?:answer\w*|respond\w*|repl\w*)[^.]*?within\s+(?:about\s+)?(\d+)\s+(?:working\s+)?hours/i, unit: "hours" },
];

export function timingOf(le: LeContact | null): VaspTiming {
  const timing: VaspTiming = { preservationDays: null, freezeMaxDays: null, answerHours: null, sources: {} };
  if (!le || !le.found) return timing;
  for (const note of le.notes) {
    for (const { field, re } of PATTERNS) {
      if (timing[field] !== null) continue;
      const m = re.exec(note);
      if (m) {
        timing[field] = Number(m[1]);
        timing.sources[field] = note;
      }
    }
  }
  return timing;
}

const DAY = 86_400_000;
const dayOf = (c: StatusChange) => c.on ?? c.at.slice(0, 10);
const plusDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00.000Z`) + n * DAY).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.floor((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY);

const ANSWERS = new Set(["acknowledged", "data-received", "frozen", "refused"]);

export interface FollowUp {
  /** Calendar days since the request was sent while no answer has come; null otherwise. */
  waitingDays: number | null;
  /** The day an answer was due; null when not sent or already answered. */
  dueOn: string | null;
  /** "vasp": from the exchange's stated answer time; "default": NOIR's 7 days. */
  dueBasis: "vasp" | "default" | null;
  overdue: boolean;
  /** When the preserved records may be released, if preservation was asked and the VASP states a period. */
  preservedUntil: string | null;
  /** When a freeze lapses, if the request was frozen and the VASP states a maximum. */
  freezeLapsesOn: string | null;
  freezeDaysLeft: number | null;
  timing: VaspTiming;
}

export function followUp(request: VaspRequest, le: LeContact | null, now: string): FollowUp {
  const timing = timingOf(le);
  const today = now.slice(0, 10);
  const sent = request.history.find((h) => h.status === "sent") ?? null;
  const answered = request.history.some((h) => ANSWERS.has(h.status));
  const frozen = request.history.find((h) => h.status === "frozen") ?? null;

  let waitingDays: number | null = null;
  let dueOn: string | null = null;
  let dueBasis: FollowUp["dueBasis"] = null;
  let overdue = false;
  if (sent && !answered) {
    const sentDay = dayOf(sent);
    waitingDays = daysBetween(sentDay, today);
    if (timing.answerHours !== null) {
      dueBasis = "vasp";
      const due = Date.parse(sent.on ? `${sent.on}T00:00:00.000Z` : sent.at) + timing.answerHours * 3_600_000;
      dueOn = new Date(due).toISOString().slice(0, 10);
      overdue = Date.parse(now) > due;
    } else {
      dueBasis = "default";
      dueOn = plusDays(sentDay, DEFAULT_WAIT_DAYS);
      overdue = today > dueOn;
    }
  }

  const preservedUntil =
    sent && request.asks.includes("preservation") && timing.preservationDays !== null ? plusDays(dayOf(sent), timing.preservationDays) : null;
  const freezeLapsesOn = frozen && timing.freezeMaxDays !== null ? plusDays(dayOf(frozen), timing.freezeMaxDays) : null;

  return {
    waitingDays,
    dueOn,
    dueBasis,
    overdue,
    preservedUntil,
    freezeLapsesOn,
    freezeDaysLeft: freezeLapsesOn ? daysBetween(today, freezeLapsesOn) : null,
    timing,
  };
}
