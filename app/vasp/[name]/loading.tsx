import { Loading } from "@/components/desk/Skeleton";
import { Page } from "@/components/noir";

export default function LoadingVasp() {
  return (
    <Page>
      <Loading what="the VASP" sign rows={4} cols={5} />
    </Page>
  );
}
