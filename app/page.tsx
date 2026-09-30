import { IntakeBox } from "@/components/desk/IntakeBox";
import { RouteOf } from "@/components/desk/RouteOf";
import { WhatNoirDoes } from "@/components/desk/WhatNoirDoes";
import { ClosingBand } from "@/components/landing/ClosingBand";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ManyToOne } from "@/components/landing/ManyToOne";
import { recordedDesk } from "@/components/landing/recorded";
import { Heading, Icon, Page, Section, Table, Tag, Text } from "@/components/noir";
import { landingFigures, landingRoute } from "@/lib/landing";
import { count, utc, utcDay } from "@/lib/noir-format";
import { walletCounts } from "@/lib/noir-view";

/**
 * The argument. It has its own frame (a top band and a footer, no sidebar) and
 * is static: every figure, the departures board, the diagram's exchange and the
 * recorded route are computed from data/ when the site is built, so nothing on
 * it is typed in and it cannot drift from what the desk can actually attribute.
 */
export default async function Landing() {
  const [recorded, desk] = await Promise.all([landingRoute(), recordedDesk()]);
  const f = landingFigures();
  const route = recorded?.outbound ? recorded : null;
  const busiest = [...desk.rows].sort((a, b) => walletCounts(b).wallets - walletCounts(a).wallets)[0] ?? null;

  return (
    <>
      <main id="main" className="min-w-0">
        <Page>
          <Hero desk={desk} />

          <section id="file" className="mt-16 grid min-w-0 scroll-mt-24 gap-12 md:mt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16" aria-labelledby="file-title">
            <div className="min-w-0">
              <Heading level={2} size="title" id="file-title">
                Any chain. Any number of cases.
              </Heading>
              <Text tone="soft" className="mt-3 max-w-prose">
                Any mix of TRON, Ethereum and Polygon addresses, from any number of cases. Each line is checked before a single chain read, and
                every wallet is read both ways.
              </Text>
              <ul className="mt-6 flex flex-col">
                <li className="hair-t flex gap-3 py-4">
                  <Icon name="arrow-right" size="lg" className="mt-0.5 text-signal" />
                  <Text>
                    <strong className="font-bold text-ink">Outbound</strong>
                    <span className="text-ink-soft"> — where its money went: the exchange deposit account it reached.</span>
                  </Text>
                </li>
                <li className="hair-t hair-b flex gap-3 py-4">
                  <Icon name="arrow-left" size="lg" className="mt-0.5 text-signal" />
                  <Text>
                    <strong className="font-bold text-ink">Inbound</strong>
                    <span className="text-ink-soft"> — who funded it: the exchange that funded its payers.</span>
                  </Text>
                </li>
              </ul>
            </div>
            <div className="min-w-0 rounded-control border border-rule-strong bg-paper-2 p-5 md:p-7">
              <IntakeBox variant="hero" redirectTo="/desk" />
            </div>
          </section>

          {busiest ? (
            <section className="mt-16 min-w-0 md:mt-24" aria-labelledby="many-title">
              <Heading level={2} size="title" id="many-title">
                Many cases. One exchange. <span className="text-route">One request.</span>
              </Heading>
              <Text tone="soft" className="mt-3 max-w-prose">
                Complaints arrive one at a time, but their money converges on a handful of exchanges. NOIR files every wallet under the exchange it
                routes to, so the officer writes once and tracks one reply.
              </Text>
              <div className="mt-8 rounded-control border border-rule bg-paper-2 p-4 md:p-8">
                <ManyToOne vasp={busiest.vasp} wallets={walletCounts(busiest).wallets} />
              </div>
            </section>
          ) : null}

          <div className="mt-16 md:mt-24">
            <WhatNoirDoes />
          </div>

          {route ? (
            <section className="mt-16 min-w-0 md:mt-24" aria-labelledby="recorded-route">
              <Heading level={2} size="title" id="recorded-route">
                A route, recorded
              </Heading>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-small text-ink-soft">
                <Tag>Recorded</Tag>
                <span>read from the chain on {utc(route.provenance.generatedAt)}</span>
              </p>
              <div className="mt-8">
                <RouteOf record={route} draw />
              </div>
              <Text size="small" tone="soft" className="mt-6 max-w-prose">
                A real case, not an illustration: the USDT this wallet sent reached a customer deposit account at {route.outbound?.vasp}, and the desk files the wallet under it.
                {route.outbound?.evidence ? ` The label’s own evidence: “${route.outbound.evidence}”.` : ""}
              </Text>
            </section>
          ) : null}

          <Section title="What NOIR can name" note="Counted from the files and lists in the repository when this site was built. Nothing here is typed in.">
            <Table
              caption="What NOIR can name, counted from its data"
              columns={[{ label: "What it can name" }, { label: "Counted from" }]}
              rows={[
                {
                  key: "vasps",
                  cells: [
                    <span key="s">
                      <b className="type-mono">{count(f.registry.vasps)}</b> VASPs, across {count(f.registry.chains)} chains: TRON, Ethereum and Polygon.
                    </span>,
                    "The exchange wallets and deposit addresses in data/",
                  ],
                },
                {
                  key: "deposits",
                  cells: [
                    <span key="s">
                      <b className="type-mono">{count(f.registry.depositAddresses)}</b> customer deposit addresses, derived from <b className="type-mono">{count(f.registry.seedWallets)}</b> tagged
                      exchange wallets.
                    </span>,
                    "data/deposit-addresses.json, data/eth/, data/polygon/",
                  ],
                },
                {
                  key: "le",
                  cells: [
                    <span key="s">
                      <b className="type-mono">{count(f.registry.leChannels)}</b> law-enforcement channels, each read from the exchange’s own page.
                    </span>,
                    "data/le-contacts.json",
                  ],
                },
                {
                  key: "ofac",
                  cells: [
                    <span key="s">
                      <b className="type-mono">{count(f.ofac.total)}</b> OFAC addresses screened, on every chain.
                    </span>,
                    `data/risk-lists.json and data/sanctions-multichain.json${f.ofac.published ? `, list of ${utcDay(f.ofac.published)}` : ""}`,
                  ],
                },
                {
                  key: "caps",
                  cells: [
                    <span key="s">
                      <b className="type-mono">{count(f.coverage.built)}</b> of <b className="type-mono">{count(f.coverage.total)}</b> capabilities built; {count(f.coverage.partial)} partial and{" "}
                      {count(f.coverage.notBuilt)} not built, each set out on the Method page.
                    </span>,
                    "lib/coverage.ts",
                  ],
                },
              ]}
            />
          </Section>

          <Section title="What NOIR does not say">
            <ul className="grid min-w-0 gap-x-10 gap-y-6 md:grid-cols-2">
              {[
                ["It is a lookup, not a model.", "Attribution is a deterministic lookup against a provenance-tagged table. No language model decides it."],
                ["Confidence is evidence seen.", "How much evidence was seen, in words. It is never a chance of being right, and never a percentage."],
                ["Unreadable is not empty.", "A wallet that could not be read says so, and can be read again. It is never reported as holding nothing."],
                ["No statute, no rupees.", "The legal basis on a request is left blank for the officer. Amounts are USDT, and times are UTC."],
                ["An explorer tag is a lead.", "It is shown as written and never files a wallet under a VASP."],
                ["Built to route into SAHYOG.", "NOIR sends nothing itself. It records what the officer sent and what the VASP did."],
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
          </Section>
        </Page>
      </main>
      <ClosingBand />
      <LandingFooter ofacPublished={f.ofac.published} />
    </>
  );
}
