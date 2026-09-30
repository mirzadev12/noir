import { Loading } from "@/components/desk/Skeleton";
import { Page } from "@/components/noir";

export default function LoadingCases() {
  return (
    <Page>
      <Loading what="the cases" rows={5} cols={4} />
    </Page>
  );
}
