/**
 * RouteOf — a wallet's outbound route drawn as a line: the wallet, any wallets
 * its money passed through, and the account at the VASP it reached.
 *
 * It states nothing the record does not: the stops are `outbound.route` (each
 * with the USDT of the wallet's money that reached it), the terminus carries
 * the record's own confidence as words (`evidenceWord`) and its evidence tier.
 * A record written before routes were kept has no `route`; the line then shows
 * only the wallet and the account, and says so.
 *
 * Props
 *   record      the attribution record; nothing is drawn unless it has an outbound VASP
 *   draw        draw the line once on load
 *   terminus    "station" (a black square) or "sign" (the yellow destination block; use only where the screen has no other yellow)
 *   orientation "responsive" (horizontal from md up) or "vertical"
 */

import { Mono, RouteLine, RouteLink, type RouteStopView } from "@/components/noir";
import type { AttributionRecord, RouteStop } from "@/lib/desk-types";
import { evidenceWord, explorerHref, shortAddress, tierName, usdt } from "@/lib/noir-format";

function AddressLink({ chain, address, short }: { chain: string; address: string; short: boolean }) {
  const href = explorerHref(chain, address);
  const text = short ? shortAddress(address) : address;
  return href ? (
    <RouteLink href={href} external mono title={address}>
      {text}
    </RouteLink>
  ) : (
    <Mono title={address}>{text}</Mono>
  );
}

export function RouteOf({
  record,
  draw = false,
  terminus = "station",
  orientation = "responsive",
}: {
  record: AttributionRecord;
  draw?: boolean;
  terminus?: "station" | "sign";
  orientation?: "responsive" | "vertical";
}) {
  const out = record.outbound;
  if (!out) return null;
  const short = orientation === "responsive";
  const stops: RouteStop[] = out.route?.length
    ? out.route
    : [
        { address: record.wallet, depth: 0, label: null, usdt: out.usdt },
        { address: out.account, depth: 1, label: { entity: out.vasp, kind: out.kind }, usdt: out.usdt },
      ];
  const last = stops.length - 1;

  const view: RouteStopView[] = stops.map((stop, i) => {
    if (i === 0) {
      return {
        key: stop.address,
        tone: "origin",
        title: "The wallet",
        detail: <AddressLink chain={record.chain} address={stop.address} short={short} />,
        meta: `${usdt(stop.usdt)} traced from it`,
      };
    }
    if (i === last) {
      return {
        key: stop.address,
        tone: "terminus",
        title: out.vasp,
        detail: (
          <>
            {out.kind === "exchange_deposit" ? "Customer deposit account " : "The exchange's own wallet "}
            <AddressLink chain={record.chain} address={stop.address} short={short} />
          </>
        ),
        meta: `${usdt(stop.usdt)} reached it · ${evidenceWord(out.confidence)} · ${tierName(out.source)}`,
      };
    }
    return {
      key: stop.address,
      tone: "via",
      title: stop.label?.entity && stop.label.kind !== "victim_reported" ? stop.label.entity : "A wallet on the way",
      detail: <AddressLink chain={record.chain} address={stop.address} short={short} />,
      meta: `${usdt(stop.usdt)} passed through`,
    };
  });

  return <RouteLine stops={view} draw={draw} terminus={terminus} orientation={orientation} />;
}
