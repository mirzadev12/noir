import { ButtonLink, Notice, Page, PageHead } from "@/components/noir";

/**
 * Drawn instead of a desk screen when the desk file cannot be read. It says so,
 * with the server's reason, exactly as the API answers 503. It never draws an
 * empty desk in its place: a shared desk must not appear to have vanished.
 */
export function DeskUnavailable({ reason }: { reason: string }) {
  return (
    <Page>
      <PageHead title="The desk could not be opened" lede="Nothing was changed, and nothing was lost." />
      <div className="mt-8 flex max-w-prose flex-col gap-6">
        <Notice tone="stop" title="This server cannot read the desk">
          {reason}
          <span className="mt-2 block">NOIR will not show an empty desk in its place. Ask whoever runs this server to check the desk file, then try again.</span>
        </Notice>
        <div>
          <ButtonLink href="/desk" variant="outline" icon="refresh">
            Try again
          </ButtonLink>
        </div>
      </div>
    </Page>
  );
}
