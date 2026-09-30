"use client";

/**
 * RemoveWallet — take a wallet off the desk, in two steps. The first press only
 * asks; the second removes it (`DELETE /api/desk`) and returns to the desk. The
 * question says what leaves with it: the wallet's record and its place in any
 * letter that covered it. Requests already drafted keep their history.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Notice } from "@/components/noir";
import { call } from "./net";

export function RemoveWallet({ id }: { id: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setProblem(null);
    const r = await call("DELETE", "/api/desk", { id });
    if (r.ok) {
      router.push("/desk");
      return;
    }
    setBusy(false);
    setProblem(r.error);
  }

  if (!asking) {
    return (
      <Button variant="outline" icon="trash" onClick={() => setAsking(true)}>
        Take off the desk
      </Button>
    );
  }
  return (
    <div className="flex min-w-0 max-w-prose flex-col gap-4">
      <Notice tone="caution" title="Take this wallet off the desk?">
        Its record leaves the desk, and it leaves the letter of any request that covered it. Requests already drafted keep their history. This cannot be undone; the wallet can be filed again.
      </Notice>
      {problem ? <Notice tone="stop">{problem}</Notice> : null}
      <div className="flex flex-wrap gap-3">
        <Button icon="trash" busy={busy} onClick={remove}>
          {busy ? "Removing…" : "Yes, take it off"}
        </Button>
        <Button variant="outline" onClick={() => setAsking(false)} disabled={busy}>
          Keep it
        </Button>
      </div>
    </div>
  );
}
