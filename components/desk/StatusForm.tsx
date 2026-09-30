"use client";

/**
 * StatusForm — record what happened to a request: it was sent, or the VASP
 * answered. The order is the server's rule and the form only offers what is
 * allowed: a drafted request can only be recorded as sent; a sent one takes any
 * answer, in any order, as often as the VASP writes.
 *
 * Fields: the status; the day it happened (blank records now, in UTC); the
 * VASP's or SAHYOG's reference number as typed; a note (500 characters at most).
 * NOIR sends nothing — this records what the officer did and what came back.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Notice, Select, TextArea, TextInput } from "@/components/noir";
import type { RequestStatus } from "@/lib/desk-types";
import { STATUS_LABEL } from "@/lib/requests";
import { call } from "./net";

const AFTER_SENT: RequestStatus[] = ["acknowledged", "data-received", "frozen", "refused", "no-response"];

export function StatusForm({ requestId, current }: { requestId: string; current: RequestStatus }) {
  const router = useRouter();
  const options: RequestStatus[] = current === "drafted" ? ["sent"] : AFTER_SENT;
  const [status, setStatus] = useState<RequestStatus>(options[0]);
  const [on, setOn] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // After a refresh the options move on (sent → the answers); what is sent is
  // always what the select shows, never a status left over from before.
  const value = options.includes(status) ? status : options[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    setDone(null);
    const r = await call("PATCH", "/api/desk/requests", {
      id: requestId,
      status: value,
      on: on || undefined,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (r.ok) {
      setOn("");
      setReference("");
      setNote("");
      setDone(`Recorded: ${STATUS_LABEL[value]}${on ? ` on ${on}` : ""}.`);
      router.refresh();
    } else {
      setProblem(r.error);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-w-0 max-w-prose flex-col gap-4" aria-busy={busy}>
      <Field label="Record it as" htmlFor={`status-${requestId}`}>
        <Select id={`status-${requestId}`} value={value} onChange={(e) => setStatus(e.target.value as RequestStatus)}>
          {options.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label="Date it happened" htmlFor={`on-${requestId}`} hint="Leave blank for today. Stored as a UTC calendar day, e.g. 29 Sep 2026.">
          <TextInput id={`on-${requestId}`} type="date" value={on} onChange={(e) => setOn(e.target.value)} />
        </Field>
        <Field label="Reference" htmlFor={`ref-${requestId}`} hint="The VASP’s or SAHYOG’s number, as written.">
          <TextInput id={`ref-${requestId}`} value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} autoComplete="off" />
        </Field>
      </div>
      <Field label="Note" htmlFor={`note-${requestId}`} hint="At most 500 characters.">
        <TextArea id={`note-${requestId}`} rows={3} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div aria-live="polite" className="empty:hidden">
        {problem ? <Notice tone="stop">{problem}</Notice> : null}
        {done && !problem ? <Notice>{done}</Notice> : null}
      </div>
      <div>
        <Button type="submit" busy={busy} icon="check">
          {busy ? "Recording…" : "Record"}
        </Button>
      </div>
    </form>
  );
}
