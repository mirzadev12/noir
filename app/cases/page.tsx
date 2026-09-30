import { DeskUnavailable } from "@/components/desk/DeskUnavailable";
import { StatusTag } from "@/components/desk/StatusTag";
import { ChainBadge, Empty, Page, PageHead, RouteLink, Table, Tag, type TableRow, ButtonLink } from "@/components/noir";
import { readCases } from "@/lib/desk-read";
import { count, shortAddress, utc, vaspHref, walletHref } from "@/lib/noir-format";

export const metadata = { title: "Cases" };
export const dynamic = "force-dynamic";

const noun = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

/** The desk read by case: every case reference with its wallets, the VASPs they reach and the requests that cover them. */
export default async function CasesPage() {
  const read = await readCases();
  if (!read.ok) return <DeskUnavailable reason={read.reason} />;
  const cases = read.value;

  const rows: TableRow[] = cases.map((c) => ({
    key: c.caseRef ?? "none",
    cells: [
      c.caseRef ? <strong key="c">{c.caseRef}</strong> : <span key="c" className="text-ink-soft">No case reference</span>,
      <ul key="w" className="flex flex-col gap-1.5">
        {c.wallets.map((w) => (
          <li key={w.entryId} className="flex min-w-0 flex-wrap items-center gap-2">
            <ChainBadge chain={w.chain} />
            <RouteLink href={walletHref(w.wallet, w.chain)} mono title={w.wallet}>
              {shortAddress(w.wallet)}
            </RouteLink>
            {w.status !== "attributed" && w.status !== "screened-only" ? <Tag tone="quiet">{w.status}</Tag> : null}
          </li>
        ))}
      </ul>,
      c.vasps.length ? (
        <ul key="v" className="flex flex-col gap-1">
          {c.vasps.map((v) => (
            <li key={v}>
              <RouteLink href={vaspHref(v)}>{v}</RouteLink>
            </li>
          ))}
        </ul>
      ) : (
        <span key="v" className="text-ink-soft">None yet</span>
      ),
      c.requests.length ? (
        <ul key="r" className="flex flex-col gap-2">
          {c.requests.map((q) => (
            <li key={q.id} className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-small">{q.vasp}</span>
              <StatusTag status={q.status} />
            </li>
          ))}
        </ul>
      ) : (
        <span key="r" className="text-ink-soft">No request yet</span>
      ),
      <span key="l" className="text-small">{utc(c.lastFiled)}</span>,
    ],
  }));

  return (
    <Page>
      <PageHead
        title="Cases"
        lede={
          cases.length
            ? `${noun(cases.length, "case reference")} on the desk. Each shows the wallets filed under it, the VASPs they reach in either direction, and where its requests stand.`
            : "Wallets filed with a case reference are gathered here by case."
        }
      />
      <div className="mt-8">
        {cases.length === 0 ? (
          <Empty
            title="No wallet is filed yet"
            action={
              <ButtonLink href="/desk" icon="arrow-right">
                Go to the desk
              </ButtonLink>
            }
          >
            File wallets with a case reference and the cases appear here, with the VASPs each one reaches.
          </Empty>
        ) : (
          <Table
            caption="Cases on the desk"
            columns={[{ label: "Case" }, { label: "Wallets" }, { label: "VASPs reached" }, { label: "Requests" }, { label: "Last filed" }]}
            rows={rows}
          />
        )}
      </div>
    </Page>
  );
}
