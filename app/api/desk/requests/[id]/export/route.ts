import { groupByVasp, vaspKey } from "@/lib/desk";
import { failed, json, NO_STORE } from "@/lib/desk-http";
import { loadDesk } from "@/lib/desk-store";
import { buildLetter, requestPackage } from "@/lib/requests";

/**
 * GET /api/desk/requests/[id]/export — the request as a JSON package
 * (`noir-request-v1`), downloaded as a file. Built for SAHYOG's intake; the
 * package itself states that the integration is designed, not live.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/desk/requests/[id]/export">) {
  const { id } = await ctx.params;
  try {
    const file = await loadDesk();
    const request = file.requests.find((r) => r.id === id);
    if (!request) return json({ error: "No request with that id." }, 404);
    const row = groupByVasp(file).rows.find((r) => vaspKey(r.vasp) === vaspKey(request.vasp));
    if (!row) return json({ error: "No wallet on the desk routes to that VASP any more." }, 409);
    const pkg = requestPackage(buildLetter(row, request, new Date().toISOString()), request);
    return new Response(JSON.stringify(pkg, null, 2) + "\n", {
      headers: {
        ...NO_STORE,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="noir-request-${request.id}.json"`,
      },
    });
  } catch (err) {
    return failed(err);
  }
}
