/**
 * Directions — the two ways NOIR reads a wallet, drawn as one route: money
 * arrives from the left and leaves to the right, so inbound stands on the left,
 * outbound on the right, and the wallet sits on the seam between them with an
 * arrow running into it and an arrow running out. The light in each panel comes
 * from the side its money travels to or from.
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
        <article className="lit-in flex min-h-64 min-w-0 flex-col justify-between gap-10 p-6 md:min-h-80 md:p-9">
          {/* Side by side, the arrow runs into the wallet on the seam; stacked on a phone, it points back the way the money came. */}
          <span className="text-route md:hidden">
            <Icon name="arrow-left" size="lg" />
          </span>
          <span className="hidden text-route md:mr-16 md:block md:self-end">
            <Icon name="arrow-right" size="lg" />
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
        <article className="lit-out flex min-h-64 min-w-0 flex-col justify-between gap-10 p-6 md:min-h-80 md:p-9">
          <Icon name="arrow-right" size="lg" className="text-ink md:ml-16" />
          <div className="min-w-0">
            <Heading level={3} size="headline">
              Outbound
            </Heading>
            <Text size="lede" className="mt-3">
              Where its money went: the exchange and the deposit account that received it.
            </Text>
          </div>
        </article>
        {/* The wallet, on the seam: both panels are about the same one. */}
        <span
          aria-hidden="true"
          className="type-mono rule-box absolute left-1/2 top-9 hidden -translate-x-1/2 rounded-full bg-paper px-4 py-2 text-small text-ink md:inline-block"
        >
          the wallet
        </span>
      </div>
    </section>
  );
}
