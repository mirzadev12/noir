/**
 * VaspRowItem — one VASP on the desk, drawn like a line on a sign board: its
 * name large and heavy, what is filed under it, what has been asked of it, and
 * how much USDT went each way. The whole row is one link to the VASP's page (the
 * name is the link; its box is stretched over the row), so a phone user taps
 * anywhere on it.
 *
 * What it prints, and where it comes from:
 *  - wallets out / in and cases: the row's `wallets` and `caseRefs`
 *  - USDT out / in: `outboundUsdt` and `inboundUsdt`, as counted by the desk
 *  - FIU-IND: a tag only when the annexure lists the VASP; absence is never stated
 *  - request: the latest request's status and the day it was sent, or "No request yet"
 *  - "N filed since request": wallets filed after the request was drafted
 */

import Link from "next/link";
import { Figure, Icon, Tag } from "@/components/noir";
import type { VaspRow } from "@/lib/desk-types";
import { amount, count, vaspHref } from "@/lib/noir-format";
import { eventTime, sentAndAnswered, statusOf, walletCounts } from "@/lib/noir-view";
import { StatusTag } from "./StatusTag";

export function VaspRowItem({ row }: { row: VaspRow }) {
  const c = walletCounts(row);
  const request = row.request;
  const sent = request ? sentAndAnswered(request).sent : null;
  const since = request ? row.uncoveredEntryIds.length : 0;

  return (
    <li className="group hair-b relative grid min-w-0 gap-x-8 gap-y-4 py-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:items-start">
      <div className="min-w-0">
        <h3 className="type-sign-black text-title wrap-anywhere">
          <Link
            href={vaspHref(row.vasp)}
            className="inline-flex items-center gap-3 text-ink no-underline transition-colors after:absolute after:inset-0 group-hover:text-route hover:no-underline"
          >
            {row.vasp}
            <Icon name="arrow-right" size="lg" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
          </Link>
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {row.fiu ? <Tag title="Listed in the FIU-IND annexure of 4 December 2023">FIU-IND listed</Tag> : null}
          {request ? <StatusTag status={statusOf(request)} /> : <Tag tone="quiet">No request yet</Tag>}
          {request && sent ? <span className="text-small text-ink-soft">sent {eventTime(sent)}</span> : null}
        </div>
        {since > 0 ? <p className="mt-2 text-small font-bold">{count(since)} filed since request</p> : null}
      </div>

      <Figure
        label="Wallets"
        value={count(c.wallets)}
        note={`${count(c.outbound)} outbound · ${count(c.inbound)} inbound · ${row.caseRefs.length === 1 ? "1 case" : `${count(row.caseRefs.length)} cases`}`}
      />

      <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-1">
        <Figure size="sm" label="USDT out" value={amount(row.outboundUsdt)} />
        <Figure size="sm" label="USDT in" value={amount(row.inboundUsdt)} />
      </div>
    </li>
  );
}
