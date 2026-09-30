import { Loading } from "@/components/desk/Skeleton";
import { Page } from "@/components/noir";

export default function LoadingRequests() {
  return (
    <Page>
      <Loading what="the register" rows={5} cols={6} />
    </Page>
  );
}
