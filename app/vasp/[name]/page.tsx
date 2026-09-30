import { notFound } from "next/navigation";
import { AskForm } from "@/components/desk/AskForm";
import { DeskUnavailable } from "@/components/desk/DeskUnavailable";
import { FollowUpList, followUpItems } from "@/components/desk/FollowUps";
import { ReachFacts } from "@/components/desk/ReachFacts";
import { StatusLine } from "@/components/desk/StatusLine";
import { VaspWallets } from "@/components/desk/VaspWallets";
import { ButtonLink, Notice, Page, RouteLink, Section, SectionNav, Sign, Text } from "@/components/noir";
import { readVasp } from "@/lib/desk-read";
import { amount, count, utc } from "@/lib/noir-format";
import { evidenceSummary, requestHref, statusOf, walletCounts } from "@/lib/noir-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/vasp/[name]">) {
  const { name } = await props.params;
  return { title: name };
}

const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

export default async function VaspPage(props: PageProps<"/vasp/[name]">) {
  const { name } = await props.params;
  const read = await readVasp(name);
  if (!read.ok) return <DeskUnavailable reason={read.reason} />;
  if (read.value === null) notFound();
  const { row, allowed, letter, requests, entries } = read.value;
  const c = walletCounts(row);
  const request = row.request;
  const since = request ? row.uncoveredEntryIds.length : 0;
  const due = followUpItems([row], new Date().toISOString());

  return (
    <Page>
      <Sign
        level={1}
        pointer
        flap
        title={row.vasp}
        action={
          request ? (
            <ButtonLink href={requestHref(row.vasp)} icon="arrow-right">
              Open the request
            </ButtonLink>
          ) : (
            <ButtonLink href="#ask" icon="arrow-down">
              Draft one request
            </ButtonLink>
          )
        }
      >
        <span>
          {plural(c.wallets, "wallet")} · {plural(row.caseRefs.length, "case")}
        </span>
        <span>
          {amount(row.outboundUsdt)} USDT out · {amount(row.inboundUsdt)} USDT in
        </span>
        <span>Evidence seen: {evidenceSummary(row.wallets)}</span>
      </Sign>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-small text-ink-soft">Download this VASP’s wallets</span>
        <ButtonLink href={`/api/desk/export?kind=wallets&vasp=${encodeURIComponent(row.vasp)}&format=csv`} download variant="outline" size="sm" icon="download">
          CSV
        </ButtonLink>
        <ButtonLink href={`/api/desk/export?kind=wallets&vasp=${encodeURIComponent(row.vasp)}&format=json`} download variant="outline" size="sm" icon="download">
          JSON
        </ButtonLink>
      </div>

      <div className="mt-8">
        <SectionNav
          items={[
            { href: "#reach", label: "Who to write to" },
            ...(row.wallets.some((w) => w.direction === "outbound") ? [{ href: "#outbound", label: "Outbound" }] : []),
            ...(row.wallets.some((w) => w.direction === "inbound") ? [{ href: "#inbound", label: "Inbound" }] : []),
            ...(request ? [{ href: "#status", label: "Status" }] : []),
            ...(!request || since > 0 ? [{ href: "#ask", label: request ? "Follow-up" : "Draft a request" }] : []),
          ]}
        />
      </div>

      <Section id="reach" title="Who to write to" flush className="mt-10 md:mt-12" note="Where a request to this VASP is addressed, and how it is received.">
        <ReachFacts row={row} letter={letter} />
      </Section>

      <VaspWallets row={row} entries={entries} />

      {request ? (
        <Section
          id="status"
          title="Where the request stands"
          note="NOIR sends nothing. Send the letter through SAHYOG or the VASP’s own channel — NOIR is built to route into SAHYOG — then record here what you did and what came back."
        >
          <div className="mb-8 flex flex-wrap gap-3">
            <ButtonLink href={requestHref(row.vasp)} variant="outline" icon="file">
              Open the letter
            </ButtonLink>
            <ButtonLink href={`/api/desk/requests/${request.id}/export`} download variant="outline" icon="download">
              Request package (JSON)
            </ButtonLink>
          </div>
          <StatusLine request={request} />
          {due.length > 0 ? (
            <div className="mt-10">
              <FollowUpList list={due} showVasp={false} />
            </div>
          ) : null}
          {since === 0 ? (
            <Text size="small" tone="soft" className="mt-8">
              Every wallet routed to {row.vasp} is covered by this request. A follow-up form appears here if more wallets are filed.
            </Text>
          ) : null}
          {requests.length > 1 ? (
            <Text size="small" tone="soft" className="mt-8">
              {plural(requests.length - 1, "earlier request")} to {row.vasp} {requests.length === 2 ? "is" : "are"} in the{" "}
              <RouteLink href="/requests">register</RouteLink>. The one shown is the latest, currently {statusOf(request).replace("-", " ")}.
            </Text>
          ) : null}
        </Section>
      ) : null}

      {!request || since > 0 ? (
        <Section
          id="ask"
          title={request ? `Draft a follow-up for ${plural(since, "new wallet")}` : "One request to this VASP"}
          note="Every ask is ticked. Untick what you do not need. NOIR prints no statute: the legal basis is left blank on the letter for you to write."
        >
          <div className="flex max-w-prose flex-col gap-5">
            {request ? (
              <Notice tone="caution" title={`${plural(since, "wallet")} filed since the last request`}>
                The request drafted {utc(request.history[0].at)} does not cover them. Drafting again covers every wallet routed here now.
              </Notice>
            ) : null}
            <AskForm vasp={row.vasp} allowed={allowed} />
          </div>
        </Section>
      ) : null}
    </Page>
  );
}
