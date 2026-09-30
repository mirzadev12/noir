import { NextResponse } from "next/server";
import { evidenceLedger } from "@/lib/evidence";
import { registryRows, registryTotals } from "@/lib/registry";

/**
 * GET /api/registry — every VASP NOIR can attribute a wallet to, and how much
 * provenance the rows behind that carry.
 *
 *   rows      one per VASP: chains, tagged wallets, deposit addresses, the
 *             FIU-IND listing and the law-enforcement channel
 *   totals    the same, summed
 *   evidence  the ledger (`lib/evidence.ts`): how many tagged wallets name the
 *             explorer page that tags them, how many deposit addresses carry
 *             their evidence and the tagged wallet they forward to, how many
 *             recorded cases say when they were read, and any row that lacks
 *             its provenance (none, in a sound build)
 *
 * Counted from the files in data/ when the server was built. Nothing is read
 * from a chain and nothing is typed in.
 */
export function GET() {
  return NextResponse.json({ rows: registryRows(), totals: registryTotals(), evidence: evidenceLedger() }, { headers: { "Cache-Control": "no-store" } });
}
