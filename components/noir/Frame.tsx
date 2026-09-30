"use client";

/**
 * Frame — chooses the frame a screen sits in. Every screen gets the sidebar;
 * the working screens also get the context bar above the page, while the
 * landing page (/) draws its own main area and footer.
 */

import { usePathname } from "next/navigation";
import { ContextBar } from "./ContextBar";
import { Sidebar } from "./Sidebar";

export function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The landing keeps the sidebar for its routes but draws its own <main> and
  // footer, and needs no breadcrumb.
  if (pathname === "/")
    return (
      <div className="min-h-screen md:pl-sidebar print:pl-0">
        <Sidebar />
        {children}
      </div>
    );
  return (
    <div className="min-h-screen md:pl-sidebar print:pl-0">
      <a
        href="#main"
        className="type-sign sr-only bg-signal px-4 py-3 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 print:hidden"
      >
        Skip to the page
      </a>
      <Sidebar />
      <main id="main" className="min-w-0">
        <ContextBar />
        {children}
      </main>
    </div>
  );
}
