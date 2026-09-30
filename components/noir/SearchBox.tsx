"use client";

/**
 * SearchBox — one box to go anywhere, as on an explorer: type or paste a wallet
 * address to open its page on the desk, or a VASP's name to open that VASP. It
 * only navigates; nothing is read from a chain here. An address that is not on
 * the desk lands on the wallet page's own "not on the desk" answer, which says
 * how to file it.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./Icon";

const ADDRESS = /^(0x[0-9a-fA-F]{40}|T[1-9A-HJ-NP-Za-km-z]{33})$/;

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  function go(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    router.push(ADDRESS.test(v) ? `/wallet/${encodeURIComponent(v)}` : `/vasp/${encodeURIComponent(v)}`);
    setQ("");
  }
  return (
    <form onSubmit={go} role="search" className="flex min-w-0 items-center gap-2">
      <label htmlFor="global-search" className="sr-only">
        Search a wallet address or a VASP
      </label>
      <div className="rule-box flex min-h-10 min-w-0 flex-1 items-center gap-2 bg-paper px-3 md:max-w-xs md:flex-none md:basis-xs">
        <Icon name="search" size="sm" className="text-ink-soft" />
        <input
          id="global-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a wallet address or a VASP"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-small outline-offset-4"
        />
      </div>
      <button type="submit" className="type-sign min-h-10 cursor-pointer rule-box bg-navy px-4 text-body text-on-ink transition-colors hover:border-route hover:bg-route">
        Go
      </button>
    </form>
  );
}
