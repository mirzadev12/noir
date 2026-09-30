"use client";

/**
 * Sidebar — the black route list down the left of every screen: the NOIR
 * wordmark and the places to go. (The officer's ID and unit are set in the
 * context bar above each screen.)
 *
 * From the md breakpoint up it is fixed at the left, `--spacing-sidebar` wide.
 * On a phone it folds into a black strip (wordmark and a Menu button) and the
 * list slides over the page. It is hidden entirely when printing.
 *
 * Routes are listed once, here. A route is "current" for any path under it, so
 * a VASP's page and a wallet's page keep "Desk" lit.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

const ROUTES = [
  { href: "/desk", label: "Desk", note: "Wallets, by VASP", under: ["/desk", "/vasp", "/wallet"] },
  { href: "/cases", label: "Cases", note: "Wallets, by case", under: ["/cases"] },
  { href: "/requests", label: "Requests", note: "What each VASP did", under: ["/requests"] },
  { href: "/registry", label: "Registry", note: "Every VASP NOIR can name", under: ["/registry"] },
  { href: "/method", label: "Method", note: "What NOIR covers, and how", under: ["/method"] },
] as const;

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" onClick={onNavigate} className="type-sign-black text-title leading-none text-signal no-underline hover:no-underline" aria-label="NOIR, home">
      NOIR
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Phone: a black strip with the wordmark and the menu button. */}
      <div className="on-ink sticky top-0 z-30 flex h-bar items-center justify-between bg-navy px-gutter md:hidden print:hidden">
        <Wordmark />
        <button
          type="button"
          aria-expanded={open}
          aria-controls="route-list"
          onClick={() => setOpen((v) => !v)}
          className="type-sign rule-box-on-ink inline-flex min-h-10 cursor-pointer items-center gap-2 bg-transparent px-3 text-body text-on-ink transition-colors hover:bg-on-ink-soft/20"
        >
          <Icon name={open ? "close" : "menu"} />
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? <button type="button" aria-label="Close menu" onClick={close} className="fixed inset-0 z-40 cursor-default bg-navy/70 md:hidden print:hidden" /> : null}

      <aside
        id="route-list"
        aria-label="NOIR"
        className={`on-ink fixed inset-y-0 left-0 z-50 flex w-sidebar max-w-full flex-col overflow-y-auto bg-navy text-on-ink transition-transform print:hidden md:z-20 md:translate-x-0 ${
          open ? "translate-x-0" : "max-md:invisible max-md:-translate-x-full"
        }`}
      >
        <div className="p-5 pb-6">
          <Wordmark onNavigate={close} />
          <p className="mt-2 flex items-center gap-2 text-small text-on-ink-soft">
            Wallet <Icon name="arrow-right" size="sm" /> VASP
          </p>
        </div>

        <nav aria-label="Routes">
          <ul>
            {ROUTES.map((route) => {
              const current = route.under.some((p) => pathname === p || pathname.startsWith(`${p}/`));
              return (
                <li key={route.href} className="hair-t-on-ink">
                  <Link
                    href={route.href}
                    onClick={close}
                    aria-current={current ? "page" : undefined}
                    className={`group flex items-center justify-between gap-3 px-5 py-4 no-underline transition-colors hover:no-underline ${
                      current ? "bg-paper text-ink" : "text-on-ink hover:bg-on-ink-soft/20"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="type-sign block text-lead leading-tight">{route.label}</span>
                      <span className={`block text-small ${current ? "text-ink-soft" : "text-on-ink-soft"}`}>{route.note}</span>
                    </span>
                    <Icon name="arrow-right" className={current ? "" : "opacity-60 transition-opacity group-hover:opacity-100"} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="hair-t-on-ink mt-auto p-5 text-small text-on-ink-soft">Attribution is a lookup, not a model. Built to route into SAHYOG.</p>
      </aside>
    </>
  );
}
