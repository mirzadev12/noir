import { DeskUnavailable } from "@/components/desk/DeskUnavailable";
import { StatusTag } from "@/components/desk/StatusTag";
import { ButtonLink, Empty, Page, PageHead, RouteLink, Section, Table, Text, type TableRow } from "@/components/noir";
import { readRegister } from "@/lib/desk-read";
import { count, vaspHref } from "@/lib/noir-format";
import { ASK_SHORT, eventTime, requestHref, sentAndAnswered, statusOf } from "@/lib/noir-view";
import { STATUS_LABEL } from "@/lib/requests";

export const metadata = { title: "Requests" };
export const dynamic = "force-dynamic";

const noun = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;
const dash = <span className="text-ink-soft">—</span>;

export default async function RequestsPage() {
  const read = await readRegister();
  if (!read.ok) return <DeskUnavailable reason={read.reason} />;
  const { requests, responses } = read.value;

  const rows: TableRow[] = requests.map(({ request }) => {
    const { sent, answer } = sentAndAnswered(request);
    const reference = [...request.history].reverse().find((h) => h.reference)?.reference ?? null;
    return {
      key: request.id,
      cells: [
        <RouteLink key="v" href={vaspHref(request.vasp)}>
          <strong>{request.vasp}</strong>
        </RouteLink>,
        request.asks.map((a) => ASK_SHORT[a]).join(", "),
        <span key="w" className="type-mono">
          {count(request.entryIds.length)}
        </span>,
        <StatusTag key="s" status={statusOf(request)} />,
        sent ? eventTime(sent) : dash,
        answer ? (
          <span key="a">
            {STATUS_LABEL[answer.status]}
            <span className="block text-small text-ink-soft">{eventTime(answer)}</span>
          </span>
        ) : (
          dash
        ),
        reference ? <span key="r" className="type-mono text-small">{reference}</span> : dash,
        <RouteLink key="l" href={requestHref(request.vasp)} arrow="right">
          Letter
        </RouteLink>,
      ],
    };
  });

  return (
    <Page>
      <PageHead
        title="Requests"
        lede={
          requests.length
            ? `${noun(requests.length, "request")}, newest first. NOIR sends nothing; it records what the officer sent and what each VASP did.`
            : "One consolidated request per VASP is drafted from the desk and tracked here."
        }
      />

      <div className="mt-8">
        {requests.length === 0 ? (
          <Empty
            title="No request has been drafted yet"
            action={
              <ButtonLink href="/desk" icon="arrow-right">
                Go to the desk
              </ButtonLink>
            }
          >
            Open a VASP on the desk, choose what to ask and draft one request. It appears here with its status, and the register keeps every reply.
          </Empty>
        ) : (
          <Table
            caption="Every request, newest first"
            columns={[
              { label: "VASP" },
              { label: "Asks" },
              { label: "Wallets", align: "end" },
              { label: "Status" },
              { label: "Sent" },
              { label: "Answered" },
              { label: "Reference" },
              { label: "" },
            ]}
            rows={rows}
          />
        )}
      </div>

      <Section
        title="How VASPs answered"
        note={`Counted from the ${noun(requests.length, "request")} recorded on this desk. A few requests are not a measure of an exchange; read these as a log, not a ranking.`}
      >
        {responses.length === 0 ? (
          <Text tone="soft">0 requests are recorded, so there is nothing to count yet.</Text>
        ) : (
          <Table
            caption="How each VASP answered"
            columns={[
              { label: "VASP" },
              { label: "Requests", align: "end" },
              { label: "Sent", align: "end" },
              { label: "Answered", align: "end" },
              { label: "Frozen", align: "end" },
              { label: "Refused", align: "end" },
              { label: "No response", align: "end" },
              { label: "Median days to answer", align: "end" },
            ]}
            rows={responses.map((r) => ({
              key: r.vasp,
              cells: [
                <strong key="v">{r.vasp}</strong>,
                ...[r.drafted, r.sent, r.answered, r.frozen, r.refused, r.noResponse].map((n, i) => (
                  <span key={i} className="type-mono">
                    {count(n)}
                  </span>
                )),
                <span key="m" className="type-mono">
                  {r.medianDaysToAnswer === null ? "—" : r.medianDaysToAnswer}
                </span>,
              ],
            }))}
          />
        )}
      </Section>
    </Page>
  );
}
