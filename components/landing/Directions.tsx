/**
 * Directions — the two ways NOIR reads a wallet, drawn as one route: money
 * arrives from the left and leaves to the right, so inbound stands on the left,
 * outbound on the right, and NOIR's route line runs through both panels with
 * the wallet on the seam between them: from the exchange that funded it, to the
 * account that received its money. The light in each panel comes from the side
 * its money travels to or from.
 *
 * Stacked on a phone there is no seam to cross, so each panel carries its own
 * arrow instead: back for inbound, forward for outbound.
 */

import { Heading, Icon, Text } from "@/components/noir";

export function Directions() {
  return (
    <section aria-labelledby="directions-title" className="min-w-0">
      <Heading level={2} size="headline" id="directions-title">
        Read both ways.
      </Heading>
      <Text size="lede" tone="soft" className="mt-4 max-w-prose">
        A wallet&rsquo;s money leaves a trail forward and a trail back. NOIR reads both, and names an exchange only when its own table can.
      </Text>

      <div className="relative mt-10 grid min-w-0 gap-5 md:grid-cols-2">
        <article className="lit-in flex min-h-64 min-w-0 flex-col justify-between gap-10 p-6 md:min-h-80 md:justify-end md:p-9">
          <span className="text-route md:hidden">
            <Icon name="arrow-left" size="lg" />
          </span>
          <div className="min-w-0">
            <Heading level={3} size="headline">
              Inbound
            </Heading>
            <Text size="lede" className="mt-3">
              Who funded it: the exchange that funded its payers, one hop back.
            </Text>
          </div>
        </article>
        <article className="lit-out flex min-h-64 min-w-0 flex-col justify-between gap-10 p-6 md:min-h-80 md:justify-end md:p-9">
          <span className="text-ink md:hidden">
            <Icon name="arrow-right" size="lg" />
          </span>
          <div className="min-w-0">
            <Heading level={3} size="headline">
              Outbound
            </Heading>
            <Text size="lede" className="mt-3">
              Where its money went: the exchange and the deposit account that received it.
            </Text>
          </div>
        </article>

        {/* The route, from md up: origin, the line, the wallet on the seam, the line, terminus. The same stations a wallet's own route is drawn with. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-9 top-9 hidden h-10 items-center md:flex">
          <span className="size-6 shrink-0 bg-ink" />
          <span className="route-bar-x min-w-0 flex-1" />
          <span className="type-sign rule-box shrink-0 rounded-full bg-paper px-4 py-2 text-small text-ink">the wallet</span>
          <span className="route-bar-x min-w-0 flex-1" />
          <span className="rule-box size-8 shrink-0 bg-signal" />
        </div>
      </div>
    </section>
  );
}
