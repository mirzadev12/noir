/**
 * Hero — the landing's first viewport, in NOIR's own composition: the claim
 * set centred across the page like the header of a departures hall, and
 * beneath it the board itself, full width, with the route lanes running behind
 * it. The board is computed from the recorded cases; nothing is typed in.
 */

import { ButtonLink } from "@/components/noir";
import { amount, chainCode } from "@/lib/noir-format";
import { walletCounts } from "@/lib/noir-view";
import { DeparturesBoard, type BoardLine } from "./DeparturesBoard";
import { Lanes } from "./Lanes";
import type { RecordedDesk } from "./recorded";

export function Hero({ desk }: { desk: RecordedDesk }) {
  const lines: BoardLine[] = desk.rows.map((row, i) => ({
    vasp: row.vasp,
    via: [...new Set(row.wallets.map((w) => chainCode(w.chain)))],
    wallets: walletCounts(row).wallets,
    usdt: amount(row.outboundUsdt + row.inboundUsdt),
    status: i === 0 ? "Write next" : row.request ? "Requested" : "On the desk",
  }));

  return (
    <section className="min-w-0 pb-6 pt-12 md:pt-20">
      <div className="@container mx-auto min-w-0 max-w-5xl text-center">
        <h1 className="type-sign-black rise text-display leading-[0.98] text-ink">
          <span className="block whitespace-nowrap">Every unknown wallet</span>
          <span className="text-gradient block whitespace-nowrap pb-2">has a destination.</span>
        </h1>
        <p className="rise mx-auto mt-7 max-w-prose text-lead text-ink-soft" style={{ ["--rise" as string]: 1 }}>
          NOIR follows each wallet forward to <strong className="font-bold text-ink">the exchange account that received its money</strong> and back to{" "}
          <strong className="font-bold text-ink">the exchange that funded it</strong>, then files it there, so every exchange gets{" "}
          <strong className="font-bold text-ink">one request for all its cases</strong>.
        </p>
        <div className="rise mt-9 flex flex-wrap justify-center gap-3" style={{ ["--rise" as string]: 2 }}>
          <ButtonLink href="/desk" icon="arrow-right">
            Open the desk
          </ButtonLink>
          <ButtonLink href="#file" variant="outline" icon="arrow-down">
            Paste a wallet
          </ButtonLink>
        </div>
      </div>

      <div className="rise relative mt-16 min-w-0 md:mt-20" style={{ ["--rise" as string]: 3 }}>
        <Lanes />
        <div className="relative mx-auto max-w-5xl">
          <DeparturesBoard lines={lines} total={{ wallets: desk.wallets, vasps: desk.vasps }} />
        </div>
      </div>
    </section>
  );
}
