import { Loading } from "@/components/desk/Skeleton";
import { Page } from "@/components/noir";

export default function LoadingLetter() {
  return (
    <Page width="letter">
      <Loading what="the request" rows={4} cols={5} />
    </Page>
  );
}
