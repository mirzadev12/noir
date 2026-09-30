import { notFound } from "next/navigation";
import { DeskUnavailable } from "@/components/desk/DeskUnavailable";
import { ReadAgain } from "@/components/desk/ReadAgain";
import { Refresher } from "@/components/desk/Refresher";
import { RemoveWallet } from "@/components/desk/RemoveWallet";
import { RouteOf } from "@/components/desk/RouteOf";
import { Signpost } from "@/components/desk/Signpost";
import { StatusTag } from "@/components/desk/StatusTag";
import { ChainBadge, Facts, Mono, Notice, Page, PageHead, RouteLink, Section, SectionNav, Table, Tag, Text, type TableRow } from "@/components/noir";
import { readWallet } from "@/lib/desk-read";
import { actorBasis, actorName } from "@/lib/identity";
import { amount, evidenceWord, shortAddress, tierName, utc, vaspHref } from "@/lib/noir-format";
import { statusOf, TYPOLOGY_NAME } from "@/lib/noir-view";
import { requestHref } from "@/lib/noir-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/wallet/[address]">) {
  const { address } = await props.params;
  return { title: `Wallet ${shortAddress(address)}` };
}

export default async function WalletPage(props: PageProps<"/wallet/[address]">) {
  const { address } = await props.params;
  const { chain } = await props.searchParams;
  const read = await readWallet(address, typeof chain === "string" ? chain : null);
  if (!read.ok) return <DeskUnavailable reason={read.reason} />;
  if (read.value === null) notFound();
  const { entry, siblings, requests } = read.value;
  const r = entry.record;
  const pending = entry.status === "pending";

  const typologyRows: TableRow[] = (r?.typologies ?? []).map((t, i) => ({
    key: `${t.code}-${i}`,
    cells: [<strong key="c">{TYPOLOGY_NAME[t.code] ?? t.code}</strong>, t.reason, <Mono key="a" size="small">{t.at}</Mono>],
  }));

  return (
    <Page>
      <Refresher active={pending} />
      <PageHead
        title={`Wallet ${shortAddress(entry.wallet)}`}
        lede={
          pending
            ? "Being read now. This page refreshes every 3 seconds until the answer lands."
            : r
              ? `Read ${utc(r.provenance.generatedAt)}. Both directions of attribution for this one wallet.`
              : "This wallet has no record yet."
        }
        aside={
          <span className="flex flex-wrap items-center gap-3">
            {r?.provenance.basis === "recorded" ? <Tag>Recorded</Tag> : r ? <Tag tone="quiet">Live</Tag> : null}
          </span>
        }
      />

      <div className="mt-8 flex flex-col gap-4">
        {entry.status === "failed" ? (
          <Notice tone="stop" title="The worker stopped on this wallet">
            {entry.error ?? "Attribution failed."} Nothing was filed for it.
          </Notice>
        ) : null}
        {entry.status === "unreadable" ? (
          <Notice tone="caution" title="This wallet could not be read">
            The chain would not give its history. That is not the same as a wallet with nothing in it, and NOIR files it under no VASP. Read it again when the chain answers.
          </Notice>
        ) : null}
        {r?.sanctioned ? (
          <Notice tone="sanction" title="Listed on the OFAC SDN list">
            {r.sanctioned.entity}
            {r.sanctioned.program ? ` · ${r.sanctioned.program}` : ""} · filed under {r.sanctioned.assets.join(", ")}
          </Notice>
        ) : null}
        {siblings.length > 0 ? (
          <Text size="small" tone="soft">
            The same address is also filed on{" "}
            {siblings.map((s, i) => (
              <span key={s.id}>
                {i > 0 ? ", " : ""}
                <RouteLink href={`/wallet/${encodeURIComponent(s.wallet)}?chain=${s.chain}`}>{s.chain === "polygon" ? "Polygon" : s.chain === "ethereum" ? "Ethereum" : s.chain}</RouteLink>
              </span>
            ))}
            , where it is a different wallet.
          </Text>
        ) : null}
      </div>

      <div className="mt-8">
        <SectionNav
          items={[
            { href: "#overview", label: "Overview" },
            ...(r?.outbound ? [{ href: "#route", label: "Route" }] : []),
            ...(r && r.traced && r.readable ? [{ href: "#typologies", label: "Typologies" }] : []),
            ...(r && r.inbound.length > 0 ? [{ href: "#funders", label: "Funders" }] : []),
            { href: "#provenance", label: "Provenance" },
            { href: "#actions", label: "Actions" },
          ]}
        />
      </div>

      <Section id="overview" title="Overview" flush className="mt-10">
        <Facts
          items={[
            { label: "Address", value: <Mono copy>{entry.wallet}</Mono> },
            { label: "Chain", value: <ChainBadge chain={entry.chain} named /> },
            {
              label: "Its money went to",
              value: r?.outbound ? (
                <span>
                  <RouteLink href={vaspHref(r.outbound.vasp)}>
                    <strong>{r.outbound.vasp}</strong>
                  </RouteLink>
                  , {amount(r.outbound.usdt)} USDT · {evidenceWord(r.outbound.confidence)}
                </span>
              ) : r?.readable ? (
                "No VASP named"
              ) : null,
            },
            {
              label: "Funded by",
              value: r?.inbound.length
                ? r.inbound.map((f, i) => (
                    <span key={f.vasp}>
                      {i > 0 ? ", " : ""}
                      <RouteLink href={vaspHref(f.vasp)}>{f.vasp}</RouteLink>
                    </span>
                  ))
                : null,
            },
            { label: "Status", value: <Tag tone="quiet">{entry.status.replace("-", " ")}</Tag> },
          ]}
        />
      </Section>

      {r && r.readable ? (
        <div className="mt-10">
          <Signpost entry={entry} />
        </div>
      ) : null}

      {r?.outbound ? (
        <Section id="route" title="The route" note="Every stop from the wallet to the account, with the USDT of the wallet’s money that reached it. Each address opens on a public explorer.">
          {r.outbound.route ? null : <p className="mb-4 text-small text-ink-soft">The full path was not recorded for this reading; read the wallet again to draw it.</p>}
          <RouteOf record={r} draw />
          {r.outbound.evidence ? (
            <p className="mt-6 max-w-prose text-small text-ink-soft">
              The label’s own evidence, verbatim: “{r.outbound.evidence}”.
            </p>
          ) : null}
          {r.outbound.txHashes.length > 0 ? (
            <p className="mt-2 text-small text-ink-soft">
              {r.outbound.txHashes.length} {r.outbound.txHashes.length === 1 ? "transaction into the account is" : "transactions into the account are"} listed on the{" "}
              <RouteLink href={vaspHref(r.outbound.vasp)}>{r.outbound.vasp} page</RouteLink>.
            </p>
          ) : null}
        </Section>
      ) : null}

      {r && r.traced && r.readable ? (
        <Section id="typologies" title="Typologies observed" note="Patterns the trace reported, in its own words. They describe how the money moved; they do not say what it was for.">
          {r.typologies === undefined ? (
            <Text tone="soft">Not recorded for this reading. Read the wallet again to record them.</Text>
          ) : r.typologies.length === 0 ? (
            <Text tone="soft">The trace reported none.</Text>
          ) : (
            <Table caption="Typologies observed" columns={[{ label: "Pattern" }, { label: "What the trace saw" }, { label: "At" }]} rows={typologyRows} />
          )}
        </Section>
      ) : null}

      {r && r.inboundLeads.length > 0 ? (
        <Section title="Leads" note="Funding sources the explorer tags but NOIR’s own table does not name. They are shown exactly as tagged and are never filed as an attribution.">
          <Table
            caption="Explorer-tag leads"
            columns={[{ label: "Tag, verbatim" }, { label: "Payers", align: "end" }, { label: "USDT paid in", align: "end" }]}
            rows={r.inboundLeads.map((l, i) => ({
              key: `${l.tag}-${i}`,
              cells: [<span key="t">“{l.tag}”</span>, <span key="p" className="type-mono">{l.payers}</span>, <span key="u" className="type-mono">{amount(l.paidUsdt)}</span>],
            }))}
          />
        </Section>
      ) : null}

      {r && r.inbound.length > 0 ? (
        <Section id="funders" title="Funders" note="Exchanges in NOIR’s table that funded this wallet’s payers, one hop back. Each opens its VASP page.">
          <Table
            caption="Funding VASPs"
            columns={[{ label: "VASP" }, { label: "Payers", align: "end" }, { label: "USDT paid in", align: "end" }, { label: "Evidence seen" }]}
            rows={r.inbound.map((f) => ({
              key: f.vasp,
              cells: [
                <RouteLink key="v" href={vaspHref(f.vasp)}>
                  <strong>{f.vasp}</strong>
                </RouteLink>,
                <span key="p" className="type-mono">{f.payers}</span>,
                <span key="u" className="type-mono font-bold">{amount(f.paidUsdt)}</span>,
                <span key="e">
                  <strong>{evidenceWord(f.confidence)}</strong> · {tierName(f.source)}
                </span>,
              ],
            }))}
          />
        </Section>
      ) : null}

      {requests.length > 0 ? (
        <Section title="Requests that cover it">
          <ul className="rule-t">
            {requests.map((q) => (
              <li key={q.id} className="hair-b flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <RouteLink href={requestHref(q.vasp)}>
                  <strong>{q.vasp}</strong>
                </RouteLink>
                <StatusTag status={statusOf(q)} />
                <span className="text-small text-ink-soft">drafted {utc(q.history[0].at)}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="provenance" title="Provenance">
        <Facts
          items={[
            { label: "Read at", value: r ? utc(r.provenance.generatedAt) : null },
            {
              label: "Basis",
              value: r ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {r.provenance.basis === "recorded" ? <Tag>Recorded</Tag> : <Tag tone="quiet">Live</Tag>}
                  <span className="text-small text-ink-soft">
                    {r.provenance.basis === "recorded" ? "Answered from a recorded chain read, matched by exact address." : "Read from the chain when it was filed."}
                  </span>
                </span>
              ) : null,
            },
            { label: "Responses", value: r ? `${r.provenance.responseHashes.length} recorded, ${r.provenance.apiCalls} chain ${r.provenance.apiCalls === 1 ? "call" : "calls"}` : null },
            {
              label: "OFAC SDN list",
              value: r ? (r.sanctioned ? "Listed" : "Not listed. That is not a clearance.") : null,
            },
            {
              label: "Filed",
              value: (
                <ul className="flex flex-col gap-1">
                  {entry.filings.map((f, i) => (
                    <li key={i} className="text-small">
                      {f.caseRef ?? "No case reference"} · {utc(f.at)}
                      {f.by.id ? ` · ${actorName(f.by)} (${actorBasis(f.by)})` : ""}
                    </li>
                  ))}
                </ul>
              ),
            },
            { label: "Status", value: <Tag tone="quiet">{entry.status.replace("-", " ")}</Tag> },
          ]}
        />
        {r && r.provenance.responseHashes.length > 0 ? (
          <details className="mt-4">
            <summary className="text-route">SHA-256 of each response</summary>
            <ul className="mt-3 flex flex-col gap-2 text-small">
              {r.provenance.responseHashes.map((h) => (
                <li key={h}>
                  <Mono>{h}</Mono>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </Section>

      <Section id="actions" title="Actions">
        <div className="flex flex-col items-start gap-6">
          <ReadAgain id={entry.id} size="md" />
          <RemoveWallet id={entry.id} />
        </div>
      </Section>
    </Page>
  );
}
