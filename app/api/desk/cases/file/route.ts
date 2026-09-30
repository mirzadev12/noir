import { readAudit } from "@/lib/audit-store";
import { caseFileCsv, caseFileName, caseFileOf } from "@/lib/case-file";
import { loadClosures } from "@/lib/case-store";
import { failed, json, NO_STORE } from "@/lib/desk-http";
import { loadDesk } from "@/lib/desk-store";

/**
 * GET /api/desk/cases/file?caseRef=…[&format=json|csv] — a case's whole file,
 * as a download: its wallets and what NOIR said of each, the VASPs they reach,
 * the requests that cover them and the audit lines about them. Closed or not.
 *
 * Read-only. Evidence is stated in words, never as a number that reads as
 * accuracy; no statute is in it; times are UTC and amounts USDT.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const caseRef = url.searchParams.get("caseRef");
  const format = url.searchParams.get("format") ?? "json";
  if (!caseRef || !caseRef.trim()) return json({ error: "Expected ?caseRef=<a case reference>." }, 400);
  if (format !== "json" && format !== "csv") return json({ error: 'The format is "json" or "csv".' }, 400);
  try {
    const audit = await readAudit();
    const check = audit.check.intact ? { intact: true, head: audit.check.head } : { intact: false };
    const doc = caseFileOf(await loadDesk(), await loadClosures(), caseRef, { entries: audit.entries, check }, new Date().toISOString());
    if (!doc) return json({ error: "No wallet on the desk is filed under that case reference." }, 404);
    const name = caseFileName(caseRef, format);
    const text = format === "csv" ? caseFileCsv(doc) : JSON.stringify(doc, null, 2);
    return new Response(text, {
      headers: {
        ...NO_STORE,
        "content-type": format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (err) {
    return failed(err);
  }
}
