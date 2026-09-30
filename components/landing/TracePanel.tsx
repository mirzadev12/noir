/**
 * TracePanel — the landing's picture of what NOIR does: one real wallet,
 * traced both ways. The exchange that funded it on the left, the wallet, and
 * where its money went on the right, drawn from a recorded chain read and
 * attributed exactly as the desk attributes a filed wallet (`lib/landing.ts`).
 * Beneath the graph, the transfers that read held pass as a ticker.
 *
 * Nothing in it is typed in: the names, the addresses, the amounts, the hashes
 * and the moment it was read all come from the recording.
 *
 * Props
 *   trace  the recorded trace, from `landingTrace()`
 */

import { ChainBadge, Icon, Live, Mono, TraceGraph } from "@/components/noir";
import type { LandingTrace } from "@/lib/landing";
import { amount, count, shortAddress, utc, utcDay } from "@/lib/noir-format";
import { traceGraphOf } from "@/lib/trace-graph";

/** What the graph shows, in one sentence built from the record. */
function caption(trace: LandingTrace): string {
  const { record: r, listed } = trace;
  const parts: string[] = [];
  if (r.inbound.length > 0) parts.push(`${r.inbound.map((f) => f.vasp).join(" and ")} funded ${r.inbound.reduce((n, f) => n + f.payers, 0) === 1 ? "one of its payers" : "its payers"}`);
  const out = r.outbound;
  const route = out?.route ?? [];
  if (out) {
    const hops = Math.max(0, route.length - 2);
    const of = route.length ? ` of the ${amount(route[0].usdt)} USDT traced` : " USDT";
    parts.push(`${amount(out.usdt)}${of} reached ${out.kind === "exchange_deposit" ? `a customer account at ${out.vasp}` : `${out.vasp}’s own wallet`}${hops ? ` through ${hops === 1 ? "one hop" : `${hops} hops`}` : ""}`);
  }
  if (listed) parts.push(`${typeof listed.usdt === "number" ? `${amount(listed.usdt)} ` : "part of it "}reached an address on the OFAC list`);
  return `${parts.join("; ")}.`;
}

export function TracePanel({ trace }: { trace: LandingTrace }) {
  const model = traceGraphOf(trace.record, trace.listed);
  if (!model) return null;
  const { record, transfers } = trace;
  const filedUnder = [...new Set([...record.inbound.map((f) => f.vasp), ...(record.outbound ? [record.outbound.vasp] : [])])];
  const items = transfers.map((t) => (
    <li key={t.txHash} className="flex shrink-0 items-center gap-3 whitespace-nowrap pr-10">
      <span className="type-mono text-ink-faint">{t.txHash.slice(0, 10)}…</span>
      <span className="type-mono font-bold text-ink">{amount(t.usdt)} USDT</span>
      <span className="type-mono inline-flex items-center gap-1.5 text-ink-soft">
        {shortAddress(t.from)}
        <Icon name="arrow-right" size="sm" className="text-signal" />
        {shortAddress(t.to)}
      </span>
      <span className="text-ink-faint">{utcDay(t.at)}</span>
    </li>
  ));

  return (
    <Live>
      <figure className="glow min-w-0 rounded-control bg-paper-2 text-left" aria-label="A recorded wallet, traced both ways">
        <div className="hair-b flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 md:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Icon name="route" size="md" className="text-signal" />
            <span className="type-sign text-lead tracking-wide">Trace</span>
            <ChainBadge chain={record.chain} />
            <Mono size="small">{shortAddress(record.wallet)}</Mono>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-2 text-small font-bold text-ok">
              <span className="breathe inline-block size-2 rounded-full bg-ok" aria-hidden="true" />
              Recorded
            </span>
            <span className="type-mono whitespace-nowrap text-small text-ink-soft">read {utc(record.provenance.generatedAt)}</span>
          </div>
        </div>

        <div className="px-5 py-6 md:px-6 md:py-7">
          <TraceGraph model={model} chain={record.chain} />
        </div>

        {transfers.length > 0 ? (
          <div className="hair-t flex min-w-0 items-center gap-4 py-3 pl-5 text-small md:pl-6">
            <span className="type-label shrink-0 text-ink-faint">Transfers read</span>
            <div className="fade-x min-w-0 flex-1 overflow-hidden">
              {/* Two copies, so the run loops without a seam; the second is for the eye only. */}
              <div className="ticker flex w-max">
                <ul className="flex" aria-label={`The ${count(transfers.length)} transfers the recorded chain read held`}>
                  {items}
                </ul>
                <ul className="flex" aria-hidden="true">
                  {items}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        <figcaption className="hair-t px-5 py-4 text-small text-ink-soft md:px-6">
          A real wallet, not an illustration: {caption(trace)} {count(record.provenance.responseHashes.length)} chain responses, each hashed.
          {filedUnder.length > 0 ? ` The desk files it under ${filedUnder.join(" and ")}.` : ""}
        </figcaption>
      </figure>
    </Live>
  );
}
