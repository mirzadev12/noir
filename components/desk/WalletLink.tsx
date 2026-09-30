import { ChainBadge, RouteLink } from "@/components/noir";
import { shortAddress, walletHref } from "@/lib/noir-format";

/**
 * A filed wallet as a table cell: its chain badge, and its address as a link to
 * its page. `short` shows it shortened from the middle, with the whole address in
 * the title, for tables whose wallet column is narrow.
 */
export function WalletLink({ wallet, chain, short = false }: { wallet: string; chain: string; short?: boolean }) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1" title={short ? wallet : undefined}>
      <ChainBadge chain={chain} />
      <RouteLink href={walletHref(wallet, chain)} mono>
        {short ? shortAddress(wallet) : wallet}
      </RouteLink>
    </span>
  );
}
