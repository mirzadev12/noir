"use client";

/**
 * LoadRecorded — fill an empty desk with the recorded cases in one step
 * (`lib/recorded-cases.ts`). It sends the same paste an officer would, through
 * the same intake, so the desk treats these wallets like any others: each is
 * answered from its recorded chain read and stamped Recorded.
 *
 * Shown only in recorded mode, and only while nothing is filed.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Heading, Text } from "@/components/noir";
import { count } from "@/lib/noir-format";
import { call } from "./net";

export function LoadRecorded({ text, wallets, cases }: { text: string; wallets: number; cases: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const r = await call("POST", "/api/desk", { text });
    if (r.ok) {
      router.refresh();
      return;
    }
    setBusy(false);
    setError(r.error);
  }

  return (
    <div className="mt-8 flex min-w-0 flex-col items-start gap-4 rounded-control border border-rule-strong bg-paper-2 p-5 md:p-6">
      <Heading level={3} size="lead">
        Or start from the recorded cases
      </Heading>
      <Text tone="soft" className="max-w-prose">
        {count(wallets)} wallets NOIR has already read: real TRON and Ethereum wallets whose chain reads are kept in this build, and one
        Bitcoin address it screens but does not trace. They are filed under {count(cases)} sample case references, because no case file
        came with the recordings. Each can be removed from its own page.
      </Text>
      <Button icon="arrow-right" busy={busy} onClick={go}>
        {busy ? "Filing…" : "Load the recorded cases"}
      </Button>
      {error ? (
        <span role="alert" className="text-small font-medium">
          {error}
        </span>
      ) : null}
    </div>
  );
}
