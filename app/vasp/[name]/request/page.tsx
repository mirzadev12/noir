import { notFound } from "next/navigation";
import { DeskUnavailable } from "@/components/desk/DeskUnavailable";
import { Letter } from "@/components/desk/Letter";
import { PrintButton } from "@/components/desk/PrintButton";
import { StatusTag } from "@/components/desk/StatusTag";
import { ButtonLink, Notice, Page, RouteLink } from "@/components/noir";
import { readVasp } from "@/lib/desk-read";
import { utc } from "@/lib/noir-format";
import { statusOf } from "@/lib/noir-view";
import { vaspHref } from "@/lib/noir-format";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/vasp/[name]/request">) {
  const { name } = await props.params;
  return { title: `Request to ${name}` };
}

export default async function RequestPage(props: PageProps<"/vasp/[name]/request">) {
  const { name } = await props.params;
  const read = await readVasp(name);
  if (!read.ok) return <DeskUnavailable reason={read.reason} />;
  if (read.value === null) notFound();
  const { row, letter } = read.value;
  const request = row.request;

  return (
    <Page width="letter">
      <div className="mb-6 flex min-w-0 flex-col gap-5 print:hidden">
        {request ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3">
            <StatusTag status={statusOf(request)} />
            <span className="text-small text-ink-soft">Drafted {utc(request.history[0].at)}</span>
            <div className="flex flex-wrap gap-3 sm:ml-auto">
              <PrintButton />
              <ButtonLink href={`/api/desk/requests/${request.id}/export`} download variant="outline" icon="download">
                Request package (JSON)
              </ButtonLink>
            </div>
          </div>
        ) : (
          <Notice tone="caution" title="This is a draft">
            No request to {row.vasp} has been recorded yet. Draft one to record it, keep its history and export its package.{" "}
            <RouteLink href={`${vaspHref(row.vasp)}#ask`} arrow="down">
              Choose what to ask
            </RouteLink>
          </Notice>
        )}
        {request ? (
          <p className="max-w-prose text-small text-ink-soft">
            NOIR sends nothing. Print this letter and send it through SAHYOG or {row.vasp}’s own channel, then record it as sent on the VASP’s page. The package is built to route
            into SAHYOG.
          </p>
        ) : null}
      </div>
      <Letter letter={letter} draftedBy={request ? request.history[0].by : null} />
    </Page>
  );
}
