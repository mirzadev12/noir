"use client";

/**
 * DeparturesBoard — the landing's picture of NOIR at work: the desk drawn as an
 * airport departures board, because that is what it is. Every wallet has a
 * destination; the board lists the destinations (VASPs), the chain each route
 * runs on, how many wallets are headed there, and whether a request has gone.
 *
 * Every row is real: computed from the recorded cases in data/ (see
 * ./recorded.ts) and labelled as recorded. Names flip in like a split-flap sign
 * and the status light breathes; both stop under reduced motion. The clock is
 * UTC and renders only after mount, so the server and the browser never
 * disagree about the time.
 */

import { useEffect, useState } from "react";

export interface BoardLine {
  vasp: string;
  via: string[];
  wallets: number;
  /** USDT that moved between these wallets and the VASP, both directions, formatted. */
  usdt: string;
  status: string;
}

function Flap({ text, row }: { text: string; row: number }) {
  return (
    <span aria-label={text} className="inline-flex">
      {[...text].map((ch, i) => (
        <span key={i} aria-hidden="true" className="flap-in" style={{ ["--flap" as string]: i, ["--row" as string]: row }}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().slice(11, 16));
    tick();
    const t = setInterval(tick, 15_000);
    return () => clearInterval(t);
  }, []);
  return <span className="type-mono whitespace-nowrap text-small text-ink-soft">{now ? `${now} UTC` : " "}</span>;
}

export function DeparturesBoard({ lines, total }: { lines: BoardLine[]; total: { wallets: number; vasps: number } }) {
  return (
    <figure className="glow min-w-0 rounded-control bg-paper-2 p-5 md:p-6" aria-label="The desk as a departures board, from the recorded cases">
      <div className="hair-b flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-4">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="size-6 text-signal" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 12h17M13 5l7 7-7 7" />
          </svg>
          <span className="type-sign text-lead tracking-wide">Departures</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-small font-bold text-ok">
            <span className="breathe inline-block size-2 rounded-full bg-ok" aria-hidden="true" />
            Recorded
          </span>
          <Clock />
        </div>
      </div>

      <table className="mt-2 w-full border-collapse text-left">
        <caption className="sr-only">
          VASPs the recorded wallets route to, the chains they run on, how many wallets, and whether a request has gone
        </caption>
        <thead>
          <tr className="type-label text-ink-faint">
            <th scope="col" className="py-3 pr-3 font-bold">Destination</th>
            <th scope="col" className="hidden py-3 pr-3 font-bold sm:table-cell">Via</th>
            <th scope="col" className="py-3 pr-3 text-right font-bold">Wallets</th>
            <th scope="col" className="hidden py-3 pr-6 text-right font-bold md:table-cell">USDT</th>
            <th scope="col" className="py-3 font-bold">Status</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.vasp} className={`hair-t ${i === 0 ? "bg-paper-3" : ""}`}>
              <td className="type-mono py-3 pr-3 text-lead font-bold text-ink">
                <Flap text={l.vasp.toUpperCase()} row={i} />
              </td>
              <td className="type-mono hidden py-3 pr-3 text-small text-ink-soft sm:table-cell">{l.via.join(" · ")}</td>
              <td className="type-mono py-3 pr-3 text-right text-lead text-ink">{l.wallets}</td>
              <td className="type-mono hidden py-3 pr-6 text-right text-small text-ink-soft md:table-cell">{l.usdt}</td>
              <td className="py-3">
                <span className={`type-label ${i === 0 ? "text-route" : "text-wait"}`}>{l.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <figcaption className="hair-t mt-2 pt-4 text-small text-ink-soft">
        {total.wallets} recorded wallets, {total.vasps} destinations. The desk shows yours.
      </figcaption>
    </figure>
  );
}
