import { ButtonLink, Heading, Text } from "@/components/noir";

/**
 * ClosingBand — the landing's last word: the hall again, lit, with one call to
 * action and the honest count of what is built.
 *
 * Props
 *   children  the sentence under the heading (the coverage count, from lib/coverage.ts)
 */
export function ClosingBand({ children }: { children?: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-page min-w-0 px-gutter pb-16 pt-8 md:pb-24 md:pt-20" aria-labelledby="closing">
      <div className="stage flex min-w-0 flex-col items-center px-6 py-16 text-center md:px-12 md:py-24">
        <Heading level={2} size="headline" id="closing">
          Start with one wallet.
        </Heading>
        {children ? (
          <Text size="lede" tone="soft" className="mt-4 max-w-prose">
            {children}
          </Text>
        ) : null}
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/desk" icon="arrow-right">
            Open the desk
          </ButtonLink>
          <ButtonLink href="/method" variant="outline">
            Read the method
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
