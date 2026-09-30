/**
 * Hero — the landing's first viewport, in NOIR's own composition: a lit hall
 * at night. The claim is set centred across it like the header of a departures
 * hall, the route lanes run through it, and at its far end stands the thing
 * NOIR does: one real wallet traced both ways, stepping out past the hall's
 * lower edge. The trace is a recorded chain read, attributed as the desk
 * attributes any filed wallet; nothing is typed in.
 */

import { ButtonLink } from "@/components/noir";
import type { LandingTrace } from "@/lib/landing";
import { Lanes } from "./Lanes";
import { TracePanel } from "./TracePanel";

export function Hero({ trace }: { trace: LandingTrace | null }) {
  return (
    <section className="relative min-w-0">
      {/* The hall. It ends above the panel's foot, so the trace stands half in it and half on the page. */}
      <div aria-hidden="true" className="stage pointer-events-none absolute inset-x-0 bottom-24 top-0 overflow-hidden md:bottom-32">
        <Lanes className="inset-x-0 bottom-0 top-[58%]" />
      </div>

      <div className="@container relative mx-auto min-w-0 max-w-5xl px-3 pt-14 text-center md:px-10 md:pt-24">
        <h1 className="type-sign-black rise text-display leading-[0.98] text-ink">
          <span className="block whitespace-nowrap">Every unknown wallet</span>
          <span className="text-gradient block whitespace-nowrap pb-2">has a destination.</span>
        </h1>
        <p className="rise mx-auto mt-7 max-w-prose px-2 text-lede text-ink-soft md:px-0" style={{ ["--rise" as string]: 1 }}>
          NOIR follows each wallet forward to <strong className="font-bold text-ink">the exchange account that received its money</strong> and back to{" "}
          <strong className="font-bold text-ink">the exchange that funded it</strong>, then files it there, so every exchange gets{" "}
          <strong className="font-bold text-ink">one request for all its cases</strong>.
        </p>
        <div className="rise mt-9 flex flex-wrap justify-center gap-3" style={{ ["--rise" as string]: 2 }}>
          <ButtonLink href="/desk" icon="arrow-right">
            Open the desk
          </ButtonLink>
          <ButtonLink href="#file" variant="outline" icon="arrow-down">
            Paste a wallet
          </ButtonLink>
        </div>
      </div>

      {trace ? (
        <div className="rise relative mx-auto mt-12 min-w-0 max-w-5xl px-3 md:mt-16 md:px-10" style={{ ["--rise" as string]: 3 }}>
          <TracePanel trace={trace} />
        </div>
      ) : (
        <div className="h-32" />
      )}
    </section>
  );
}
