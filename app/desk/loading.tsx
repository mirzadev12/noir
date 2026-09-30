import { Loading } from "@/components/desk/Skeleton";
import { Page } from "@/components/noir";

export default function LoadingDesk() {
  return (
    <Page>
      <Loading what="the desk" sign rows={6} cols={6} />
    </Page>
  );
}
