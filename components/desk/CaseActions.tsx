"use client";

/**
 * CaseActions — what an officer can do with one case on the cases screen: take
 * its whole file away as a download, read its wallets again, close it, or
 * reopen it (`/api/desk/cases`, `/api/desk/cases/file`, `/api/desk/reattribute`).
 *
 * Closing asks first, in two steps, and takes an optional note. It removes
 * nothing; the screen says what was still in motion when the case was closed.
 * A closed case shows the day it was closed and offers only its file and a
 * reopen.
 *
 * Props
 *   caseRef  the case reference, exactly as it was filed
 *   closed   when and why it was closed, or null while it is open
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink, Tag, TextInput } from "@/components/noir";
import { count, utcDay } from "@/lib/noir-format";
import { call } from "./net";

type Open = { pendingWallets: number; requestsAwaiting: number; requestsNotSent: number };
type Closed = { closedAt: string; note: string | null };
const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

/** What was still in motion when a case was closed, as one sentence; null when nothing was. */
function inMotion(open: Open): string | null {
  const parts = [
    open.pendingWallets ? `${plural(open.pendingWallets, "wallet")} still being read` : null,
    open.requestsAwaiting ? `${plural(open.requestsAwaiting, "request")} awaiting an answer` : null,
    open.requestsNotSent ? `${plural(open.requestsNotSent, "request")} drafted and not sent` : null,
  ].filter(Boolean);
  return parts.length ? `Still in motion when it was closed: ${parts.join(", ")}.` : null;
}

export function CaseActions({ caseRef, closed }: { caseRef: string; closed: Closed | null }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"close" | "reopen" | "read" | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const file = `/api/desk/cases/file?caseRef=${encodeURIComponent(caseRef)}`;

  async function act(action: "close" | "reopen") {
    setBusy(action);
    setProblem(null);
    setSaid(null);
    const r = await call<{ open: Open }>("POST", "/api/desk/cases", { caseRef, action, ...(action === "close" && note.trim() ? { note } : {}) });
    setBusy(null);
    if (!r.ok) {
      setProblem(r.error);
      return;
    }
    setAsking(false);
    setNote("");
    setSaid(action === "close" ? inMotion(r.data.open) : "Reopened. It takes filings again.");
    router.refresh();
  }

  async function readAgain() {
    setBusy("read");
    setProblem(null);
    setSaid(null);
    const r = await call<{ queued: unknown[]; skipped: unknown[] }>("POST", "/api/desk/reattribute", { caseRef });
    setBusy(null);
    if (!r.ok) {
      setProblem(r.error);
      return;
    }
    const { queued, skipped } = r.data;
    setSaid([queued.length ? `Reading ${plural(queued.length, "wallet")} again.` : null, skipped.length ? `${plural(skipped.length, "wallet")} already being read.` : null].filter(Boolean).join(" "));
    router.refresh();
  }

  return (
    <div className="mt-2 flex min-w-0 flex-col items-start gap-2">
      {closed ? (
        <div className="flex min-w-0 flex-col items-start gap-1">
          <Tag tone="quiet" icon="check">
            Closed {utcDay(closed.closedAt)}
          </Tag>
          {closed.note ? <span className="text-small text-ink-soft">{closed.note}</span> : null}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-small">
        <ButtonLink href={file} download variant="text" icon="download">
          Case file
        </ButtonLink>
        {closed ? (
          <Button variant="text" busy={busy === "reopen"} onClick={() => act("reopen")}>
            {busy === "reopen" ? "Reopening…" : "Reopen"}
          </Button>
        ) : (
          <>
            <Button variant="text" busy={busy === "read"} onClick={readAgain}>
              {busy === "read" ? "Queuing…" : "Read its wallets again"}
            </Button>
            {asking ? null : (
              <Button variant="text" onClick={() => setAsking(true)}>
                Close the case
              </Button>
            )}
          </>
        )}
      </div>

      {asking && !closed ? (
        <div className="flex w-full min-w-0 flex-col items-start gap-2">
          <label className="type-label text-ink-soft" htmlFor={`close-${caseRef}`}>
            Why it is closed (optional)
          </label>
          <TextInput id={`close-${caseRef}`} dense maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Charge sheet filed" />
          <p className="text-small text-ink-soft">Closing removes nothing. The case takes no new filings until it is reopened.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" busy={busy === "close"} onClick={() => act("close")}>
              {busy === "close" ? "Closing…" : "Close the case"}
            </Button>
            <Button variant="text" onClick={() => setAsking(false)}>
              Keep it open
            </Button>
          </div>
        </div>
      ) : null}

      {said ? (
        <span role="status" className="text-small text-ink-soft">
          {said}
        </span>
      ) : null}
      {problem ? (
        <span role="alert" className="text-small font-medium text-prohibit">
          {problem}
        </span>
      ) : null}
    </div>
  );
}
