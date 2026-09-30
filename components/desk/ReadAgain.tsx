"use client";

/**
 * ReadAgain — read a filed wallet again (`POST /api/desk/reattribute`). A record
 * is a snapshot of the moment the chain was read; this is the explicit way to
 * take a new one, or to retry a wallet that could not be read or failed. The
 * old record stays until the new one is written, and the screen shows the wallet
 * as being read until it lands.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/noir";
import { call } from "./net";

export function ReadAgain({ id, size = "sm", label = "Read again" }: { id: string; size?: "sm" | "md"; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const r = await call("POST", "/api/desk/reattribute", { id });
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(r.error);
  }

  return (
    <span className="inline-flex min-w-0 flex-col items-start gap-2">
      <Button variant="outline" size={size} icon="refresh" busy={busy} onClick={go}>
        {busy ? "Reading…" : label}
      </Button>
      {error ? (
        <span role="alert" className="text-small font-medium">
          {error}
        </span>
      ) : null}
    </span>
  );
}
