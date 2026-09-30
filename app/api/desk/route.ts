import { loadClosures } from "@/lib/case-store";
import { fileWallets, groupByVasp, newEntryId, removeEntry } from "@/lib/desk";
import { auditEntry, body, failed, json } from "@/lib/desk-http";
import { parseIntake, refuseClosedCases } from "@/lib/desk-intake";
import { changeDesk, loadDesk } from "@/lib/desk-store";
import type { IntakeLine } from "@/lib/desk-types";
import { kickDesk } from "@/lib/desk-worker";
import { actorOf, cleanName } from "@/lib/identity";

/**
 * /api/desk — the unit's shared dispatch desk.
 *
 *   GET     the desk grouped by VASP (`DeskView`), plus what is pending,
 *           unreadable, screened only, failed or routed nowhere.
 *   POST    { text, caseRef? } — file wallets: a pasted list or a CSV. Every
 *           line is checked before any chain read; accepted wallets are filed
 *           as pending and the server's worker attributes them one at a time.
 *           A line that names a closed case is refused like any other bad line.
 *           → { added, merged, rejected }
 *   DELETE  { id } — take a wallet off the desk.
 *
 * Filing and removal are written to the audit log with who did them.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const file = await loadDesk();
    // A server restarted mid-queue resumes as soon as anyone looks.
    if (file.entries.some((e) => e.status === "pending")) kickDesk();
    return json(groupByVasp(file));
  } catch (err) {
    return failed(err);
  }
}

/** 500 lines of the longest addresses with a case column fit well inside this. */
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  const raw = declared > MAX_BODY_BYTES ? null : await request.text();
  if (raw === null || raw.length > MAX_BODY_BYTES) {
    return json({ error: "That filing is too large: send at most 500 wallets (64 KB) at a time." }, 413);
  }
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const b = (parsed && typeof parsed === "object" ? parsed : {}) as { text?: unknown; caseRef?: unknown };
  if (typeof b.text !== "string" || !b.text.trim()) {
    return json({ error: "Expected { text, caseRef? } — wallets, one per line or as CSV." }, 400);
  }
  const checked = parseIntake(b.text, cleanName(typeof b.caseRef === "string" ? b.caseRef : null));
  let lines: IntakeLine[];
  try {
    // A closed case takes no new filings: the line is refused, with when it was closed.
    lines = refuseClosedCases(checked, await loadClosures());
  } catch (err) {
    return failed(err);
  }
  const accepted = lines.filter((l) => l.ok);
  const rejected = lines.filter((l) => !l.ok);
  if (!accepted.length) return json({ added: [], merged: [], rejected }, 422);

  const actor = actorOf(request.headers);
  try {
    const now = new Date().toISOString();
    const { added, merged } = await changeDesk((file) => fileWallets(file, accepted, actor, now, newEntryId));
    for (const e of [...added, ...merged]) {
      await auditEntry("desk.filed", actor, e, { caseRef: e.filings.at(-1)?.caseRef ?? null, merged: !added.includes(e) });
    }
    kickDesk();
    return json({ added, merged, rejected }, 201);
  } catch (err) {
    return failed(err);
  }
}

export async function DELETE(request: Request) {
  const { id } = await body<{ id: unknown }>(request);
  if (typeof id !== "string" || !id) return json({ error: "Expected { id }." }, 400);
  try {
    const removed = await changeDesk((file) => removeEntry(file, id));
    if (!removed) return json({ error: "No wallet with that id is on the desk." }, 404);
    await auditEntry("desk.removed", actorOf(request.headers), removed);
    return json({ ok: true, removed });
  } catch (err) {
    return failed(err);
  }
}

