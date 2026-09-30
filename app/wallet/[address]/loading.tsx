import { Loading } from "@/components/desk/Skeleton";
import { Page } from "@/components/noir";

export default function LoadingWallet() {
  return (
    <Page>
      <Loading what="the wallet" sign rows={3} cols={4} />
    </Page>
  );
}
