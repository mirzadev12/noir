import { newRequestId } from "@/lib/desk";
import { body, failed, json } from "@/lib/desk-http";
import { appendAudit } from "@/lib/audit-store";
import { changeDesk, loadDesk } from "@/lib/desk-store";
import { ASKS, REQUEST_STATUSES, type Ask, type RequestStatus } from "@/lib/desk-types";
import { actorOf } from "@/lib/identity";
import { changeStatus, draftRequest } from "@/lib/requests";

/**
 * /api/desk/requests — one consolidated request per VASP, and what it became.
 *
 *   GET    every request on the desk, newest first.
 *   POST   { vasp, asks } — draft the request for every wallet now routed to
 *          that VASP. No statute is added; the officer writes the legal basis.
 *   PATCH  { id, status, on?, reference?, note? } — record what happened:
 *          sent, then acknowledged / data-received / frozen / refused /
 *          no-response.
 *
 * Both are written to the audit log with who did them. Sending itself happens
 * outside NOIR (SAHYOG or the VASP's own channel); NOIR records it.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { requests } = await loadDesk();
    return json([...requests].sort((a, b) => b.history[0].at.localeCompare(a.history[0].at)));
  } catch (err) {
    return failed(err);
  }
}

export async function POST(request: Request) {
  const b = await body<{ vasp: unknown; asks: unknown }>(request);
  const asks = Array.isArray(b.asks) ? b.asks.filter((a): a is Ask => (ASKS as readonly unknown[]).includes(a)) : [];
  if (typeof b.vasp !== "string" || !b.vasp.trim() || !Array.isArray(b.asks) || asks.length !== b.asks.length) {
    return json({ error: `Expected { vasp, asks } with asks from: ${ASKS.join(", ")}.` }, 400);
  }
  const actor = actorOf(request.headers);
  try {
    const result = await changeDesk((file) => draftRequest(file, b.vasp as string, asks, actor, new Date().toISOString(), newRequestId));
    if (!result.ok) return json({ error: result.error }, 422);
    await appendAudit({
      action: "request.drafted",
      actor,
      chain: null,
      address: null,
      detail: { requestId: result.request.id, vasp: result.request.vasp, asks: result.request.asks.join(","), wallets: result.request.entryIds.length },
    });
    return json(result.request, 201);
  } catch (err) {
    return failed(err);
  }
}

export async function PATCH(request: Request) {
  const b = await body<{ id: unknown; status: unknown; on: unknown; reference: unknown; note: unknown }>(request);
  const status = REQUEST_STATUSES.find((s) => s === b.status) as RequestStatus | undefined;
  if (typeof b.id !== "string" || !status) {
    return json({ error: `Expected { id, status } with status from: ${REQUEST_STATUSES.join(", ")}.` }, 400);
  }
  const text = (v: unknown) => (typeof v === "string" ? v : null);
  const actor = actorOf(request.headers);
  try {
    const result = await changeDesk((file) => {
      const found = file.requests.find((r) => r.id === b.id);
      if (!found) return { ok: false as const, error: "No request with that id.", missing: true };
      const changed = changeStatus(found, { status, on: text(b.on), reference: text(b.reference), note: text(b.note) }, actor, new Date().toISOString());
      return changed.ok ? { ok: true as const, request: found } : { ...changed, missing: false };
    });
    if (!result.ok) return json({ error: result.error }, result.missing ? 404 : 422);
    const last = result.request.history.at(-1);
    await appendAudit({
      action: "request.status",
      actor,
      chain: null,
      address: null,
      detail: { requestId: result.request.id, vasp: result.request.vasp, status, on: last?.on ?? null, reference: last?.reference ?? null },
    });
    return json(result.request);
  } catch (err) {
    return failed(err);
  }
}
