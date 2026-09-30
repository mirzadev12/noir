"use client";

/**
 * ContextBar — the strip above every app screen: where you are (a breadcrumb),
 * whether the server is answering from recorded chain reads, and the search box.
 *
 * NOIR asks nobody for an identity. Where a deployment sits behind the
 * department sign-in gateway, the gateway names the officer on every change
 * (lib/identity.ts); otherwise changes are logged without a name. The recorded-mode line appears
 * only when GET /api/health says the server answers from recorded reads; NOIR
 * never labels its own data with any other word.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { shortAddress } from "@/lib/noir-format";
import { Icon } from "./Icon";
import { SearchBox } from "./SearchBox";
import { Tag } from "./Tag";

interface Crumb {
  label: string;
  href?: string;
}

function crumbsFor(pathname: string): Crumb[] {
  const seg = pathname.split("/").filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  switch (seg[0]) {
    case "desk":
      return [{ label: "Desk" }];
    case "vasp":
      return seg[2] === "request"
        ? [{ label: "Desk", href: "/desk" }, { label: seg[1], href: `/vasp/${encodeURIComponent(seg[1])}` }, { label: "Request" }]
        : [{ label: "Desk", href: "/desk" }, { label: seg[1] ?? "VASP" }];
    case "wallet":
      return [{ label: "Desk", href: "/desk" }, { label: `Wallet ${shortAddress(seg[1] ?? "")}` }];
    case "cases":
      return [{ label: "Cases" }];
    case "requests":
      return [{ label: "Requests" }];
    case "registry":
      return [{ label: "Registry" }];
    case "method":
      return [{ label: "Method" }];
    default:
      return [];
  }
}

export function ContextBar() {
  const pathname = usePathname();
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((h: { demoMode?: boolean }) => live && setRecorded(h.demoMode === true))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const crumbs = crumbsFor(pathname);

  return (
    <div className="hair-b print:hidden">
      <div className="mx-auto flex w-full max-w-page min-w-0 flex-wrap items-center gap-x-6 gap-y-3 px-gutter py-3">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-small">
            {crumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-2">
                {i > 0 ? <Icon name="arrow-right" size="sm" className="text-ink-faint" /> : null}
                {c.href ? (
                  <Link href={c.href} className="wrap-anywhere">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="wrap-anywhere font-bold">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 md:ml-auto">
          {recorded ? (
            <span className="flex min-w-0 items-center gap-2 text-small text-ink-soft">
              <Tag>Recorded mode</Tag>
              <span className="hidden 2xl:inline">answers come from recorded chain reads</span>
            </span>
          ) : null}
          <SearchBox />
        </div>
      </div>
    </div>
  );
}
