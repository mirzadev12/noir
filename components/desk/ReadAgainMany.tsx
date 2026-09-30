"use client";

/**
 * ReadAgainMany — read every wallet under one VASP again in one step
 * (`POST /api/desk/reattribute { vasp }`). Each wallet's last record stays
 * until its new one lands; a wallet already waiting for the worker is said so
 * and not queued twice.
 *
 * Props
 *   vasp   the VASP whose wallets are read again
 *   count  how many wallets that is, for the button's own words
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/noir";
import { count as n } from "@/lib/noir-format";
import { call } from "./net";

const plural = (k: number, one: string, many = `${one}s`) => `${n(k)} ${k === 1 ? one : many}`;

export function ReadAgainMany({ vasp, count }: { vasp: string; count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setSaid(null);
    setProblem(null);
    const r = await call<{ queued: unknown[]; skipped: unknown[] }>("POST", "/api/desk/reattribute", { vasp });
    setBusy(false);
    if (!r.ok) {
      setProblem(r.error);
      return;
    }
    const { queued, skipped } = r.data;
    setSaid(
      [
        queued.length ? `Reading ${plural(queued.length, "wallet")} again. They return to this page as each answer lands.` : null,
        skipped.length ? `${plural(skipped.length, "wallet")} already being read.` : null,
      ]
        .filter(Boolean)
        .join(" "),
    );
    router.refresh();
  }

  return (
    <span className="inline-flex min-w-0 flex-col items-start gap-2">
      <Button variant="outline" size="sm" icon="refresh" busy={busy} onClick={go}>
        {busy ? "Queuing…" : `Read ${count === 1 ? "its wallet" : `all ${n(count)} wallets`} again`}
      </Button>
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
    </span>
  );
}
