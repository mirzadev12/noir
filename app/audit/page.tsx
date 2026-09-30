import { DeskUnavailable } from "@/components/desk/DeskUnavailable";
import { ButtonLink, Empty, Mono, Notice, Page, PageHead, RouteLink, Section, Table, Text, type TableRow } from "@/components/noir";
import { readAudit } from "@/lib/audit-store";
import { actorName } from "@/lib/identity";
import { count, shortAddress, utc } from "@/lib/noir-format";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const SHOWN = 50;

/** What the log recorded, in the officer's words. */
const ACTION: Record<string, string> = {
  trace: "Traced a wallet",
  "case.saved": "Saved a case",
  "case.removed": "Removed a case",
  "alerts.on": "Turned alerts on",
  "alerts.off": "Turned alerts off",
  "desk.filed": "Filed a wallet",
  "desk.removed": "Removed a wallet",
  "desk.reattributed": "Attributed a wallet again",
  "request.drafted": "Drafted a request",
  "request.status": "Recorded a status",
};

/** Every write to the desk is one line in a hash-chained log. This page re-checks the chain each time it opens. */
export default async function AuditPage() {
  let read;
  try {
    read = await readAudit();
  } catch (err) {
    return <DeskUnavailable reason={err instanceof Error ? err.message : "its storage could not be used"} />;
  }
  const { entries, check } = read;

  const latest = entries
    .map((entry, i) => ({ entry, line: i + 1 }))
    .reverse()
    .slice(0, SHOWN);

  const rows: TableRow[] = latest.map(({ entry, line }) =>
    entry
      ? {
          key: entry.hash,
          cells: [
            <span key="n" className="type-mono">
              {entry.seq}
            </span>,
            utc(entry.at),
            ACTION[entry.action] ?? entry.action,
            actorName(entry.actor),
            entry.address ? <Mono key="a">{shortAddress(entry.address)}</Mono> : <span className="text-ink-soft">—</span>,
          ],
        }
      : {
          key: `line-${line}`,
          cells: [
            <span key="n" className="type-mono">
              —
            </span>,
            <span key="x" className="text-ink-soft">
              Line {line} could not be read as an entry
            </span>,
            "",
            "",
            "",
          ],
        },
  );

  return (
    <Page>
      <PageHead
        title="Audit log"
        lede="Every filing, request and status change is written to a log where each entry carries the hash of the one before it. Change or remove a line and the chain no longer matches."
      />

      <div className="mt-8 max-w-prose">
        {check.intact ? (
          <Notice title="The chain is intact">
            {check.entries === 0 ? (
              <>No entry has been written yet, so there is nothing to compare.</>
            ) : (
              <>
                {count(check.entries)} {check.entries === 1 ? "entry matches" : "entries match"} its neighbours from the first to the last. Latest hash <Mono>{check.head}</Mono>
              </>
            )}
          </Notice>
        ) : (
          <Notice tone="stop" title={`The chain breaks at entry ${check.brokenAt}`}>
            {check.reason} Entries after it cannot be trusted until the log is checked against a copy.
          </Notice>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-small text-ink-soft">Check it elsewhere</span>
        <ButtonLink href="/api/audit?format=jsonl" download variant="outline" size="sm" icon="download">
          The log as written
        </ButtonLink>
        <span className="text-small text-ink-soft">
          then <span className="type-mono">node scripts/verify-audit.mjs noir-audit.jsonl</span>
        </span>
      </div>

      <Section title="Latest entries" note={entries.length > SHOWN ? `The latest ${SHOWN} of ${count(entries.length)}, newest first. Times are UTC.` : "Newest first. Times are UTC."}>
        {rows.length === 0 ? (
          <Empty title="No entry has been written yet">File a wallet on the desk and the first entry appears here.</Empty>
        ) : (
          <Table caption="The latest audit entries" columns={[{ label: "No." }, { label: "When" }, { label: "What" }, { label: "Who" }, { label: "Wallet" }]} rows={rows} />
        )}
      </Section>

      <Text className="mt-8 text-ink-soft">
        The log records that things happened and who did them. It does not decide anything. <RouteLink href="/method">How NOIR decides</RouteLink>
      </Text>
    </Page>
  );
}
