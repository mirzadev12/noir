import { Board, Heading, Icon, Notice, Page, PageHead, RouteLink, Section, Table, Tag, Text, type TableRow } from "@/components/noir";
import { COVERAGE, coverageCounts, type CoverageStatus } from "@/lib/coverage";
import { count } from "@/lib/noir-format";
import { TIER_LINE } from "@/lib/noir-view";

export const metadata = { title: "Method" };

const STATUS: Record<CoverageStatus, { tone: "ok" | "wait" | "quiet"; label: string; icon?: "check" }> = {
  built: { tone: "ok", label: "Built", icon: "check" },
  partial: { tone: "wait", label: "Partial" },
  "not-built": { tone: "quiet", label: "Not built" },
};
const TIER_NAMES: [string, string][] = [
  ["ground_truth", "Explorer-tagged"],
  ["heuristic", "Derived by sweep heuristic"],
  ["sanctions", "OFAC SDN list"],
  ["community", "Community list"],
];

/** What NOIR covers, how it decides, and what it will not say. */
export default function MethodPage() {
  const c = coverageCounts();
  const rows: TableRow[] = COVERAGE.map((item, i) => ({
    key: item.id,
    cells: [
      <span key="n" className="type-mono">{i + 1}</span>,
      <span key="p" className="type-sign text-body text-ink">
        {item.name}
      </span>,
      <Tag key="s" tone={STATUS[item.status].tone} icon={STATUS[item.status].icon}>
        {STATUS[item.status].label}
      </Tag>,
      <span key="a" className="flex min-w-0 flex-col gap-2">
        <span>{item.answer}</span>
        {item.gap ? (
          <span className="rule-l pl-3 text-small">
            <strong>Missing:</strong> {item.gap}
          </span>
        ) : null}
      </span>,
      item.see ? (
        <RouteLink key="l" href={item.see} arrow="right">
          See it
        </RouteLink>
      ) : null,
    ],
  }));

  return (
    <Page>
      <PageHead
        title="Method"
        lede="What NOIR does for each thing an investigator needs from it, how it decides, and what it will not say. Where something is partial or not built, the gap is stated."
      />

      <Section title="How NOIR decides" flush className="mt-12" note="Every step is a lookup or a count. No model decides anything, and the same wallet gives the same answer on any day the data is the same.">
        <div className="grid min-w-0 gap-10 md:grid-cols-2">
          <div className="min-w-0">
            <Heading level={3} size="lead" className="flex items-center gap-2">
              <Icon name="arrow-right" /> Outbound: where its money went
            </Heading>
            <ol className="mt-3 flex list-decimal flex-col gap-2 pl-6">
              <li>Follow the wallet’s USDT forward, hop by hop, on TRON, Ethereum or Polygon.</li>
              <li>Stop at the first exchange wallet or customer deposit address in NOIR’s label table.</li>
              <li>Name that VASP and the account there. That account is what a freeze names.</li>
              <li>If the trail ends at a mixer, a contract or a sanctioned address instead, say so.</li>
            </ol>
          </div>
          <div className="min-w-0">
            <Heading level={3} size="lead" className="flex items-center gap-2">
              <Icon name="arrow-left" /> Inbound: who funded it
            </Heading>
            <ol className="mt-3 flex list-decimal flex-col gap-2 pl-6">
              <li>Read who paid the wallet.</li>
              <li>Read one hop further back: who funded those payers.</li>
              <li>Name the exchanges from NOIR’s table among them. Each can say whose money it was.</li>
              <li>A funder known only by an explorer’s tag is a lead, shown as tagged, never filed.</li>
            </ol>
          </div>
        </div>
      </Section>

      <Section title="What the evidence words mean" note="Confidence is how much evidence was seen, never a chance of being right. NOIR words it, and names the tier the evidence comes from.">
        <Table
          caption="Evidence tiers"
          columns={[{ label: "Tier" }, { label: "What it rests on" }]}
          rows={TIER_NAMES.map(([key, name]) => ({ key, cells: [<strong key="t">{name}</strong>, TIER_LINE[key]] }))}
        />
        <Text size="small" tone="soft" className="mt-4">
          The words are Strong, Moderate and Limited evidence. A limited reading is still printed, with its own caution, so the doubt travels with the name.
        </Text>
      </Section>

      <Section title="What NOIR covers, item by item" note="Each capability, what NOIR does for it, and where it can be seen.">
        <Text className="max-w-prose">
          Of {count(c.total)} capabilities, <strong className="font-bold text-ink">{count(c.built)} are built</strong>, {count(c.partial)} are partial and{" "}
          {count(c.notBuilt)} is not built yet. Each partial or missing one says exactly what is missing.
        </Text>
        <div className="mt-8">
          <Table
            caption="NOIR's capabilities and what each does"
            columns={[{ label: "No." }, { label: "Capability" }, { label: "Status" }, { label: "What NOIR does" }, { label: "" }]}
            rows={rows}
          />
        </div>
      </Section>

      <Section title="What NOIR does not say">
        <ul className="grid min-w-0 gap-x-10 gap-y-6 md:grid-cols-2">
          {[
            ["It is a lookup, not a model.", "Attribution is a deterministic lookup against a provenance-tagged table."],
            ["Confidence is evidence seen.", "It is worded as evidence, never as accuracy or a percentage."],
            ["Unreadable is not empty.", "A wallet that could not be read says so and can be read again."],
            ["No statute.", "The legal basis on a request is a blank line for the officer."],
            ["Built to route into SAHYOG.", "It is designed, not integrated. NOIR sends nothing and records what the officer did."],
            ["FIU-IND is a dated fact.", "The annexure of 4 December 2023 lists some VASPs; a VASP it does not list is not described at all."],
            ["No conversion.", "Amounts are USDT. Times are UTC and absolute."],
            ["Tags are leads.", "An explorer’s tag is shown as written and never files a wallet."],
          ].map(([title, body]) => (
            <li key={title} className="hair-t min-w-0 pt-4">
              <Heading level={3} size="lead">
                {title}
              </Heading>
              <Text tone="soft" className="mt-1">
                {body}
              </Text>
            </li>
          ))}
        </ul>
        <Notice className="mt-10">Counts on this page are computed from lib/coverage.ts and the label files when the site is built.</Notice>
      </Section>
    </Page>
  );
}
