"use client";

/**
 * Movement — has a wallet sent USDT since NOIR read it?
 *
 * The screen asks once when it opens (`POST /api/watch`, one narrow chain
 * request per wallet) and again when the officer says so. Every wallet ends in
 * one of three states, never two: moved, not moved, or not checked because the
 * chain did not answer. A destination is named only when NOIR's own table names
 * it; otherwise the address is shown.
 *
 * The last answer is kept for this browser tab for ten minutes, so moving
 * between screens does not ask the chains again.
 *
 *   <Movement asks of>              the desk: every wallet it has read
 *   <WalletMovement ask recorded>   one wallet's page
 *
 * Props
 *   asks      the wallets to ask about, from `watchList` (lib/movement.ts)
 *   of        how many wallets the desk has read; when it is more than `asks`, the section says which were asked about
 *   ask       the one wallet to ask about
 *   recorded  the wallet is answered from a recording, which reading it again does not replace
 */

import { useCallback, useEffect, useState } from "react";
import { Button, Mono, Section, Tag } from "@/components/noir";
import { movementSummary, type MovedWallet, type WatchAsk } from "@/lib/movement";
import { amount, count, shortAddress, txHref, utc } from "@/lib/noir-format";
import type { WatchResult } from "@/lib/watch";
import { call } from "./net";
import { WalletLink } from "./WalletLink";

type Answer = { checkedAt: string; results: WatchResult[] };
type State = { phase: "checking" } | { phase: "failed"; error: string } | { phase: "done"; answer: Answer };

const KEEP_MS = 10 * 60 * 1000;
const STORE = "noir.movement";
const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;
const chainOf = (w: { address: string; chain?: string }) => w.chain ?? (/^0x/i.test(w.address) ? "ethereum" : "tron");
const signatureOf = (asks: WatchAsk[]) => asks.map((a) => `${a.chain ?? ""}:${a.address}:${a.since}`).join("|");

function remembered(signature: string): Answer | null {
  try {
    const kept = JSON.parse(sessionStorage.getItem(`${STORE}:${signature}`) ?? "null") as Answer | null;
    if (!kept) return null;
    return Date.now() - Date.parse(kept.checkedAt) < KEEP_MS ? kept : null;
  } catch {
    return null;
  }
}

function remember(signature: string, answer: Answer) {
  try {
    sessionStorage.setItem(`${STORE}:${signature}`, JSON.stringify(answer));
  } catch {
    // A tab that cannot store simply asks again next time.
  }
}

/** Asks once on mount, and again on `check(true)`. */
function useMovement(asks: WatchAsk[]) {
  const signature = signatureOf(asks);
  const [state, setState] = useState<State>({ phase: "checking" });

  const check = useCallback(
    async (fresh: boolean) => {
      if (signature === "") return;
      const kept = fresh ? null : remembered(signature);
      if (kept) {
        setState({ phase: "done", answer: kept });
        return;
      }
      setState({ phase: "checking" });
      const r = await call<Answer>("POST", "/api/watch", { items: asks });
      if (!r.ok) {
        setState({ phase: "failed", error: r.error });
        return;
      }
      remember(signature, r.data);
      setState({ phase: "done", answer: r.data });
    },
    // The signature stands for the list: the same wallets read at the same moments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );

  useEffect(() => {
    const t = setTimeout(() => void check(false), 0);
    return () => clearTimeout(t);
  }, [check]);

  return { state, check };
}

/** What a moved wallet sent, and where its latest transfer went. */
function MovedLines({ m, readAt }: { m: MovedWallet; readAt: string | undefined }) {
  const href = txHref(chainOf(m), m.latest.txHash);
  return (
    <div className="min-w-0">
      <p>
        Sent {m.complete ? "" : "at least "}
        <strong className="type-mono">{amount(m.usdt)} USDT</strong> in{" "}
        {m.complete ? plural(m.transfers, "transfer") : `${count(m.transfers)} or more transfers`}
        {readAt ? ` since it was read on ${utc(readAt)}` : " since it was read"}.
        {m.complete ? "" : " One check reads only a wallet's most recent transfers, so both figures are a floor."}
      </p>
      <p className="mt-1 text-small text-ink-soft">
        Latest: {amount(m.latest.valueUsdt)} USDT to {m.latest.toPhrase ? <strong className="text-ink">{m.latest.toPhrase}</strong> : null}
        {m.latest.toPhrase ? " (" : ""}
        <Mono size="small">{shortAddress(m.latest.to)}</Mono>
        {m.latest.toPhrase ? ")" : ""} on {utc(m.latest.timestamp)}
        {href ? (
          <>
            {" · "}
            <a href={href} target="_blank" rel="noreferrer">
              transaction
            </a>
          </>
        ) : null}
        .
      </p>
    </div>
  );
}

function Asking({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-ink-soft">
      <span aria-hidden className="breathe inline-block size-2 shrink-0 rounded-full bg-signal" />
      {children}
    </p>
  );
}

function CheckAgain({ state, check }: { state: State; check: (fresh: boolean) => Promise<void> }) {
  if (state.phase === "checking") return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <Button variant="outline" size="sm" icon="refresh" onClick={() => void check(true)}>
        Check again
      </Button>
      {state.phase === "done" ? <span className="text-small text-ink-faint">Checked {utc(state.answer.checkedAt)}</span> : null}
    </div>
  );
}

export function Movement({ asks, of = asks.length }: { asks: WatchAsk[]; of?: number }) {
  const { state, check } = useMovement(asks);
  if (asks.length === 0) return null;
  const summary = state.phase === "done" ? movementSummary(state.answer.results) : null;

  return (
    <Section
      title="Moved since it was read"
      count={of > asks.length ? `${count(asks.length)} of ${count(of)} wallets` : plural(asks.length, "wallet")}
      note={`An attribution is true as of the moment the chain was read. NOIR asks each chain whether these wallets have sent USDT since, and names where it went only when its own table can.${
        of > asks.length ? ` One check covers ${count(asks.length)} wallets: the ones with the most traced money.` : ""
      }`}
    >
      <div aria-live="polite" className="min-w-0">
        {state.phase === "checking" ? <Asking>Asking the chains about {plural(asks.length, "wallet")}…</Asking> : null}

        {state.phase === "failed" ? (
          <p role="alert" className="max-w-prose">
            The check could not be made, so nothing is stated about these wallets. {state.error}
          </p>
        ) : null}

        {summary && summary.moved.length > 0 ? (
          <ul className="rule-t">
            {summary.moved.map((m) => (
              <li key={`${chainOf(m)}:${m.address}`} className="hair-b grid min-w-0 gap-2 py-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6">
                <div className="flex min-w-0 flex-col items-start gap-2">
                  <WalletLink wallet={m.address} chain={chainOf(m)} short />
                  <Tag tone="wait">Moved</Tag>
                </div>
                <MovedLines m={m} readAt={asks.find((a) => a.address === m.address && a.chain === m.chain)?.since} />
              </li>
            ))}
          </ul>
        ) : null}

        {summary ? (
          <p className={`max-w-prose text-ink-soft ${summary.moved.length > 0 ? "mt-4" : ""}`}>
            {[
              summary.moved.length === 0 && summary.still > 0 ? "No wallet that could be checked has sent USDT since it was read." : null,
              summary.moved.length > 0 && summary.still > 0
                ? `${plural(summary.still, "wallet has", "wallets have")} not sent USDT since ${summary.still === 1 ? "it was" : "they were"} read.`
                : null,
              summary.unchecked > 0
                ? `${plural(summary.unchecked, "wallet")} could not be checked: the chain did not answer, so nothing is stated about ${summary.unchecked === 1 ? "it" : "them"}.`
                : null,
              summary.moved.length > 0
                ? "To file where new money went, open the wallet and read it again; a wallet answered from a recording keeps that recording."
                : null,
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        ) : null}
      </div>
      <CheckAgain state={state} check={check} />
    </Section>
  );
}

export function WalletMovement({ ask, recorded }: { ask: WatchAsk; recorded: boolean }) {
  const { state, check } = useMovement([ask]);
  const summary = state.phase === "done" ? movementSummary(state.answer.results) : null;
  const moved = summary?.moved[0];

  return (
    <Section
      id="since"
      title="Since it was read"
      note="An attribution is true as of the moment the chain was read. NOIR asks the chain whether this wallet has sent USDT since, and names where it went only when its own table can."
    >
      <div aria-live="polite" className="min-w-0">
        {state.phase === "checking" ? <Asking>Asking the chain…</Asking> : null}

        {state.phase === "failed" ? (
          <p role="alert" className="max-w-prose">
            The check could not be made, so nothing is stated about this wallet. {state.error}
          </p>
        ) : null}

        {moved ? (
          <div className="flex min-w-0 flex-col items-start gap-3">
            <Tag tone="wait">Moved</Tag>
            <MovedLines m={moved} readAt={ask.since} />
            <p className="max-w-prose text-ink-soft">
              {recorded
                ? "This wallet is answered from a recording, and reading it again returns the same recording. Its new transfers are not filed."
                : "Read it again, under Actions, to file where this money went."}
            </p>
          </div>
        ) : summary && summary.still > 0 ? (
          <p className="max-w-prose">This wallet has not sent USDT since it was read on {utc(ask.since)}.</p>
        ) : summary ? (
          <p className="max-w-prose">The chain did not answer, so nothing is stated about this wallet.</p>
        ) : null}
      </div>
      <CheckAgain state={state} check={check} />
    </Section>
  );
}
