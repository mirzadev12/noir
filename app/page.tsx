import { IntakeBox } from "@/components/desk/IntakeBox";
import { RouteOf } from "@/components/desk/RouteOf";
import { WhatNoirDoes } from "@/components/desk/WhatNoirDoes";
import { ClosingBand } from "@/components/landing/ClosingBand";
import { Counted } from "@/components/landing/Counted";
import { Directions } from "@/components/landing/Directions";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { ManyToOne } from "@/components/landing/ManyToOne";
import { recordedDesk } from "@/components/landing/recorded";
import { ChainBadge, Heading, Page, RouteLink, Tag, Text } from "@/components/noir";
import { landingFigures, landingRoute } from "@/lib/landing";
import { count, utc, utcDay } from "@/lib/noir-format";
import { walletCounts } from "@/lib/noir-view";

/**
 * The argument. It is static: every figure, the departures board, the diagram's
 * exchange and the recorded route are computed from data/ when the site is
 * built, so nothing on it is typed in and it cannot drift from what the desk
 * can actually attribute.
 *
 * Its order: the hall (the claim and the board), what NOIR can name (counted),
 * the two directions, the intake, many cases meeting at one exchange, the four
 * stages, a recorded route, what NOIR does not say, and the hall again.
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

          <div className="mt-12 md:mt-16">
            <Counted
              items={[
                { value: count(f.registry.vasps), label: "VASPs NOIR can name, across TRON, Ethereum and Polygon" },
                { value: count(f.registry.depositAddresses), label: "customer deposit addresses in its table" },
                { value: count(f.registry.leChannels), label: "law-enforcement channels, read from each exchange’s own page" },
                { value: count(f.ofac.total), label: `OFAC-listed addresses every wallet is screened against${f.ofac.published ? ` (list of ${utcDay(f.ofac.published)})` : ""}` },
              ]}
            >
              Counted from the files in the repository when this site was built; nothing here is typed in. The deposit addresses are derived from{" "}
              {count(f.registry.seedWallets)} tagged exchange wallets. Sources: data/deposit-addresses.json, data/eth/, data/polygon/, data/le-contacts.json,
              data/risk-lists.json, data/sanctions-multichain.json. <RouteLink href="/registry">Open the registry</RouteLink>
            </Counted>
          </div>

          <div className="mt-20 md:mt-32">
            <Directions />
          </div>

          <section id="file" className="mt-20 grid min-w-0 scroll-mt-24 gap-10 md:mt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16" aria-labelledby="file-title">
            <div className="min-w-0">
              <Heading level={2} size="headline" id="file-title">
                Any chain. Any number of cases.
              </Heading>
              <Text size="lede" tone="soft" className="mt-4 max-w-prose">
                Paste one address or five hundred, from one case or many. Each line is checked before a single chain is read.
              </Text>
              <ul className="mt-7 flex min-w-0 flex-col">
                {(["tron", "ethereum", "polygon"] as const).map((chain) => (
                  <li key={chain} className="hair-t flex min-w-0 items-center gap-3 py-3 last:border-b last:border-rule">
                    <ChainBadge chain={chain} named />
                    <span className="text-small text-ink-soft">USDT traced both ways</span>
                  </li>
                ))}
              </ul>
              <Text size="small" tone="soft" className="mt-4 max-w-prose">
                Other chains are recognised by their address format and screened against the OFAC list. They are not traced.
              </Text>
            </div>
            <div className="min-w-0 rounded-stage border border-rule-strong bg-paper-2 p-5 md:p-8">
              <IntakeBox variant="hero" redirectTo="/desk" />
            </div>
          </section>

          {busiest ? (
            <section className="mt-20 min-w-0 md:mt-32" aria-labelledby="many-title">
              <Heading level={2} size="headline" id="many-title">
                Many cases. One exchange. One request.
              </Heading>
              <Text size="lede" tone="soft" className="mt-4 max-w-prose">
                Complaints arrive one at a time, but their money converges on a handful of exchanges. NOIR files every wallet under the exchange it
                routes to, so the officer writes once and tracks one reply.
              </Text>
              <div className="mt-10 rounded-stage border border-rule bg-paper-2 p-4 md:p-10">
                <ManyToOne vasp={busiest.vasp} wallets={walletCounts(busiest).wallets} />
              </div>
            </section>
          ) : null}

          <div className="mt-20 md:mt-32">
            <WhatNoirDoes />
          </div>

          {route ? (
            <section className="mt-20 min-w-0 md:mt-32" aria-labelledby="recorded-route">
              <Heading level={2} size="headline" id="recorded-route">
                A route, recorded
              </Heading>
              <p className="mt-4 flex flex-wrap items-center gap-2 text-small text-ink-soft">
                <Tag>Recorded</Tag>
                <span>read from the chain on {utc(route.provenance.generatedAt)}</span>
              </p>
              <div className="mt-10">
                <RouteOf record={route} draw />
              </div>
              <Text size="small" tone="soft" className="mt-6 max-w-prose">
                A real case, not an illustration: the USDT this wallet sent reached a customer deposit account at {route.outbound?.vasp}, and the desk files the wallet under it.
                {route.outbound?.evidence ? ` The label’s own evidence: “${route.outbound.evidence}”.` : ""}
              </Text>
            </section>
          ) : null}

          <section className="mt-20 min-w-0 md:mt-32" aria-labelledby="not-said">
            <Heading level={2} size="headline" id="not-said">
              What NOIR does not say
            </Heading>
            <ul className="mt-10 grid min-w-0 gap-x-12 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                ["It is a lookup, not a model.", "Attribution is a deterministic lookup against a provenance-tagged table. No language model decides it."],
                ["Confidence is evidence seen.", "How much evidence was seen, in words. It is never a chance of being right, and never a percentage."],
                ["Unreadable is not empty.", "A wallet that could not be read says so, and can be read again. It is never reported as holding nothing."],
                ["No statute, no rupees.", "The legal basis on a request is left blank for the officer. Amounts are USDT, and times are UTC."],
                ["An explorer tag is a lead.", "It is shown as written and never files a wallet under a VASP."],
                ["Built to route into SAHYOG.", "NOIR sends nothing itself. It records what the officer sent and what the VASP did."],
              ].map(([title, body]) => (
                <li key={title} className="rule-t min-w-0 pt-5">
                  <Heading level={3} size="lead">
                    {title}
                  </Heading>
                  <Text tone="soft" className="mt-2">
                    {body}
                  </Text>
                </li>
              ))}
            </ul>
          </section>
        </Page>
      </main>
      <ClosingBand>
        Of its {count(f.coverage.total)} capabilities, {count(f.coverage.built)} are built, {count(f.coverage.partial)} partial and {count(f.coverage.notBuilt)} not yet built. The Method
        page sets out each gap.
      </ClosingBand>
      <LandingFooter ofacPublished={f.ofac.published} />
    </>
  );
}
