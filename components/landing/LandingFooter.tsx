import Link from "next/link";
import contacts from "@/data/le-contacts.json";
import { FIU_SOURCE } from "@/lib/fiu";
import { utcDay } from "@/lib/noir-format";

/**
 * LandingFooter — who this is for, where its data comes from and when, and what
 * NOIR does not claim. Every date is read from the data it names: the OFAC list's
 * publication date, the FIU-IND annexure's date and the day the law-enforcement
 * contacts were read.
 */
export function LandingFooter({ ofacPublished }: { ofacPublished: string | null }) {
  const day = (d: string) => utcDay(`${d}T00:00:00Z`);
  return (
    <footer className="on-ink bg-navy text-on-ink">
      <div className="mx-auto grid w-full max-w-page min-w-0 gap-10 px-gutter py-12 md:grid-cols-3">
        <div className="min-w-0">
          <p className="type-sign-black border-b-4 border-signal text-title leading-none inline-block">NOIR</p>
          <p className="mt-4 text-body">For Indian cyber-crime investigators</p>
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
