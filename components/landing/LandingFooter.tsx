import Link from "next/link";
import contacts from "@/data/le-contacts.json";
import { Icon } from "@/components/noir";
import { FIU_SOURCE } from "@/lib/fiu";
import { utcDay } from "@/lib/noir-format";

/**
 * LandingFooter — the hall seen from outside, its light low on the horizon: who
 * this is for, where its data comes from and when, and what NOIR does not claim.
 * Every date is read from the data it names: the OFAC list's publication date,
 * the FIU-IND annexure's date and the day the law-enforcement contacts were read.
 */
export function LandingFooter({ ofacPublished }: { ofacPublished: string | null }) {
  const day = (d: string) => utcDay(`${d}T00:00:00Z`);
  return (
    <footer className="on-ink horizon text-on-ink">
      <div className="mx-auto w-full max-w-page min-w-0 px-gutter pt-12 md:pt-16">
        {/* The wordmark, a rule running from it, and the sign it all answers to. */}
        <div className="flex min-w-0 items-center gap-5">
          <p className="type-sign-black inline-flex shrink-0 items-center text-headline leading-none" aria-label="NOIR">
            <span aria-hidden="true" className="rounded-control bg-signal px-3 py-2 text-on-light">
              NO
            </span>
            <span aria-hidden="true" className="pl-1 text-signal">
              IR
            </span>
          </p>
          <span aria-hidden="true" className="h-px min-w-6 flex-1 bg-on-ink-soft/40" />
          <p className="type-sign hidden shrink-0 items-center gap-2 text-lead sm:inline-flex">
            Wallet <Icon name="arrow-right" className="text-signal" /> VASP
          </p>
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-page min-w-0 gap-10 px-gutter pb-24 pt-10 md:grid-cols-3 md:pb-32">
        <div className="min-w-0">
          <p className="text-body">For Indian cyber-crime investigators</p>
          <p className="mt-1 text-small text-on-ink-soft">Automated attribution of unknown wallets to the nearest VASP.</p>
        </div>
        <div className="min-w-0">
          <h2 className="type-label text-on-ink-soft">Data</h2>
          <ul className="mt-3 flex flex-col gap-2 text-small">
            <li>OFAC SDN list{ofacPublished ? ` of ${day(ofacPublished)}` : ""}</li>
            <li>FIU-IND annexure of {FIU_SOURCE.date}</li>
            <li>Law-enforcement contacts read {day((contacts as { _checked: string })._checked)}, each on the exchange’s own page</li>
            <li>Chain data: public TRON, Ethereum and Polygon reads</li>
          </ul>
        </div>
        <div className="min-w-0">
          <h2 className="type-label text-on-ink-soft">Status</h2>
          <p className="mt-3 text-small">Built to route into SAHYOG; not integrated. NOIR sends nothing itself.</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-small">
            <li>
              <Link href="/method">Method</Link>
            </li>
            <li>
              <Link href="/registry">Registry</Link>
            </li>
            <li>
              <a href="https://github.com/mirzadev12/noir#readme" target="_blank" rel="noreferrer noopener">
                README
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
