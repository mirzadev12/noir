"use client";

/**
 * AskForm — choose what to ask a VASP, and draft the one consolidated request.
 * Every ask the VASP may be sent is ticked by default. A freeze is offered only
 * where the desk knows an account to freeze (`allowed` comes from the server);
 * where it does not, the freeze is shown unticked and disabled, with the reason,
 * so its absence is explained rather than silent.
 *
 * Submitting drafts the request (`POST /api/desk/requests`) and opens its letter.
 * The submit button lives in this form; the sign above may also carry a button
 * that submits it (`form="ask-form"`).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Check, Notice } from "@/components/noir";
import { ASKS, type Ask } from "@/lib/desk-types";
import { requestHref } from "@/lib/noir-view";
import { ASK_LABEL } from "@/lib/requests";
import { call } from "./net";

export function AskForm({ vasp, allowed }: { vasp: string; allowed: Ask[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<Ask[]>(allowed);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const toggle = (ask: Ask, on: boolean) => setChosen((c) => (on ? ASKS.filter((a) => a === ask || c.includes(a)) : c.filter((a) => a !== ask)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (chosen.length === 0) {
      setProblem("Choose at least one thing to ask.");
      return;
    }
    setBusy(true);
    setProblem(null);
    const r = await call("POST", "/api/desk/requests", { vasp, asks: chosen });
    if (r.ok) {
      router.push(requestHref(vasp));
      return;
    }
    setBusy(false);
    setProblem(r.error);
  }

  return (
    <form id="ask-form" onSubmit={submit} className="flex min-w-0 flex-col gap-4" aria-busy={busy}>
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="sr-only">What to ask {vasp}</legend>
        <div className="flex flex-col">
          {ASKS.map((ask) => {
            const ok = allowed.includes(ask);
            return (
              <div key={ask} className="hair-t first:border-t-0">
                <Check
                  label={ASK_LABEL[ask]}
                  hint={ok ? undefined : `A freeze needs an account to freeze. No account at ${vasp} is known, so it cannot be asked.`}
                  checked={ok && chosen.includes(ask)}
                  disabled={!ok}
                  onChange={(e) => toggle(ask, e.target.checked)}
                />
              </div>
            );
          })}
        </div>
      </fieldset>
      {problem ? <Notice tone="stop">{problem}</Notice> : null}
      <div>
        <Button type="submit" busy={busy} icon="arrow-right">
          {busy ? "Drafting…" : "Draft one request"}
        </Button>
      </div>
    </form>
  );
}
