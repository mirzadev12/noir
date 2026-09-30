import { DeskEmpty, FailedList, OfacFlags, PendingList, ScreenedList, UnreadableList, UnroutedList } from "@/components/desk/DeskLists";
import { CaseLinks } from "@/components/desk/CaseLinks";
import { DeskUnavailable } from "@/components/desk/DeskUnavailable";
import { FollowUps } from "@/components/desk/FollowUps";
import { IntakeBox } from "@/components/desk/IntakeBox";
import { Refresher } from "@/components/desk/Refresher";
import { VaspBoard } from "@/components/desk/VaspBoard";
import { Lanes } from "@/components/landing/Lanes";
import { ButtonLink, Page, PageHead, RouteLink, Section, Sign } from "@/components/noir";
import { readDeskView } from "@/lib/desk-read";
import { amount, count, vaspHref } from "@/lib/noir-format";
import { boardCounts, boardRows } from "@/lib/desk-board";
import { deskTotals, nextVasp } from "@/lib/noir-view";

export const metadata = { title: "Desk" };
export const dynamic = "force-dynamic";

const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

export default async function DeskPage() {
  const read = await readDeskView();
  if (!read.ok) return <DeskUnavailable reason={read.reason} />;
  const { view, flagged } = read.value;
  const totals = deskTotals(view);
  const next = nextVasp(view.rows);
  const filedAnything = totals.wallets > 0;
  const board = boardRows(view.rows);
  const stages = boardCounts(board);
  const summary = [
    `${plural(totals.wallets, "wallet")} from ${plural(totals.cases, "case")}`,
    plural(totals.vasps, "VASP"),
    stages.none ? `${count(stages.none)} awaiting a request` : null,
    stages.drafted ? `${count(stages.drafted)} drafted, not sent` : null,
    stages.awaiting ? `${count(stages.awaiting)} awaiting a reply` : null,
    stages.answered ? `${count(stages.answered)} answered` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Page>
      <Refresher active={view.pending.length > 0} />
      <PageHead
        title="Desk"
        lede={
          filedAnything ? summary : "Wallets from many cases are filed here and grouped under the VASP they route to."
        }
        aside={
          <RouteLink href="#intake" arrow="down">
            File wallets
          </RouteLink>
        }
      />

      <div className="mt-8">
        {next ? (
          <Sign
            pointer
            flap
            title={next.row.vasp}
            action={
              <ButtonLink href={vaspHref(next.row.vasp)} icon="arrow-right">
                Open {next.row.vasp}
              </ButtonLink>
            }
          >
            <span>
              Write to this VASP next: {plural(next.uncovered, "wallet")} {next.row.request ? "filed since its last request" : "and no request yet"}.
            </span>
            <span>
              {[
                plural(next.row.caseRefs.length, "case"),
                next.row.outboundUsdt ? `${amount(next.row.outboundUsdt)} USDT reached its accounts` : null,
                next.row.inboundUsdt ? `${amount(next.row.inboundUsdt)} USDT came from its customers` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </Sign>
        ) : view.rows.length > 0 ? (
          <Sign
            title="Every wallet is covered"
            size="title"
            action={
              <ButtonLink href="/requests" icon="arrow-right">
                Open the register
              </ButtonLink>
            }
          >
            <span>Each VASP on the desk has a request. Record the answers as they arrive.</span>
          </Sign>
        ) : (
          <Sign title={filedAnything ? "Reading your wallets" : "File the first wallet"} size="title">
            <span>
              {filedAnything
                ? "The VASP to write to appears here as soon as the first wallet has been read."
                : "Paste it in the box, or drop a CSV. NOIR reads it and names the VASP to write to."}
            </span>
          </Sign>
        )}
      </div>

      <div className="mt-10 flex min-w-0 flex-col gap-14 lg:flex-row lg:gap-12">
        <div className="min-w-0 flex-1">
          <div className="mb-12 empty:hidden md:mb-16">
            <FollowUps rows={view.rows} now={new Date().toISOString()} />
          </div>
          <OfacFlags entries={flagged} />
          {view.rows.length > 0 ? (
            <Section
              title="Where the wallets go"
              count={plural(view.rows.length, "VASP")}
              flush={flagged.length === 0}
              note="One row per VASP, every case together. Open a row to see its wallets and draft the one request."
            >
              <div className="relative">
                <Lanes />
                <div className="relative">
                  <VaspBoard rows={board} />
                </div>
              </div>
            </Section>
          ) : null}
          {view.rows.length > 0 ? (
            <CaseLinks rows={view.rows} />
          ) : !filedAnything ? (
            <DeskEmpty />
          ) : null}

          <PendingList entries={view.pending} />
          <UnreadableList entries={view.unreadable} />
          <UnroutedList entries={view.unrouted} />
          <ScreenedList entries={view.screenedOnly} />
          <FailedList entries={view.failed} />
        </div>

        <aside id="intake" className="min-w-0 scroll-mt-6 lg:w-rail lg:shrink-0" aria-label="File wallets">
          <div className="rule-t pt-4 lg:sticky lg:top-8">
            <IntakeBox variant="rail" />
          </div>
        </aside>
      </div>
    </Page>
  );
}
