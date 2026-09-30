/**
 * Shell — the frame every app screen sits in: the navy <Sidebar> on the left, a
 * context bar above, and the page on white beside it (the landing page draws its own). There is no top navigation bar; on a phone the
 * Sidebar folds into a slim black strip with a Menu button.
 *
 *   <Shell>   used once, by app/layout.tsx.
 *   <Page>    the content column of a screen: side gutter, top and bottom
 *             space, and the widest measure a screen runs at. `width="letter"`
 *             narrows it to the request letter's measure.
 *
 * Printing hides the Sidebar and removes its offset (see `@media print` in
 * app/globals.css), so a letter prints as a plain black-on-white A4 page.
 */

import { Frame } from "./Frame";

export function Shell({ children }: { children: React.ReactNode }) {
  return <Frame>{children}</Frame>;
}

export function Page({ children, width = "page", className = "" }: { children: React.ReactNode; width?: "page" | "letter"; className?: string }) {
  return (
    <div
      className={`mx-auto w-full min-w-0 px-gutter py-8 md:py-12 print:p-0 ${
        width === "letter" ? "letter-sheet max-w-letter" : "max-w-page"
      } ${className}`}
    >
      {children}
    </div>
  );
}
