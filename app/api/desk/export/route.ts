import { groupByVasp, vaspKey } from "@/lib/desk";
import { failed, json, NO_STORE } from "@/lib/desk-http";
import { loadDesk } from "@/lib/desk-store";
import { requestsCsv, requestsJson, vaspWalletsCsv, vaspWalletsJson } from "@/lib/export";

/**
 * GET /api/desk/export?kind=wallets&vasp=<name>[&format=csv|json]
 * GET /api/desk/export?kind=requests[&format=csv|json]
 *
 * A read-only download: one VASP's wallets in both directions, or the register
 * of every request drafted (newest first). CSV by default. A VASP nothing
 * routes to answers 404; an unknown kind or format answers 400; a desk file
 * that cannot be read answers 503 through `failed`, never an empty file.
 */
export const dynamic = "force-dynamic";

const fileName = (base: string, ext: string) => `noir-${base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "export"}.${ext}`;

function download(text: string, name: string, type: string) {
  return new Response(text, {
    headers: { ...NO_STORE, "Content-Type": `${type}; charset=utf-8`, "Content-Disposition": `attachment; filename="${name}"` },
  });
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const kind = q.get("kind");
  const format = q.get("format") ?? "csv";
  if (format !== "csv" && format !== "json") return json({ error: "format must be csv or json." }, 400);
  if (kind !== "wallets" && kind !== "requests") return json({ error: "kind must be wallets or requests." }, 400);

  try {
    const file = await loadDesk();
    if (kind === "requests") {
      const requests = [...file.requests].sort((a, b) => b.history[0].at.localeCompare(a.history[0].at));
      return format === "csv"
        ? download(requestsCsv(requests), fileName("requests", "csv"), "text/csv")
        : download(JSON.stringify(requestsJson(requests), null, 2), fileName("requests", "json"), "application/json");
    }
    const name = q.get("vasp");
    if (!name) return json({ error: "vasp is required for kind=wallets." }, 400);
    const key = vaspKey(name);
    const row = groupByVasp(file).rows.find((r) => vaspKey(r.vasp) === key);
    if (!row) return json({ error: "No wallet on the desk routes to that VASP." }, 404);
    return format === "csv"
      ? download(vaspWalletsCsv(row), fileName(`${row.vasp}-wallets`, "csv"), "text/csv")
      : download(JSON.stringify(vaspWalletsJson(row), null, 2), fileName(`${row.vasp}-wallets`, "json"), "application/json");
  } catch (err) {
    return failed(err);
  }
}
