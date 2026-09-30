import { markPending } from "@/lib/desk";
import { auditEntry, body, failed, json } from "@/lib/desk-http";
import { changeDesk } from "@/lib/desk-store";
import { kickDesk } from "@/lib/desk-worker";
import { actorOf } from "@/lib/identity";

/**
 * POST /api/desk/reattribute { id } — read a filed wallet again.
 *
 * A record is a snapshot of the moment it was read; this is the explicit way
 * to take a new one (or retry a wallet that failed or could not be read). The
 * old record stays until the new one is written.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { id } = await body<{ id: unknown }>(request);
  if (typeof id !== "string" || !id) return json({ error: "Expected { id }." }, 400);
  try {
    const entry = await changeDesk((file) => markPending(file, id));
    if (!entry) return json({ error: "No wallet with that id is on the desk." }, 404);
    await auditEntry("desk.reattributed", actorOf(request.headers), entry);
    kickDesk();
    return json({ ok: true, entry }, 202);
  } catch (err) {
    return failed(err);
  }
}
