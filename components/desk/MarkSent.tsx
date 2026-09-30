"use client";

/**
 * MarkSent — record several drafted requests as sent in one step
 * (`PATCH /api/desk/requests { ids, status: "sent", on }`). It appears on the
 * register only when more than one request is drafted and not sent. NOIR sends
 * nothing: this records that the officer sent them, today, by whatever channel
 * each VASP takes. Each request is judged by its own rules, and one that is
 * refused is named with the reason.
 *
 * Props
 *   requests  the drafted requests: `id` and the VASP each is addressed to
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/noir";
import { count } from "@/lib/noir-format";
import { call } from "./net";

type Result = { changed: { id: string }[]; refused: { id: string; error: string }[] };

export function MarkSent({ requests }: { requests: { id: string; vasp: string }[] }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [refused, setRefused] = useState<{ vasp: string; error: string }[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  if (requests.length < 2 && !said && refused.length === 0) return null;

  async function go() {
    setBusy(true);
    setProblem(null);
    const r = await call<Result>("PATCH", "/api/desk/requests", { ids: requests.map((q) => q.id), status: "sent", on: new Date().toISOString().slice(0, 10) });
    setBusy(false);
    setAsking(false);
    // A 422 carries the same shape: nothing changed, and each request says why.
    const body = (r.ok ? r.data : (r.data as Result | null)) ?? null;
    if (!body || !Array.isArray(body.changed)) {
      setProblem(r.ok ? "The server gave no answer." : r.error);
      return;
    }
    const name = (id: string) => requests.find((q) => q.id === id)?.vasp ?? id;
    setSaid(body.changed.length ? `Recorded ${count(body.changed.length)} ${body.changed.length === 1 ? "request" : "requests"} as sent today.` : "Nothing was changed.");
    setRefused(body.refused.map((x) => ({ vasp: name(x.id), error: x.error })));
    router.refresh();
  }

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      {requests.length >= 2 ? (
        asking ? (
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p className="max-w-prose text-small text-ink-soft">
              This records that you sent the requests to {requests.map((q) => q.vasp).join(", ")} today. NOIR sends nothing itself.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" busy={busy} onClick={go}>
                {busy ? "Recording…" : `Record all ${count(requests.length)} as sent today`}
              </Button>
              <Button variant="text" onClick={() => setAsking(false)}>
                Not yet
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" icon="check" onClick={() => setAsking(true)}>
            Record {count(requests.length)} drafted requests as sent
          </Button>
        )
      ) : null}
      {said ? (
        <span role="status" className="text-small text-ink-soft">
          {said}
        </span>
      ) : null}
      {refused.length ? (
        <ul role="alert" className="flex flex-col gap-1 text-small">
          {refused.map((x) => (
            <li key={x.vasp}>
              <strong>{x.vasp}:</strong> {x.error}
            </li>
          ))}
        </ul>
      ) : null}
      {problem ? (
        <span role="alert" className="text-small font-medium text-prohibit">
          {problem}
        </span>
      ) : null}
    </div>
  );
}
