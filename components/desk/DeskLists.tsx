/**
 * DeskLists — the wallets that are not a row on the desk, each list under the
 * reason it is not: being read, could not be read, on a chain NOIR does not
 * trace, routed to no VASP, or failed. Every wallet in them links to its own
 * page, and the ones that can be read again say so.
 *
 * Nothing here is worded as "empty": a wallet that could not be read says
 * "could not be read", and a wallet that reached no VASP says what its trail
 * did instead.
 */

import { Empty, Section, Table, Tag, type TableRow } from "@/components/noir";
import type { DeskEntry } from "@/lib/desk-types";
import { MAX_READ_ATTEMPTS } from "@/lib/desk";
import { caseRefsOf, isSanctioned, retryLine, STOP_LINE } from "@/lib/noir-view";
import { ReadAgain } from "./ReadAgain";
import { WalletLink } from "./WalletLink";

const cases = (e: DeskEntry) => {
  const refs = caseRefsOf(e);
  return refs.length ? refs.join(", ") : <span className="text-ink-soft">No case reference</span>;
};

const walletsLabel = (n: number) => `${n} wallet${n === 1 ? "" : "s"}`;

export function OfacTag({ entry }: { entry: DeskEntry }) {
  return isSanctioned(entry) ? (
    <Tag tone="prohibit" icon="prohibit" title="Listed on the OFAC Specially Designated Nationals list">
      OFAC-listed
    </Tag>
  ) : null;
}

export function OfacFlags({ entries }: { entries: DeskEntry[] }) {
  if (entries.length === 0) return null;
  const rows: TableRow[] = entries.map((e) => ({
    key: e.id,
    cells: [
      <WalletLink key="w" wallet={e.wallet} chain={e.chain} />,
      cases(e),
      <span key="f" className="inline-flex min-w-0 flex-col items-start gap-1">
        <OfacTag entry={e} />
        <span className="text-small">
          {e.record?.sanctioned ? `The wallet is listed: ${e.record.sanctioned.entity}.` : STOP_LINE.sanctioned}
        </span>
      </span>,
    ],
  }));
  return (
    <Section
      flush
      title="OFAC flags"
      count={walletsLabel(entries.length)}
      note="A listing is a finding. These wallets are on the OFAC SDN list, or their money ended at an address that is. Check them before any request is sent."
    >
      <Table caption="OFAC-flagged wallets" columns={[{ label: "Wallet" }, { label: "Case" }, { label: "Flag" }]} rows={rows} />
    </Section>
  );
}

export function PendingList({ entries }: { entries: DeskEntry[] }) {
  if (entries.length === 0) return null;
  const rows: TableRow[] = entries.map((e, i) => ({
    key: e.id,
    cells: [<WalletLink key="w" wallet={e.wallet} chain={e.chain} />, cases(e), <Tag key="s" tone={i === 0 ? "solid" : "quiet"}>{i === 0 ? "Reading now" : "Waiting"}</Tag>],
  }));
  return (
    <Section
      title="Being read"
      count={walletsLabel(entries.length)}
      note="The server reads one wallet at a time, and this list refreshes every 3 seconds until they are done."
    >
      <Table caption="Wallets being read" columns={[{ label: "Wallet" }, { label: "Case" }, { label: "State" }]} rows={rows} />
    </Section>
  );
}

export function UnreadableList({ entries }: { entries: DeskEntry[] }) {
  if (entries.length === 0) return null;
  const rows: TableRow[] = entries.map((e) => ({
    key: e.id,
    cells: [
      <WalletLink key="w" wallet={e.wallet} chain={e.chain} />,
      cases(e),
      <span key="t" className="text-small text-ink-soft">
        {retryLine(e, MAX_READ_ATTEMPTS)}
      </span>,
      <ReadAgain key="a" id={e.id} />,
    ],
  }));
  return (
    <Section
      title="Could not be read"
      count={walletsLabel(entries.length)}
      note="The chain would not give these wallets’ history. That is not the same as a wallet with nothing in it, and NOIR files them under no VASP. NOIR reads each again by itself, three reads in all; after that, read them again yourself when the chain answers."
    >
      <Table caption="Wallets that could not be read" columns={[{ label: "Wallet" }, { label: "Case" }, { label: "Last try" }, { label: "" }]} rows={rows} />
    </Section>
  );
}

export function ScreenedList({ entries }: { entries: DeskEntry[] }) {
  if (entries.length === 0) return null;
  const rows: TableRow[] = entries.map((e) => {
    const listing = e.record?.sanctioned ?? null;
    return {
      key: e.id,
      cells: [
        <WalletLink key="w" wallet={e.wallet} chain={e.chain} />,
        cases(e),
        listing ? (
          <span key="o" className="inline-flex min-w-0 flex-col items-start gap-1">
            <OfacTag entry={e} />
            <span className="text-small">{listing.entity}</span>
          </span>
        ) : (
          <span key="o" className="text-small text-ink-soft">
            Not on the OFAC list. That is not a clearance.
          </span>
        ),
      ],
    };
  });
  return (
    <Section
      title="On other chains"
      count={walletsLabel(entries.length)}
      note="NOIR recognises these formats and screens them against the OFAC list. It does not trace them, so they are filed under no VASP."
    >
      <Table caption="Wallets on chains NOIR does not trace" columns={[{ label: "Wallet" }, { label: "Case" }, { label: "OFAC screening" }]} rows={rows} />
    </Section>
  );
}

export function UnroutedList({ entries }: { entries: DeskEntry[] }) {
  if (entries.length === 0) return null;
  const rows: TableRow[] = entries.map((e) => ({
    key: e.id,
    cells: [
      <WalletLink key="w" wallet={e.wallet} chain={e.chain} />,
      cases(e),
      <span key="y" className="inline-flex min-w-0 flex-col items-start gap-1">
        <OfacTag entry={e} />
        <span className="text-small">{e.record?.outboundStop ? STOP_LINE[e.record.outboundStop] : "No VASP was named in either direction."}</span>
      </span>,
      <ReadAgain key="a" id={e.id} />,
    ],
  }));
  return (
    <Section
      title="No VASP found"
      count={walletsLabel(entries.length)}
      note="These wallets were read. Their money reached no VASP NOIR can name, and no funder of theirs is in its table, so there is no one to write to yet."
    >
      <Table caption="Wallets routed to no VASP" columns={[{ label: "Wallet" }, { label: "Case" }, { label: "What the trace did" }, { label: "" }]} rows={rows} />
    </Section>
  );
}

export function FailedList({ entries }: { entries: DeskEntry[] }) {
  if (entries.length === 0) return null;
  const rows: TableRow[] = entries.map((e) => ({
    key: e.id,
    cells: [
      <WalletLink key="w" wallet={e.wallet} chain={e.chain} />,
      cases(e),
      <span key="e" className="text-small">
        {e.error ?? "Attribution failed."}
      </span>,
      <ReadAgain key="a" id={e.id} label="Try again" />,
    ],
  }));
  return (
    <Section title="Failed" count={walletsLabel(entries.length)} note="The worker stopped on these wallets and said why. Nothing was filed for them.">
      <Table caption="Wallets whose attribution failed" columns={[{ label: "Wallet" }, { label: "Case" }, { label: "What went wrong" }, { label: "" }]} rows={rows} />
    </Section>
  );
}

export function DeskEmpty() {
  return (
    <Empty title="Nothing is filed yet">
      <ol className="mt-2 grid max-w-prose gap-3 text-ink-soft">
        <li>
          <strong className="text-ink">1. File the wallets.</strong> Paste them in the box beside this, one per line, or drop a CSV
          of address, chain and case.{" "}
          <a href="/templates/desk-intake-example.csv" download>
            Download the CSV template
          </a>
          .
        </li>
        <li>
          <strong className="text-ink">2. NOIR reads each one</strong> on its chain and names the nearest VASP in both directions:
          where its money went and who funded it. This takes seconds per wallet.
        </li>
        <li>
          <strong className="text-ink">3. Each VASP gets one row here,</strong> with every wallet from every case routed to it. Open
          a row to draft one request for all of them.
        </li>
      </ol>
    </Empty>
  );
}
