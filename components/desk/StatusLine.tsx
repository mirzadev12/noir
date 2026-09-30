/**
 * StatusLine — a request's history as stops on a line: drafted, sent, and each
 * answer the VASP gave, oldest first, ending in the stop still to come, which
 * holds the form to record it. Each stop says when (the day the officer gave, or
 * the UTC moment it was recorded), who recorded it and on what basis, and the
 * reference and note as typed.
 *
 * NOIR sends nothing. The line records what the officer did and what came back.
 */

import { Mono, RouteLine, type RouteStopView } from "@/components/noir";
import type { VaspRequest } from "@/lib/desk-types";
import { actorBasis, actorName } from "@/lib/identity";
import { eventTime, statusOf } from "@/lib/noir-view";
import { STATUS_LABEL } from "@/lib/requests";
import { StatusForm } from "./StatusForm";

export function StatusLine({ request }: { request: VaspRequest }) {
  const current = statusOf(request);
  const last = request.history.length - 1;

  const stops: RouteStopView[] = request.history.map((h, i) => ({
    key: `${h.status}-${h.at}-${i}`,
    tone: i === last ? "current" : "done",
    title: STATUS_LABEL[h.status],
    meta: (
      <>
        {eventTime(h)}
        {h.by.id ? ` · ${actorName(h.by)} (${actorBasis(h.by)})` : ""}
      </>
    ),
    detail:
      h.reference || h.note ? (
        <span className="flex min-w-0 flex-col gap-1">
          {h.reference ? (
            <span>
              Reference <Mono whole>{h.reference}</Mono>
            </span>
          ) : null}
          {h.note ? <span className="text-ink-soft">{h.note}</span> : null}
        </span>
      ) : undefined,
  }));

  stops.push({
    key: "next",
    tone: "next",
    title: current === "drafted" ? "Record it as sent" : "Record the VASP’s answer",
    children: <StatusForm requestId={request.id} current={current} />,
  });

  return <RouteLine stops={stops} orientation="vertical" />;
}
