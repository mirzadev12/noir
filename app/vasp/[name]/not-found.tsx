import { ButtonLink, Notice, Page, PageHead } from "@/components/noir";

export const metadata = { title: "No such VASP on the desk" };

/** A VASP page is opened from the desk; this one is shown when nothing on the desk routes to the name. */
export default function VaspNotFound() {
  return (
    <Page>
      <PageHead title="No wallet on the desk routes to that VASP" lede="A VASP appears on the desk once a filed wallet routes to it." />
      <div className="mt-8 flex max-w-prose flex-col gap-6">
        <Notice>The wallet may have been taken off the desk, or it may not have been read yet. The registry lists every VASP NOIR can name.</Notice>
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
