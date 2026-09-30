"use client";

/**
 * VaspBoard — every VASP on the desk as one departure board: a single header,
 * one row per VASP, read left to right like a line on a platform sign. The
 * officer narrows it by where each request stands (no request, drafted,
 * awaiting a reply, answered) or by typing a VASP name or any part of a wallet
 * address. Each row is one link to the VASP's page.
 *
 * Rows come computed from the server (lib/desk-board.ts); this only filters.
 * Zeros print as a dash so the eye lands on what exists.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon, Tag, TextInput } from "@/components/noir";
import {
  filterBoard,
  boardCounts,
  type BoardFilter,
  type BoardRow,
} from "@/lib/desk-board";
import { amount, count, utcDay, vaspHref } from "@/lib/noir-format";
import { StatusTag } from "./StatusTag";

const FILTERS: { id: BoardFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "none", label: "No request yet" },
  { id: "drafted", label: "Drafted" },
  { id: "awaiting", label: "Awaiting a reply" },
  { id: "answered", label: "Answered" },
];

const flapName = (name: string, row: number) => (
  <span aria-label={name}>
    {[...name.toUpperCase()].map((ch, i) => (
      <span
        key={i}
        aria-hidden="true"
        className="flap-in"
        style={{ ["--flap" as string]: i, ["--row" as string]: row }}
      >
        {ch === " " ? " " : ch}
      </span>
    ))}
  </span>
);

const dash = (n: number, show: (n: number) => string) => (n ? show(n) : "—");

export function VaspBoard({ rows }: { rows: BoardRow[] }) {
  const [filter, setFilter] = useState<BoardFilter>("all");
  const [query, setQuery] = useState("");
  const counts = useMemo(() => boardCounts(rows), [rows]);
  const shown = useMemo(
    () => filterBoard(rows, filter, query),
    [rows, filter, query],
  );

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div
          role="group"
          aria-label="Show VASPs by request"
          className="flex flex-wrap gap-2"
        >
          {FILTERS.filter((f) => f.id === "all" || counts[f.id] > 0).map(
            (f) => {
              const on = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(f.id)}
                  className={`type-label inline-flex min-h-9 cursor-pointer items-center gap-2 px-3 transition-colors ${
                    on
                      ? "rule-box bg-navy text-on-ink"
                      : "hair-box bg-paper text-ink-soft hover:text-ink"
                  }`}
                >
                  {f.label}
                  <span className="type-mono">{count(counts[f.id])}</span>
                </button>
              );
            },
          )}
        </div>
        <label className="flex min-w-0 items-center gap-2 lg:w-80">
          <span className="sr-only">Find a VASP or a wallet</span>
          <TextInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a VASP or a wallet"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </div>

      <p className="sr-only" aria-live="polite">
        {count(shown.length)} of {count(rows.length)} VASPs shown
      </p>

      {shown.length === 0 ? (
        <div className="mt-6 hair-t hair-b py-8">
          <p className="type-sign text-lead">Nothing matches.</p>
          <p className="mt-1 text-ink-soft">
            No VASP on the desk matches{query ? ` "${query.trim()}"` : ""}
            {filter !== "all"
              ? ` under "${FILTERS.find((f) => f.id === filter)?.label}"`
              : ""}
            .{" "}
            <button
              type="button"
              className="cursor-pointer text-route underline"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
            >
              Show every VASP
            </button>
          </p>
        </div>
      ) : (
        <div className="mt-6 min-w-0 overflow-hidden rounded-control border border-rule-strong bg-paper-2">
          <div className="hair-b flex items-center justify-between gap-4 px-4 py-3 md:px-5">
            <span className="flex items-center gap-2.5">
              <Icon name="arrow-right" className="text-signal" />
              <span className="type-sign text-lead">Departures</span>
            </span>
            <span className="flex items-center gap-2 text-small font-bold text-ok">
              <span
                className="breathe inline-block size-2 rounded-full bg-ok"
                aria-hidden="true"
              />
              Your desk
            </span>
          </div>

          {/* Phones: one card per VASP, the name and its request over a 2 x 2 grid. */}
          <ul className="sm:hidden">
            {shown.map((r, row) => (
              <li
                key={r.vasp}
                className="group relative hair-t px-4 py-4 first:border-t-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={vaspHref(r.vasp)}
                    className="type-mono text-lead font-bold text-ink no-underline after:absolute after:inset-0 hover:no-underline"
                  >
                    {flapName(r.vasp, row)}
                  </Link>
                  {r.status ? (
                    <StatusTag status={r.status} />
                  ) : (
                    <Tag tone="wait">No request yet</Tag>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-small">
                  <div>
                    <dt className="text-ink-faint">Wallets out · in</dt>
                    <dd className="type-mono text-ink">
                      {dash(r.outbound, count)} · {dash(r.inbound, count)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">Cases</dt>
                    <dd className="type-mono text-ink">
                      {dash(r.cases, count)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">USDT out</dt>
                    <dd className="type-mono text-ink">
                      {dash(r.usdtOut, amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">USDT in</dt>
                    <dd className="type-mono text-ink">
                      {dash(r.usdtIn, amount)}
                    </dd>
                  </div>
                </dl>
                {r.sentOn || r.filedSince > 0 ? (
                  <p className="mt-2 text-small text-ink-soft">
                    {r.sentOn ? `sent ${utcDay(r.sentOn)}` : ""}
                    {r.sentOn && r.filedSince > 0 ? " · " : ""}
                    {r.filedSince > 0 ? (
                      <strong className="text-wait">
                        {count(r.filedSince)} filed since
                      </strong>
                    ) : null}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="hidden px-4 sm:block md:px-5">
            <table className="noir-table">
              <caption className="sr-only">
                VASPs on the desk, with the wallets routed to each and where its
                request stands
              </caption>
              <thead>
                <tr>
                  <th scope="col">VASP</th>
                  <th scope="col" data-align="end">
                    Wallets out · in
                  </th>
                  <th scope="col" data-align="end">
                    Cases
                  </th>
                  <th scope="col" data-align="end">
                    USDT out
                  </th>
                  <th scope="col" data-align="end">
                    USDT in
                  </th>
                  <th scope="col">Request</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, row) => (
                  <tr
                    key={r.vasp}
                    className="group relative transition-colors hover:bg-paper-3 focus-within:bg-paper-3"
                  >
                    <td data-label="">
                      <Link
                        href={vaspHref(r.vasp)}
                        className="type-mono inline-flex items-center gap-2 text-lead font-bold text-ink no-underline after:absolute after:inset-0 group-hover:text-route hover:no-underline"
                      >
                        {flapName(r.vasp, row)}
                        <Icon
                          name="arrow-right"
                          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        />
                      </Link>
                      {r.fiuListed ? (
                        <div className="mt-1">
                          <Tag
                            tone="quiet"
                            title="Listed in the FIU-IND annexure of 4 December 2023"
                          >
                            FIU-IND listed
                          </Tag>
                        </div>
                      ) : null}
                    </td>
                    <td
                      data-label="Wallets out · in"
                      data-align="end"
                      className="type-mono"
                    >
                      {dash(r.outbound, count)} · {dash(r.inbound, count)}
                    </td>
                    <td
                      data-label="Cases"
                      data-align="end"
                      className="type-mono"
                    >
                      {dash(r.cases, count)}
                    </td>
                    <td
                      data-label="USDT out"
                      data-align="end"
                      className="type-mono"
                    >
                      {dash(r.usdtOut, amount)}
                    </td>
                    <td
                      data-label="USDT in"
                      data-align="end"
                      className="type-mono"
                    >
                      {dash(r.usdtIn, amount)}
                    </td>
                    <td data-label="Request">
                      {r.status ? (
                        <StatusTag status={r.status} />
                      ) : (
                        <Tag tone="wait">No request yet</Tag>
                      )}
                      {r.sentOn ? (
                        <div className="mt-1 text-small text-ink-soft">
                          sent {utcDay(r.sentOn)}
                        </div>
                      ) : null}
                      {r.filedSince > 0 ? (
                        <div className="mt-1 text-small font-bold text-wait">
                          {count(r.filedSince)} filed since
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
