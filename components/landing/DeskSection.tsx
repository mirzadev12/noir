/**
 * DeskSection — where a traced wallet goes next: the desk, drawn as the
 * departures board it is. Every exchange the recorded wallets route to is a
 * row, with the chains its routes run on, the wallets waiting on it and the
 * USDT that moved. The route lanes run behind it. Computed from the recorded
 * cases (`./recorded.ts`); nothing is typed in.
 */

import { Heading, Live, Text } from "@/components/noir";
import { amount, chainCode } from "@/lib/noir-format";
import { walletCounts } from "@/lib/noir-view";
import { DeparturesBoard, type BoardLine } from "./DeparturesBoard";
import { Lanes } from "./Lanes";
import type { RecordedDesk } from "./recorded";

export function DeskSection({ desk }: { desk: RecordedDesk }) {
  const lines: BoardLine[] = desk.rows.map((row, i) => ({
    vasp: row.vasp,
    via: [...new Set(row.wallets.map((w) => chainCode(w.chain)))],
    wallets: walletCounts(row).wallets,
    usdt: amount(row.outboundUsdt + row.inboundUsdt),
    status: i === 0 ? "Write next" : row.request ? "Requested" : "On the desk",
  }));

  return (
    <section className="min-w-0" aria-labelledby="desk-title">
      <Heading level={2} size="headline" id="desk-title">
        Then it is filed where it routes.
      </Heading>
      <Text size="lede" tone="soft" className="mt-4 max-w-prose">
        Every traced wallet goes on one desk, under the exchange it leads to in either direction. The desk reads like a departures board: each exchange, the wallets waiting
        on it, and whether its request has gone.
      </Text>
      <Live className="relative mt-10 min-w-0">
        <Lanes />
        <div className="relative">
          <DeparturesBoard lines={lines} total={{ wallets: desk.wallets, vasps: desk.vasps }} />
        </div>
      </Live>
    </section>
  );
}
