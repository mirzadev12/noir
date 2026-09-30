import { ButtonLink, Notice, Page, PageHead } from "@/components/noir";

export const metadata = { title: "No such wallet on the desk" };

/** A wallet page is opened from the desk; this is shown when the wallet is not filed there. */
export default function WalletNotFound() {
  return (
    <Page>
      <PageHead title="That wallet is not on the desk" lede="It may have been taken off, or filed on another chain." />
      <div className="mt-8 flex max-w-prose flex-col gap-6">
        <Notice>A 0x address is a different wallet on Ethereum and on Polygon; the link names the chain it was filed on.</Notice>
        <ButtonLink href="/desk" icon="arrow-right">
          Go to the desk
        </ButtonLink>
      </div>
    </Page>
  );
}
