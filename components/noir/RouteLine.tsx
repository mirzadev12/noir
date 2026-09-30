/**
 * RouteLine — stops on a line. The way NOIR draws anything that goes somewhere:
 * the route a wallet's money took to a VASP, and the stops a request has
 * reached (drafted, sent, answered).
 *
 * Props
 *   stops        [{ key, title, detail?, meta?, tone?, children? }]. `title` is the
 *                stop's name, `detail` an address or figure under it, `meta` a small
 *                line, `children` anything more (a form, for the stop still to come)
 *   orientation  "responsive" (default: vertical on a phone, horizontal from md up)
 *                | "vertical" (always; for stops with a lot to say)
 *   draw         draw the line once on load, origin to terminus. The only motion
 *                NOIR has besides state changes; it is instant for anyone who asks
 *                for reduced motion
 *   terminus     how the last stop of a route is drawn: "station" (a large black
 *                square) | "sign" (a yellow destination block — use only where the
 *                screen has no other yellow)
 *
 * Stop tones — a route: "origin" (the wallet), "via" (a wallet on the way),
 * "terminus" (the account at the VASP). A request's line: "done" (already
 * happened), "current" (where it is now), "next" (what can be recorded next).
 * Tone changes the station's shape, never its colour.
 */

import { Fragment } from "react";

export type StopTone = "origin" | "via" | "terminus" | "done" | "current" | "next";

export interface RouteStopView {
  key: string;
  title: React.ReactNode;
  detail?: React.ReactNode;
  meta?: React.ReactNode;
  tone?: StopTone;
  children?: React.ReactNode;
}

const STATION: Record<StopTone, string> = {
  origin: "size-6 bg-ink",
  via: "size-4 border-2 border-signal bg-paper",
  terminus: "size-8 rule-box bg-signal",
  done: "size-5 bg-ink",
  current: "size-8 bg-ink",
  next: "size-5 rule-box-dashed bg-paper",
};

export function RouteLine({
  stops,
  orientation = "responsive",
  draw = false,
  terminus = "station",
}: {
  stops: RouteStopView[];
  orientation?: "responsive" | "vertical";
  draw?: boolean;
  terminus?: "station" | "sign";
}) {
  const horizontal = orientation === "responsive";
  const last = stops.length - 1;
  return (
    <ol className={`flex min-w-0 flex-col ${horizontal ? "md:flex-row" : ""}`}>
      {stops.map((stop, i) => {
        const tone = stop.tone ?? (i === 0 ? "origin" : i === last ? "terminus" : "via");
        const asSign = terminus === "sign" && tone === "terminus";
        const style = { "--stop": i } as React.CSSProperties;
        return (
          <li key={stop.key} className={`flex min-w-0 flex-1 gap-4 ${horizontal ? "md:flex-col md:gap-3" : ""}`}>
            <div className={`flex w-8 shrink-0 flex-col items-center ${horizontal ? "md:h-8 md:w-auto md:flex-row md:items-center" : ""}`}>
              <span className={`shrink-0 ${STATION[tone]} ${draw ? "route-arrive" : ""}`} style={style} aria-hidden="true" />
              {i < last ? (
                <span
                  aria-hidden="true"
                  style={style}
                  className={`flex-1 route-bar-y ${horizontal ? "max-md:min-h-6 md:route-bar-x" : "min-h-6"} ${draw ? (horizontal ? "route-draw-y md:route-draw-x" : "route-draw-y") : ""}`}
                />
              ) : null}
            </div>
            <div className={`min-w-0 flex-1 ${i < last ? "pb-8" : ""} ${horizontal ? "md:pb-0 md:pr-4" : ""} ${draw ? "route-arrive" : ""}`} style={style}>
              {asSign ? (
                <div className="on-ink bg-navy p-4 text-on-ink md:p-5">
                  <div className="type-sign-black text-title wrap-anywhere">{stop.title}</div>
                  {stop.detail ? <div className="mt-2 text-small font-medium">{stop.detail}</div> : null}
                  {stop.meta ? <div className="mt-1 text-small">{stop.meta}</div> : null}
                </div>
              ) : (
                <Fragment>
                  <div className={`type-sign wrap-anywhere ${tone === "current" ? "text-title" : "text-lead"} ${tone === "next" ? "text-ink-soft" : ""}`}>{stop.title}</div>
                  {stop.detail ? <div className="mt-1 min-w-0 text-small">{stop.detail}</div> : null}
                  {stop.meta ? <div className="mt-1 text-small text-ink-soft">{stop.meta}</div> : null}
                </Fragment>
              )}
              {stop.children ? <div className="mt-3">{stop.children}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
