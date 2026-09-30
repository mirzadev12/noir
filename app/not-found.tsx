import { ButtonLink, Notice, Page, PageHead } from "@/components/noir";

export const metadata = { title: "Not found" };

/** Any address that leads nowhere on NOIR: it says so and points back. */
export default function NotFound() {
  return (
    <Page>
      <PageHead title="No such destination" lede="Nothing on NOIR sits at this address." />
      <div className="mt-8 flex max-w-prose flex-col gap-6">
        <Notice>The link may be out of date, or the wallet may have been taken off the desk. Wallets and VASPs are opened from the desk.</Notice>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/desk" icon="arrow-right">
            Go to the desk
          </ButtonLink>
          <ButtonLink href="/registry" variant="outline">
            Open the registry
          </ButtonLink>
        </div>
      </div>
    </Page>
  );
}
