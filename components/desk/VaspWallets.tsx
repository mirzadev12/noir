/**
 * VaspWallets — every wallet the desk routes to one VASP, in the two
 * directions, each with the case it came from, the USDT, how much evidence was
 * seen behind it (in words) and which tier of evidence that is.
 *
 *  - Outbound: the wallet's money reached an account at this VASP. The account
 *    is what a freeze names; the transactions are what it received.
 *  - Inbound: this VASP funded the wallet's payers. NOIR holds no account of the
 *    wallet here — it names the VASP that can say whose money it was.
 *
 * The label's own evidence line is printed verbatim under the wording, including
 * any caution it carries, so the doubt travels with the name.
 */

import { RouteLink, Section, Table, Tag, Text, type TableRow } from "@/components/noir";
import type { DeskEntry, RoutedWallet, VaspRow } from "@/lib/desk-types";
import { amount, evidenceWord, tierName, txHref } from "@/lib/noir-format";
import { Mono } from "@/components/noir";
import { OfacTag } from "./DeskLists";
import { WalletLink } from "./WalletLink";
import { explorerHref } from "@/lib/noir-format";

const cases = (w: RoutedWallet) => (w.caseRefs.length ? w.caseRefs.join(", ") : <span className="text-ink-soft">No case reference</span>);

function WalletCell({ w, entries }: { w: RoutedWallet; entries: Record<string, DeskEntry> }) {
  const entry = entries[w.entryId];
  return (
    <span className="inline-flex min-w-0 flex-col items-start gap-2">
      <WalletLink wallet={w.wallet} chain={w.chain} />
      {entry ? <OfacTag entry={entry} /> : null}
    </span>
  );
}

function Evidence({ w }: { w: RoutedWallet }) {
  return (
    <span className="inline-flex min-w-0 flex-col items-start gap-1.5">
      <span className="font-bold">{evidenceWord(w.confidence)}</span>
      <Tag tone="quiet">{tierName(w.source)}</Tag>
      {w.evidence ? <span className="text-small text-ink-soft">{w.evidence}</span> : null}
    </span>
  );
}

function Transactions({ w }: { w: RoutedWallet }) {
  if (w.txHashes.length === 0) return <span className="text-small text-ink-soft">None recorded</span>;
  const link = (hash: string) => {
    const href = txHref(w.chain, hash);
    return href ? (
      <RouteLink key={hash} href={href} external mono>
        {hash}
      </RouteLink>
    ) : (
      <Mono key={hash}>{hash}</Mono>
    );
  };
  const [first, ...rest] = w.txHashes;
  return (
    <span className="flex min-w-0 flex-col items-start gap-2 text-small">
      {link(first)}
      {rest.length > 0 ? (
        <details className="min-w-0">
          <summary className="text-route">{rest.length === 1 ? "1 more transaction" : `${rest.length} more transactions`}</summary>
          <span className="mt-2 flex min-w-0 flex-col items-start gap-2">{rest.map(link)}</span>
        </details>
      ) : null}
    </span>
  );
}

export function VaspWallets({ row, entries }: { row: VaspRow; entries: Record<string, DeskEntry> }) {
  const outbound = row.wallets.filter((w) => w.direction === "outbound");
  const inbound = row.wallets.filter((w) => w.direction === "inbound");

  const outRows: TableRow[] = outbound.map((w) => ({
    key: `${w.entryId}-out`,
    cells: [
      <WalletCell key="w" w={w} entries={entries} />,
      cases(w),
      w.account ? (
        <RouteLink key="a" href={explorerHref(w.chain, w.account) ?? "#"} external mono copy={w.account}>
          {w.account}
        </RouteLink>
      ) : null,
      <span key="u" className="type-mono font-bold">
        {amount(w.usdt)}
      </span>,
      <Evidence key="e" w={w} />,
      <Transactions key="t" w={w} />,
    ],
  }));

  const inRows: TableRow[] = inbound.map((w) => ({
    key: `${w.entryId}-in`,
    cells: [
      <WalletCell key="w" w={w} entries={entries} />,
      cases(w),
      <span key="u" className="type-mono font-bold">
        {amount(w.usdt)}
      </span>,
      <Evidence key="e" w={w} />,
    ],
  }));

  return (
    <>
      {outbound.length > 0 ? (
        <Section
          id="outbound"
          title="Outbound: where the money went"
          count={`${outbound.length} wallet${outbound.length === 1 ? "" : "s"}`}
          note={`These wallets' USDT reached an account at ${row.vasp}. The account is what a freeze must name.`}
        >
          <Table
            caption={`Wallets whose money reached ${row.vasp}`}
            columns={[
              { label: "Wallet" },
              { label: "Case" },
              { label: `Account at ${row.vasp}` },
              { label: "USDT", align: "end" },
              { label: "Evidence seen" },
              { label: "Transactions" },
            ]}
            rows={outRows}
          />
        </Section>
      ) : null}

      {inbound.length > 0 ? (
        <Section
          id="inbound"
          title="Inbound: who funded it"
          count={`${inbound.length} wallet${inbound.length === 1 ? "" : "s"}`}
          note={`${row.vasp} funded the payers of these wallets. It is who can say whose money it was; NOIR holds no account of the wallet there.`}
        >
          <Table
            caption={`Wallets whose payers ${row.vasp} funded`}
            columns={[{ label: "Wallet" }, { label: "Case" }, { label: "USDT paid in", align: "end" }, { label: "Evidence seen" }]}
            rows={inRows}
          />
        </Section>
      ) : null}
      {outbound.length === 0 && inbound.length === 0 ? <Text tone="soft">No wallet is routed to this VASP.</Text> : null}
    </>
  );
}
