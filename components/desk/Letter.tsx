/**
 * Letter — the consolidated request as an official letter, ready to print on A4.
 *
 * Letterhead (the sending unit and officer, the reference and date; the tool is
 * not named there); "To" with the addressee's
 * legal name (the FIU-IND legal name when listed) and where such requests are
 * received; a "Subject" line; numbered paragraphs; the asks as a numbered list;
 * every wallet as a full-width unwrapped address line with its account, USDT,
 * case and evidence in a row beneath and its transactions below that; a ruled blank for the legal basis; and a signature block with a seal
 * box. On paper every page ends with the reference, the moment it was prepared
 * (UTC) and its page number.
 *
 * NOIR prints no statute and never fills the legal basis in. Confidence is
 * stated as evidence seen, in words and by tier, never as the chance of being
 * right. Nothing here says a request has been sent, or that NOIR is connected to
 * SAHYOG: the officer sends the letter, and NOIR records that. The unit and
 * officer are those the drafting officer stated at sign-in; they are pre-filled
 * for convenience and the signature is always left for the officer.
 */

import { Blank, Heading, Mono, Text } from "@/components/noir";
import type { RequestLetter, RoutedWallet } from "@/lib/desk-types";
import { fiuSentence } from "@/lib/fiu";
import type { Actor } from "@/lib/identity";
import { amount, chainCode, evidenceWord, tierName, usdt, utc, utcDay } from "@/lib/noir-format";
import { TIER_LINE } from "@/lib/noir-view";
import { ASK_LABEL } from "@/lib/requests";

const KIND = { portal: "Portal", email: "Email", form: "Form" } as const;

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="type-label text-ink-soft">{label}</dt>
      <dd className="m-0 min-w-0">{value}</dd>
    </div>
  );
}

export function Letter({ letter, draftedBy }: { letter: RequestLetter; draftedBy: Actor | null }) {
  const le = letter.le;
  const tiers = [...new Set(letter.wallets.map((w) => w.source))];
  const n = letter.wallets.length;
  const ref = letter.requestId ?? "Draft";

  /** A channel address that may break only after a "/". */
  const url = (href: string) =>
    href.split("/").flatMap((part, i, all) => (i < all.length - 1 ? [part, "/", <wbr key={i} />] : [part]));

  return (
    <article className="letter-sheet hair-box min-w-0 bg-paper p-6 md:p-10 print:border-0 print:p-0">
      {/* Paper is light whatever the screen theme, so the page canvas is too; every printed page carries the reference and the moment it was prepared at its foot, and the page number is in app/globals.css. */}
      <style>{`@media print { html { color-scheme: light; } @page { @bottom-left { content: "Request ${ref.replace(/[^\w-]/g, "")} · prepared ${utc(letter.generatedAt)}"; font-family: var(--font-sans); font-size: var(--text-micro); } } }`}</style>

      <header className="rule-b pb-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <p className="type-label text-ink-soft">From</p>
            {draftedBy?.unit ? <p className="type-sign m-0 text-title leading-tight wrap-anywhere">{draftedBy.unit}</p> : <span className="write-line block h-9 w-64 max-w-full" />}
            {draftedBy?.id ? <p className="m-0 mt-1 text-small">{draftedBy.id}</p> : null}
          </div>
          <dl className="grid min-w-0 gap-x-8 gap-y-2 text-right text-small sm:grid-cols-2">
            <Line label="Reference" value={<Mono whole>{ref}</Mono>} />
            <Line label="Date" value={utcDay(letter.generatedAt)} />
          </dl>
        </div>
      </header>

      <section className="mt-6 grid min-w-0 gap-x-8 gap-y-3 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="type-label text-ink-soft">To</p>
          <p className="m-0 font-bold">{letter.addressee}</p>
          {letter.addressee !== letter.vasp ? <p className="m-0 text-small">operating as {letter.vasp}</p> : null}
        </div>
        <div className="min-w-0">
          <p className="type-label text-ink-soft">Channel</p>
          {le && le.found ? (
            <ul className="flex flex-col gap-1 text-small">
              {le.channels.map((c) => (
                <li key={c.href} className="min-w-0">
                  {KIND[c.kind]}: {c.label} <span className="type-mono text-small wrap-normal">{url(c.href)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-small">{le ? "None found on the exchange’s own page. To be confirmed before sending." : "None recorded. To be confirmed before sending."}</p>
          )}
        </div>
      </section>

      <Heading level={1} size="lead" className="mt-6 !font-medium">
        <strong>Subject:</strong> Request for disclosure and preservation of records — {n === 1 ? "1 wallet" : `${n} wallets`} routed to {letter.vasp}
        {letter.caseRefs.length ? ` (${letter.caseRefs.join(", ")})` : ""}
      </Heading>

      <ol className="mt-5 flex list-decimal flex-col gap-5 pl-6">
        <li>
          This request concerns the wallets and accounts listed in paragraph 3. NOIR’s lookup of public blockchain data attributes each to {letter.vasp}: money from the wallet
          reached an account there, or {letter.vasp} funded the wallet’s payers.
        </li>
        <li className="keep-together">
          Please provide, or preserve, the following for the accounts and wallets listed:
          <ol className="mt-2 flex list-[lower-alpha] flex-col gap-1 pl-6">
            {letter.asks.map((ask) => (
              <li key={ask}>{ASK_LABEL[ask]}</li>
            ))}
          </ol>
        </li>
        <li>
          The wallets, accounts and transactions are these. Amounts are USDT.
          <ul className="rule-t mt-3 text-small">
            {letter.wallets.map((w: RoutedWallet, i) => (
              <li key={`${w.entryId}-${w.direction}`} className="keep-together hair-b py-3">
                <p className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="type-mono font-bold">{i + 1}.</span>
                  <Mono whole className="sm:whitespace-nowrap">
                    {w.wallet}
                  </Mono>
                  <span className="text-ink-soft">
                    {chainCode(w.chain)} · {w.direction === "outbound" ? "its money reached this VASP" : "this VASP funded its payers"}
                  </span>
                </p>
                {/* Four facts in a row where there is room for them (a wide screen, and paper); two by two in between, so the unwrapped account never squeezes the others to nothing. */}
                <dl className="mt-2 grid min-w-0 gap-x-6 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)] lg:grid-cols-[max-content_max-content_minmax(0,1fr)_minmax(0,1.4fr)] print:grid-cols-[max-content_max-content_minmax(0,1fr)_minmax(0,1.4fr)]">
                  <Line
                    label="Account"
                    value={
                      w.account ? (
                        <Mono whole className="sm:whitespace-nowrap">
                          {w.account}
                        </Mono>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Line label="USDT" value={<span className="type-mono font-bold">{amount(w.usdt)}</span>} />
                  <Line label="Case" value={w.caseRefs.length ? w.caseRefs.join(", ") : "—"} />
                  <Line label="Evidence seen" value={`${evidenceWord(w.confidence)} · ${tierName(w.source)}`} />
                </dl>
                {w.txHashes.length ? (
                  <div className="mt-2 min-w-0">
                    <p className="type-label text-ink-soft">Transactions</p>
                    <ul className="flex flex-col gap-1">
                      {w.txHashes.map((h) => (
                        <li key={h}>
                          <Mono whole className="print:whitespace-nowrap lg:whitespace-nowrap">
                            {h}
                          </Mono>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <Text size="small" tone="soft" className="mt-2">
            Total: {usdt(letter.wallets.reduce((s, w) => s + w.usdt, 0))} across both routes; a wallet routed both ways appears once for each.
          </Text>
        </li>
        <li className="keep-together">
          Each wallet was attributed by a deterministic lookup of public blockchain data against a table of exchange wallets and deposit addresses, each recorded with the
          evidence it rests on. “Evidence seen” says how much evidence was seen, from limited to strong; it is not a probability that an attribution is correct.
          {tiers.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1 text-small">
              {tiers.map((t) => (
                <li key={t}>
                  <strong>{tierName(t)}.</strong> {TIER_LINE[t]}
                </li>
              ))}
            </ul>
          ) : null}
          {letter.fiu ? <span className="mt-2 block text-small">{fiuSentence(letter.vasp, letter.fiu)}</span> : null}
        </li>
        <li className="keep-together">
          The legal basis for this request is:
          <Blank label="Legal basis" lines={4} hint="To be written by the requesting officer. NOIR prints no statute." className="mt-2" />
        </li>
        <li className="keep-together">Please acknowledge receipt and send your reply to the officer named below, quoting the reference above.</li>
      </ol>

      <section className="keep-together mt-8 grid min-w-0 gap-x-8 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0 sm:col-span-2">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <Blank label="Officer’s name" />
            <Blank label="Designation" />
            <Blank label="Unit and office" />
            <Blank label="Telephone and email" />
            <Blank label="Signature" />
            <Blank label="Date" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="type-label">Seal</p>
          <div className="rule-box mt-1 size-28" aria-hidden="true" />
        </div>
      </section>

      <footer className="hair-t mt-8 pt-3 text-small text-ink-soft">
        Prepared with NOIR. NOIR does not send requests: the officer sends this letter through SAHYOG or the VASP’s own channel and records it.
      </footer>
    </article>
  );
}
