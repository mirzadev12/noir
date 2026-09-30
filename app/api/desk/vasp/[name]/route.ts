import { groupByVasp, vaspKey } from "@/lib/desk";
import { failed, json } from "@/lib/desk-http";
import { loadDesk } from "@/lib/desk-store";
import { allowedAsks, buildLetter } from "@/lib/requests";

/**
 * GET /api/desk/vasp/[name] — one VASP's row on the desk: every wallet routed
 * to it across cases, its latest request, the asks it may be sent, and the
 * consolidated letter as it would print now (the latest request's, if any).
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/desk/vasp/[name]">) {
  const { name } = await ctx.params;
  // Next hands the segment over decoded; decoding again would throw on a bare "%".
  const key = vaspKey(name);
  try {
    const row = groupByVasp(await loadDesk()).rows.find((r) => vaspKey(r.vasp) === key);
    if (!row) return json({ error: "No wallet on the desk routes to that VASP." }, 404);
    return json({ row, allowedAsks: allowedAsks(row), letter: buildLetter(row, row.request, new Date().toISOString()) });
  } catch (err) {
    return failed(err);
  }
}
