import { groupByCase } from "@/lib/analytics";
import { appendAudit } from "@/lib/audit-store";
import { closeCase, reopenCase, type CaseRefusal, type StillOpen } from "@/lib/case-file";
import { changeClosures, loadClosures } from "@/lib/case-store";
import { body, failed, json } from "@/lib/desk-http";
import { loadDesk } from "@/lib/desk-store";
import type { CaseClosure } from "@/lib/desk-types";
import { actorOf } from "@/lib/identity";

/**
 * /api/desk/cases — the desk by case reference, and closing a case.
 *
 *   GET   every case reference on the desk with its wallets, the VASPs they
 *         reach, its requests and whether it is closed; newest filing first.
 *   POST  { caseRef, action: "close" | "reopen", note? } — close a case, or
 *         reopen it. Closing files nothing and removes nothing: it records who
 *         closed the case, when and why, and from then on a filing that names
 *         it is refused until it is reopened. Closing is never refused because
 *         work is still in motion; `open` says what was.
 *         → { caseRef, closed, open }
 *
 * Both actions are written to the audit log with who did them.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(groupByCase(await loadDesk(), await loadClosures()));
  } catch (err) {
    return failed(err);
  }
}

const NOTHING_OPEN: StillOpen = { pendingWallets: 0, requestsAwaiting: 0, requestsNotSent: 0 };

export async function POST(request: Request) {
  const b = await body<{ caseRef: unknown; action: unknown; note: unknown }>(request);
  if (typeof b.caseRef !== "string" || !b.caseRef.trim() || (b.action !== "close" && b.action !== "reopen")) {
    return json({ error: 'Expected { caseRef, action } with a case reference and action "close" or "reopen".' }, 400);
  }
  const caseRef = b.caseRef;
  const actor = actorOf(request.headers);
  try {
    if (b.action === "reopen") {
      const result = await changeClosures<{ ok: true } | CaseRefusal>((closures) => {
        const r = reopenCase(closures, caseRef);
        return { write: r.ok, result: r };
      });
      if (!result.ok) return json({ error: result.error }, result.status);
      await appendAudit({ action: "case.reopened", actor, chain: null, address: null, detail: { caseRef } });
      return json({ caseRef, closed: null, open: NOTHING_OPEN });
    }

    // The desk is read inside the closures' own queue, so a case cannot be closed twice by two callers at once.
    const file = await loadDesk();
    const note = typeof b.note === "string" ? b.note : null;
    const result = await changeClosures<{ ok: true; closed: CaseClosure; open: StillOpen } | CaseRefusal>((closures) => {
      const r = closeCase(closures, file, caseRef, note, actor, new Date().toISOString());
      return { write: r.ok, result: r };
    });
    if (!result.ok) return json({ error: result.error }, result.status);
    await appendAudit({
      action: "case.closed",
      actor,
      chain: null,
      address: null,
      detail: { caseRef, note: result.closed.note, pendingWallets: result.open.pendingWallets, requestsAwaiting: result.open.requestsAwaiting, requestsNotSent: result.open.requestsNotSent },
    });
    return json({ caseRef, closed: result.closed, open: result.open });
  } catch (err) {
    return failed(err);
  }
}
