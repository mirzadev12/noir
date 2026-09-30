/**
 * WalletTrace — one filed wallet as a fund-flow graph, at the head of its page:
 * the exchanges that funded it, the wallet, and where its money went, with an
 * OFAC-listed address its money reached hung off it. The graph is drawn from
 * the wallet's own attribution record (`lib/trace-graph.ts`); VASP nodes open
 * their page on the desk and addresses open on a public explorer.
 *
 * A wallet on a chain NOIR does not trace has no graph, and says so; a wallet
 * that could not be read is handled by the page before it gets here.
 *
 * Props
 *   entry  the desk entry; nothing is drawn unless it has a readable record
 */

import { ChainBadge, Icon, Live, Mono, Notice, Tag, TraceGraph } from "@/components/noir";
import type { DeskEntry } from "@/lib/desk-types";
import { listedContact } from "@/lib/listed-contact";
import { count, shortAddress, utc } from "@/lib/noir-format";
import { caseRefsOf } from "@/lib/noir-view";
import { traceGraphOf } from "@/lib/trace-graph";

export function WalletTrace({ entry }: { entry: DeskEntry }) {
  const r = entry.record;
  if (!r || !r.readable) return null;
  if (!r.traced) {
    return <Notice title="Not traced">NOIR recognises this chain and screens the address against the OFAC list. It does not follow the money on it.</Notice>;
  }
  const model = traceGraphOf(r, listedContact(r));
  if (!model) return null;
  const cases = caseRefsOf(entry);

  return (
    <Live>
      <figure className="min-w-0 rounded-control border border-rule-strong bg-paper-2" aria-label="This wallet, traced both ways">
        <div className="hair-b flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 md:px-6 md:py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Icon name="route" className="text-signal" />
            <span className="type-sign text-lead tracking-wide">Trace</span>
            <ChainBadge chain={entry.chain} />
            <Mono size="small" title={entry.wallet}>
              {shortAddress(entry.wallet)}
            </Mono>
            <span className="text-small text-ink-soft">{cases.length ? cases.join(", ") : "No case reference"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {r.provenance.basis === "recorded" ? <Tag>Recorded</Tag> : <Tag tone="quiet">Live</Tag>}
            <span className="type-mono whitespace-nowrap text-small text-ink-soft">read {utc(r.provenance.generatedAt)}</span>
          </div>
        </div>
        <div className="px-4 py-6 md:px-6 md:py-7">
          <TraceGraph model={model} chain={entry.chain} linked />
        </div>
        <figcaption className="hair-t px-4 py-3 text-small text-ink-soft md:px-6">
          Drawn from this wallet’s own record: {count(r.provenance.responseHashes.length)} chain {r.provenance.responseHashes.length === 1 ? "response" : "responses"}, each hashed (listed under
          Provenance). An exchange is named only when NOIR’s own table names it.
        </figcaption>
      </figure>
    </Live>
  );
}
