"use client";

import { Button } from "@/components/noir";

/** Opens the browser's print dialog. The letter's print rules (A4, sidebar hidden, black on white) are in app/globals.css. */
export function PrintButton() {
  return (
    <Button icon="print" onClick={() => window.print()}>
      Print
    </Button>
  );
}
