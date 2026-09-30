/**
 * Hero — the landing's first viewport, in NOIR's own composition: a lit hall
 * at night. The claim is set centred across it like the header of a departures
 * hall, the route lanes run through it, and the board itself stands at its far
 * end, stepping out past the hall's lower edge. The board is computed from the
 * recorded cases; nothing is typed in.
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
    <section className="relative min-w-0">
      {/* The hall. It ends above the board's foot, so the board stands half in it and half on the page. */}
      <div aria-hidden="true" className="stage pointer-events-none absolute inset-x-0 bottom-24 top-0 overflow-hidden md:bottom-32">
        <Lanes className="inset-x-0 bottom-0 top-[58%]" />
      </div>

      <div className="@container relative mx-auto min-w-0 max-w-5xl px-3 pt-14 text-center md:px-10 md:pt-24">
        <h1 className="type-sign-black rise text-display leading-[0.98] text-ink">
          <span className="block whitespace-nowrap">Every unknown wallet</span>
          <span className="text-gradient block whitespace-nowrap pb-2">has a destination.</span>
        </h1>
        <p className="rise mx-auto mt-7 max-w-prose px-2 text-lede text-ink-soft md:px-0" style={{ ["--rise" as string]: 1 }}>
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

      <div className="rise relative mx-auto mt-12 min-w-0 max-w-5xl px-3 md:mt-16 md:px-10" style={{ ["--rise" as string]: 3 }}>
        <DeparturesBoard lines={lines} total={{ wallets: desk.wallets, vasps: desk.vasps }} />
      </div>
    </section>
  );
}
