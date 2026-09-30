/**
 * WhatNoirDoes — the plain-language answer to "what is this?", set on the
 * landing page. One paragraph for the problem an investigator has, then the
 * four stages a wallet goes through, drawn as stops on one route line. It makes
 * no claim beyond what the desk does: NOIR names the exchange to write to, drafts
 * the letter and tracks the reply; the officer sends it.
 */

import { Heading, RouteLine, type RouteStopView } from "@/components/noir";

const STAGES: RouteStopView[] = [
  { key: "file", tone: "origin", title: "1 · File", detail: "Paste wallets from any case. NOIR checks each line before it reads anything." },
  { key: "attribute", tone: "via", title: "2 · Attribute", detail: "Each wallet is followed both ways to the nearest exchange, and the evidence behind the name is shown." },
  { key: "request", tone: "via", title: "3 · One request per VASP", detail: "Wallets from every case are grouped under their exchange. You draft one letter for all of them: KYC, logs, transactions, preservation, freeze." },
  { key: "track", tone: "terminus", title: "4 · Track the reply", detail: "You send the letter. NOIR records when it went and what the exchange answered." },
];

export function WhatNoirDoes() {
  return (
    <section aria-labelledby="what-noir-does" className="min-w-0">
      <Heading level={2} size="headline" id="what-noir-does">
        How NOIR routes a wallet
      </Heading>
      <p className="mt-4 max-w-prose text-lede text-ink-soft">
        A wallet turns up in a case and nobody knows whose it is. <strong className="font-bold text-ink">NOIR tells you which exchange to write to.</strong> It follows the wallet’s money
        forward to the exchange account that received it, and back to the exchange that funded it. Then it drafts one letter per exchange, covering every wallet from every case that
        leads there.
      </p>
      <div className="mt-10">
        <RouteLine stops={STAGES} />
      </div>
    </section>
  );
}
