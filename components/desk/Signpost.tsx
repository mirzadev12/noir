/**
 * Signpost — one wallet drawn as a road sign at a junction: who funded it on the
 * left, the wallet in the middle, and the VASP its money went to on the right,
 * the one navy destination field of the screen. Arrows say which way each side
 * leads. On a phone the three stack, funders first.
 *
 * A side with nothing to name says why, in words: a wallet whose funders could
 * not be read says so and is never described as unfunded; a trail that ended at a
 * mixer, a contract or a listed address says where it ended.
 */

import { ChainBadge, Icon, Mono, Notice, RouteLink, Sign, Tag } from "@/components/noir";
import type { DeskEntry } from "@/lib/desk-types";
import { amount, chainName, evidenceWord, tierName, vaspHref } from "@/lib/noir-format";
import { caseRefsOf, isSanctioned, STOP_LINE } from "@/lib/noir-view";

function Funders({ entry }: { entry: DeskEntry }) {
  const r = entry.record;
  if (!r) return null;
  if (r.inboundRead === "unreadable") return <Notice tone="caution">Its funders could not be read. That is not the same as having none.</Notice>;
  if (r.inboundRead === "not-run") {
    return <p className="text-ink-soft">Funders are not looked up for {r.traced ? `${chainName(r.chain)} wallets` : "chains NOIR does not trace"}.</p>;
  }
  if (r.inbound.length === 0) return <p className="text-ink-soft">No exchange in NOIR’s table funded its payers.</p>;
  return (
    <ul className="flex flex-col">
      {r.inbound.map((f) => (
        <li key={f.vasp} className="hair-t flex min-w-0 gap-3 py-3 first:border-t-0 first:pt-0">
          <Icon name="arrow-left" className="mt-1" />
          <div className="min-w-0">
            <RouteLink href={vaspHref(f.vasp)}>
              <span className="type-sign text-lead">{f.vasp}</span>
            </RouteLink>
            <p className="text-small text-ink-soft">
              {f.payers} {f.payers === 1 ? "payer" : "payers"} · {amount(f.paidUsdt)} USDT · {evidenceWord(f.confidence)}, {tierName(f.source).toLowerCase()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Signpost({ entry }: { entry: DeskEntry }) {
  const r = entry.record;
  const out = r?.outbound ?? null;
  const cases = caseRefsOf(entry);

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.2fr)] lg:items-stretch lg:gap-6">
      <section className="min-w-0" aria-labelledby="funded-by">
        <h2 id="funded-by" className="type-sign mb-3 text-lead">
          Funded by
        </h2>
        <Funders entry={entry} />
      </section>

      <section className="rule-box flex min-w-0 flex-col gap-3 p-5" aria-label="The wallet">
        <div className="flex flex-wrap items-center gap-2">
          <ChainBadge chain={entry.chain} named />
          {isSanctioned(entry) ? (
            <Tag tone="prohibit" icon="prohibit">
              OFAC-listed
            </Tag>
          ) : null}
        </div>
        <Mono size="lead" block copy>
          {entry.wallet}
        </Mono>
        <p className="text-small text-ink-soft">{cases.length ? cases.join(", ") : "No case reference"}</p>
        <div className="mt-auto flex items-center justify-between text-ink-soft" aria-hidden="true">
          <Icon name="arrow-left" size="lg" />
          <Icon name="arrow-right" size="lg" />
        </div>
      </section>

      <section className="min-w-0" aria-label="Where its money went">
        {out ? (
          <Sign
            level={2}
            size="title"
            title={out.vasp}
            className="h-full lg:items-start"
            pointer
          >
            <span>{out.kind === "exchange_deposit" ? "Customer deposit account reached" : "The exchange’s own wallet reached"}</span>
            <span>{amount(out.usdt)} USDT</span>
            <span>
              {evidenceWord(out.confidence)} · {tierName(out.source)}
            </span>
          </Sign>
        ) : r?.outboundStop ? (
          <Notice tone={r.outboundStop === "sanctioned" ? "sanction" : "caution"} title="No VASP where its money went">
            {STOP_LINE[r.outboundStop]}
          </Notice>
        ) : r && !r.traced ? (
          <Notice title="Not traced">NOIR recognises this chain and screens the address against the OFAC list. It does not follow the money on it.</Notice>
        ) : (
          <Notice tone="caution" title="No VASP named">
            The trace reached no exchange NOIR can name.
          </Notice>
        )}
      </section>
    </div>
  );
}
