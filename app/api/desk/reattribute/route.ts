import { markPending, markPendingWhere, vaspKey, type ReadAgainResult, type ReadAgainSelector } from "@/lib/desk";
import { auditEntry, body, failed, json } from "@/lib/desk-http";
import { changeDesk } from "@/lib/desk-store";
import type { DeskEntry } from "@/lib/desk-types";
import { kickDesk } from "@/lib/desk-worker";
import { actorOf } from "@/lib/identity";

/**
 * POST /api/desk/reattribute — read filed wallets again, one or many.
 *
 * A record is a snapshot of the moment it was read; this is the explicit way
 * to take a new one (or retry a wallet that failed or could not be read). The
 * old record stays until the new one is written.
 *
 * Body, exactly one of:
 *   { id }        that wallet
 *   { ids }       those wallets (1 to 500)
 *   { vasp }      every wallet routed to that VASP, either direction
 *   { caseRef }   every wallet filed under that case reference; null means the
 *                 wallets filed with no case reference
 *
 * → 202 { ok, queued, skipped, entry? }. `entry` is the queued wallet for the
 * single form, as it always was. In the bulk forms a wallet already waiting for
 * the worker is listed in `skipped`, never queued twice. 404 when the selector
 * names nothing on the desk.
 */
export const dynamic = "force-dynamic";

const MAX_IDS = 500;

type Chosen = { select: ReadAgainSelector; kind: "id" | "ids" | "vasp" | "caseRef" };

/** The one selector in the body, or the sentence that says what was wrong with it. */
function selectorOf(b: Record<string, unknown>): Chosen | { error: string } {
  const given = (["id", "ids", "vasp", "caseRef"] as const).filter((k) => b[k] !== undefined);
  if (given.length !== 1) return { error: "Expected exactly one of { id }, { ids }, { vasp } or { caseRef }." };
  const kind = given[0];
  if (kind === "id") {
    return typeof b.id === "string" && b.id ? { select: { id: b.id }, kind } : { error: "Expected { id }." };
  }
  if (kind === "ids") {
    const ids = b.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS || !ids.every((x): x is string => typeof x === "string" && x !== "")) {
      return { error: `Expected { ids } as a list of 1 to ${MAX_IDS} wallet ids.` };
    }
    return { select: { ids }, kind };
  }
  if (kind === "vasp") {
    return typeof b.vasp === "string" && b.vasp.trim() ? { select: { vasp: b.vasp }, kind } : { error: "Expected { vasp } as a VASP's name." };
  }
  if (b.caseRef === null) return { select: { caseRef: null }, kind };
  return typeof b.caseRef === "string" && b.caseRef.trim()
    ? { select: { caseRef: b.caseRef }, kind }
    : { error: "Expected { caseRef } as a case reference, or null for the wallets filed without one." };
}

const NOTHING = {
  id: "No wallet with that id is on the desk.",
  ids: "None of those wallets is on the desk.",
  vasp: "No wallet on the desk routes to that VASP.",
  caseRef: "No wallet on the desk is filed under that case reference.",
} as const;

/** The VASP's name as the queued wallets' own records spell it, so "mexc" is logged as "MEXC". */
function spelling(queued: DeskEntry[], asked: string): string {
  const key = vaspKey(asked);
  for (const e of queued) {
    const names = e.record ? [e.record.outbound?.vasp, ...e.record.inbound.map((i) => i.vasp)] : [];
    const hit = names.find((n) => n !== undefined && vaspKey(n) === key);
    if (hit) return hit;
  }
  return asked;
}

export async function POST(request: Request) {
  const chosen = selectorOf((await body<Record<string, unknown>>(request)) as Record<string, unknown>);
  if ("error" in chosen) return json({ error: chosen.error }, 400);
  const { select, kind } = chosen;
  try {
    const result = await changeDesk<ReadAgainResult>((file) => {
      if (!("id" in select)) return markPendingWhere(file, select);
      // One wallet named by its id is always queued, as it always was.
      const entry = markPending(file, select.id);
      return { queued: entry ? [entry] : [], skipped: [], matched: entry ? 1 : 0 };
    });
    if (result.matched === 0) return json({ error: NOTHING[kind] }, 404);

    const actor = actorOf(request.headers);
    const bulk =
      "vasp" in select ? `vasp:${spelling(result.queued, select.vasp)}` : "caseRef" in select ? `case:${select.caseRef ?? "(none)"}` : "ids" in select ? "ids" : null;
    for (const entry of result.queued) await auditEntry("desk.reattributed", actor, entry, bulk === null ? {} : { bulk });
    if (result.queued.length > 0) kickDesk();
    return json({ ok: true, queued: result.queued, skipped: result.skipped, ...("id" in select ? { entry: result.queued[0] } : {}) }, 202);
  } catch (err) {
    return failed(err);
  }
}
