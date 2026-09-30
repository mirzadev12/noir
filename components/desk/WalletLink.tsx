import { ChainBadge, RouteLink } from "@/components/noir";
import { walletHref } from "@/lib/noir-format";

/** A filed wallet as a table cell: its chain badge, and its whole address as a link to its page. */
export function WalletLink({ wallet, chain }: { wallet: string; chain: string }) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
      <ChainBadge chain={chain} />
      <RouteLink href={walletHref(wallet, chain)} mono>
        {wallet}
      </RouteLink>
    </span>
  );
}
