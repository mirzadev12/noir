import { Loading } from "@/components/desk/Skeleton";
import { Page } from "@/components/noir";

export default function LoadingRegistry() {
  return (
    <Page>
      <Loading what="the registry" rows={8} cols={6} />
    </Page>
  );
}
