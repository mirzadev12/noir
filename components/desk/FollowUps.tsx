/**
 * FollowUps — what the officer must chase today, at the top of the desk: sent
 * requests past their expected answer, freezes about to lapse, and preserved
 * records about to be released. Each line says where its date comes from — the
 * exchange's own published note, quoted, or NOIR's labelled default — and links
 * to the VASP. Nothing shows when nothing is due. See lib/follow-up.ts.
 */

import Link from "next/link";
import { Section, Tag } from "@/components/noir";
import type { VaspRow } from "@/lib/desk-types";
import { DEFAULT_WAIT_DAYS, followUp, type FollowUp } from "@/lib/follow-up";
import { utcDay, vaspHref } from "@/lib/noir-format";

/** How far ahead a lapsing freeze or preservation is worth a line. */
const HORIZON_DAYS = 14;

interface Item {
  vasp: string;
  tone: "prohibit" | "wait" | "plain";
  label: string;
  line: string;
  source?: string;
}

function items(row: VaspRow, f: FollowUp, today: string): Item[] {
  const out: Item[] = [];
  if (f.overdue && f.dueOn) {
    out.push({
      vasp: row.vasp,
      tone: "prohibit",
      label: "Overdue",
      line: `Sent ${f.waitingDays} day${f.waitingDays === 1 ? "" : "s"} ago; an answer was due by ${utcDay(f.dueOn)}. Follow up through the channel you used.${f.dueBasis === "vasp" ? "" : ` ${row.vasp} publishes no answer time, so NOIR allows ${DEFAULT_WAIT_DAYS} days.`}`,
      source: f.dueBasis === "vasp" ? f.timing.sources.answerHours : undefined,
    });
  } else if (f.waitingDays !== null && f.dueOn) {
    out.push({
      vasp: row.vasp,
      tone: "plain",
      label: `Answer due ${utcDay(f.dueOn)}`,
      line: `Sent ${f.waitingDays === 0 ? "today" : `${f.waitingDays} day${f.waitingDays === 1 ? "" : "s"} ago`}; no answer recorded yet.${f.dueBasis === "vasp" ? "" : ` ${row.vasp} publishes no answer time, so NOIR allows ${DEFAULT_WAIT_DAYS} days.`}`,
      source: f.dueBasis === "vasp" ? f.timing.sources.answerHours : undefined,
    });
  }
  // A freeze with a stated maximum is on the clock from the day it is recorded.
  if (f.freezeLapsesOn && f.freezeDaysLeft !== null) {
    out.push({
      vasp: row.vasp,
      tone: f.freezeDaysLeft <= 3 ? "prohibit" : f.freezeDaysLeft <= HORIZON_DAYS ? "wait" : "plain",
      label: f.freezeDaysLeft < 0 ? "Freeze may have lapsed" : `Freeze lapses in ${f.freezeDaysLeft} day${f.freezeDaysLeft === 1 ? "" : "s"}`,
      line: `Unless the freezing order stated a duration, ${row.vasp} lifts the freeze on ${utcDay(f.freezeLapsesOn)}. Send an extension or a court order before then.`,
      source: f.timing.sources.freezeMaxDays,
    });
  }
  if (f.preservedUntil && f.preservedUntil >= today) {
    const left = Math.floor((Date.parse(f.preservedUntil) - Date.parse(today)) / 86_400_000);
    if (left <= HORIZON_DAYS) {
      out.push({
        vasp: row.vasp,
        tone: "wait",
        label: `Preservation ends in ${left} day${left === 1 ? "" : "s"}`,
        line: `Records ${row.vasp} preserved for this request may be released after ${utcDay(f.preservedUntil)}. Serve the legal process before then.`,
        source: f.timing.sources.preservationDays,
      });
    }
  }
  return out;
}

/** What is due across these rows, in the order the desk shows it. */
export function followUpItems(rows: VaspRow[], now: string): Item[] {
  const today = now.slice(0, 10);
  const rank = { prohibit: 0, wait: 1, plain: 2 } as const;
  return rows
    .flatMap((row) => (row.request ? items(row, followUp(row.request, row.le, now), today) : []))
    .sort((a, b) => rank[a.tone] - rank[b.tone]);
}

/** The lines alone, for a page that has its own heading (the VASP page). */
export function FollowUpList({ list, showVasp = true }: { list: Item[]; showVasp?: boolean }) {
  return (
    <ul className="rule-t">
      {list.map((it, i) => (
        <li key={`${it.vasp}-${i}`} className="hair-b grid min-w-0 gap-2 py-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6">
          <div className="flex min-w-0 flex-col items-start gap-2">
            {showVasp ? (
              <Link href={vaspHref(it.vasp)} className="type-sign text-lead text-ink no-underline hover:text-route">
                {it.vasp}
              </Link>
            ) : null}
            <Tag tone={it.tone}>{it.label}</Tag>
          </div>
          <div className="min-w-0">
            <p>{it.line}</p>
            {it.source ? <p className="mt-1 text-small text-ink-soft">Source: “{it.source}”</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function FollowUps({ rows, now }: { rows: VaspRow[]; now: string }) {
  const list = followUpItems(rows, now);
  if (list.length === 0) return null;
  return (
    <Section
      flush
      title="Follow up"
      count={`${list.length} on the clock`}
      note="Answers due, freezes that lapse and preserved records about to be released, most urgent first. Dates come from each exchange's own published law-enforcement page, quoted beneath each line, or from NOIR's stated default."
    >
      <FollowUpList list={list} />
    </Section>
  );
}
