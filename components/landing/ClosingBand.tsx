import { ButtonLink, Heading } from "@/components/noir";

/** ClosingBand — one call to action at the foot of the landing page, on a quiet band. */
export function ClosingBand() {
  return (
    <section className="bg-paper-2" aria-labelledby="closing">
      <div className="mx-auto flex w-full max-w-page min-w-0 flex-col gap-6 px-gutter py-12 md:flex-row md:items-center md:justify-between md:py-16">
        <Heading level={2} size="title" id="closing">
          Start with one wallet.
        </Heading>
        <div className="flex flex-wrap gap-3">
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
