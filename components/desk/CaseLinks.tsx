/**
 * CaseLinks — accounts that link cases: filed wallets whose money reached the
 * same customer deposit account at one VASP. One account is one accountholder,
 * so one KYC answer covers every case listed here, and the cases may be one
 * network. Only outbound accounts count; being funded by the same exchange links
 * nobody. See lib/shared-accounts.ts.
 */

import Link from "next/link";
import { ChainBadge, Mono, Section, Tag } from "@/components/noir";
import type { VaspRow } from "@/lib/desk-types";
import { sharedAccounts } from "@/lib/shared-accounts";
import { amount, vaspHref, walletHref } from "@/lib/noir-format";

export function CaseLinks({ rows }: { rows: VaspRow[] }) {
  const links = sharedAccounts(rows);
  if (links.length === 0) return null;
  const cross = links.filter((l) => l.crossCase).length;
  return (
    <Section
      title="Accounts that link cases"
      count={cross ? `${cross} across cases` : `${links.length} shared`}
      note="These wallets sent money into the same customer account at one exchange. One accountholder is behind that account, so one KYC answer speaks to every case below, and the cases may be one network."
    >
      <ul className="rule-t">
        {links.map((l) => (
          <li key={`${l.vasp}-${l.account}`} className="hair-b py-5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <span className="type-sign text-lead">
                <Link href={vaspHref(l.vasp)} className="text-ink no-underline hover:text-route">
                  {l.vasp}
                </Link>{" "}
                customer account
              </span>
              {l.crossCase ? <Tag tone="solid">{l.caseRefs.length} cases, one account</Tag> : <Tag>One case, one account</Tag>}
              <ChainBadge chain={l.chain} />
              <Mono copy>{l.account}</Mono>
            </div>
            <p className="mt-2 text-small text-ink-soft">
              {amount(l.usdt)} USDT from {l.wallets.length} wallets reached it · {l.caseRefs.join(" · ") || "no case reference"}
            </p>
            <ul className="mt-3 flex flex-col gap-1 text-small">
              {l.wallets.map((w) => (
                <li key={w.entryId} className="flex min-w-0 flex-wrap items-baseline gap-x-3">
                  <Link href={walletHref(w.wallet, l.chain)} className="type-mono wrap-anywhere">
                    {w.wallet}
                  </Link>
                  <span className="text-ink-soft">
                    {amount(w.usdt)} USDT · {w.caseRefs.join(", ") || "no case"}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Section>
  );
}
