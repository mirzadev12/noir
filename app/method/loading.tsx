import { Loading } from "@/components/desk/Skeleton";
import { Page } from "@/components/noir";

export default function LoadingMethod() {
  return (
    <Page>
      <Loading what="the method" rows={6} cols={3} />
    </Page>
  );
}
