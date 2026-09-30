import { ChainBadge, Notice, Page, PageHead, Table, Tag, Text, type TableRow } from "@/components/noir";
import { evidenceLedger } from "@/lib/evidence";
import { FIU_SOURCE } from "@/lib/fiu";
import { count, utcDay } from "@/lib/noir-format";
import { registryRows, registryTotals } from "@/lib/registry";
import type { TracedChain } from "@/lib/desk-types";

export const metadata = { title: "Registry" };

const ORDER: TracedChain[] = ["tron", "ethereum", "polygon"];

/** Every VASP NOIR can name when a wallet's money reaches it, counted from the label files. */
export default function RegistryPage() {
  const rows = registryRows();
  const t = registryTotals();
  const ledger = evidenceLedger();

  const tableRows: TableRow[] = rows.map((r) => ({
    key: r.vasp,
    cells: [
      <strong key="v" className="type-sign text-lead">
        {r.vasp}
      </strong>,
      <span key="c" className="flex flex-wrap gap-2">
        {ORDER.filter((c) => r.chains[c]).map((c) => (
          <ChainBadge key={c} chain={c} />
        ))}
      </span>,
      <span key="s" className="type-mono">
        {count(r.seedWallets)}
      </span>,
      <span key="d" className="type-mono font-bold">
        {count(r.depositAddresses)}
      </span>,
      r.fiu ? (
        <span key="f" className="inline-flex min-w-0 flex-col items-start gap-1">
          <Tag>FIU-IND listed</Tag>
          <span className="text-small">{r.fiu.legalName}</span>
        </span>
      ) : null,
      !r.le ? (
        <Tag key="l" tone="quiet">
          Not recorded
        </Tag>
      ) : r.le.found ? (
        <Tag key="l" tone="ok" icon="check">
          Channel found
        </Tag>
      ) : (
        <span key="l" className="inline-flex min-w-0 flex-col items-start gap-1">
          <Tag tone="wait">Not found</Tag>
          <span className="text-small text-ink-soft">{r.le.reason}</span>
        </span>
      ),
    ],
  }));

  return (
    <Page>
      <PageHead
        title="Registry"
        lede={`Every VASP NOIR can name when a wallet’s money reaches it or funds it: ${count(t.vasps)} across ${count(t.chains)} chains, counted from the label files.`}
      />
      <div className="mt-8 flex max-w-prose flex-col gap-2">
        <Text tone="soft">
          A <strong>seed wallet</strong> is an exchange’s own wallet named by a public explorer tag. A <strong>deposit address</strong> is a customer account NOIR derived from
          it, because it forwarded nearly everything it received to that wallet. Attribution looks a wallet’s money up against these two lists; nothing else decides it.
        </Text>
      </div>
      <div className="mt-6 max-w-prose">
        {ledger.missing.length === 0 ? (
          <Text tone="soft">
            Every row says where it came from. All <strong className="type-mono text-ink">{count(ledger.seedWallets.withSource)}</strong> seed wallets name the explorer page that tags
            them, and all <strong className="type-mono text-ink">{count(ledger.depositAddresses.withEvidence)}</strong> deposit addresses carry their evidence and the seed wallet they
            forward to. A row without its source fails the build.
          </Text>
        ) : (
          <Notice tone="caution" title={`${count(ledger.missing.length)} ${ledger.missing.length === 1 ? "row lacks" : "rows lack"} provenance`}>
            <ul className="mt-2 flex flex-col gap-1 text-small">
              {ledger.missing.slice(0, 20).map((m) => (
                <li key={`${m.file}-${m.address}-${m.lacks}`}>
                  <span className="type-mono">{m.address}</span> in {m.file} lacks {m.lacks}.
                </li>
              ))}
            </ul>
          </Notice>
        )}
      </div>
      <div className="mt-8">
        <Table
          caption="VASPs NOIR can attribute to"
          columns={[
            { label: "VASP" },
            { label: "Chains" },
            { label: "Seed wallets" },
            { label: "Deposit addresses" },
            { label: "FIU-IND" },
            { label: "LE channel" },
          ]}
          rows={tableRows}
        />
      </div>
      <Text size="small" tone="soft" className="mt-6">
        FIU-IND: the Ministry of Finance’s answer to {FIU_SOURCE.title}, {utcDay(`${FIU_SOURCE.answered}T00:00:00Z`)}. It is a snapshot of that day. Law-enforcement channels are copied from
        each exchange’s own page on the date recorded with it; check the source before relying on one.
      </Text>
    </Page>
  );
}
