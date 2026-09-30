import { NextResponse } from "next/server";
import { DEMO_MODE } from "@/lib/demo";
import { readSources } from "@/lib/endpoints";
import { chainReach, stateWritable } from "@/lib/health";

/**
 * GET /api/health — is this deployment set up the way it needs to be?
 *
 * Questions otherwise answerable only from the hosting dashboard, which not
 * everyone on the team can open: which commit is serving, whether recorded
 * mode is on, whether chain reads carry an API key, where each kind of read
 * goes, and whether the state directory can be written (without it the desk
 * and the audit log cannot be kept). A key itself is never returned — only
 * whether one is present.
 *
 * Cheap on purpose: no chain read and no page render, so an uptime monitor can
 * call it every few minutes to keep a sleeping free instance awake. The state
 * directory is probed at most once a minute.
 *
 * `?deep=1` also asks each chain one small question and says which answered
 * (`chains`) and why one did not (`chainsWhy`). That is three requests, so it
 * is only made when asked for. A chain that is down is reported, not a failure
 * of health: `ok` says the server itself answers.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";
  const state = await stateWritable();
  const reached = deep ? await chainReach(fetch) : null;
  return NextResponse.json(
    {
      ok: true,
      // Render sets this for services built from Git; null anywhere else.
      commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
      demoMode: DEMO_MODE,
      chainAccess: process.env.TRONGRID_API_KEY ? "keyed" : "public",
      // The same question for Ethereum reads. Never the key.
      ethereumAccess: process.env.BLOCKSCOUT_API_KEY ? "keyed" : "public",
      // Where each kind of chain read goes: the agency's own endpoint ("own"),
      // a public one, a setting that is not a URL, or not made at all. Never
      // the address itself (lib/endpoints.ts).
      reads: readSources(),
      state,
      ...(reached
        ? {
            chains: { tron: reached.tron.state, ethereum: reached.ethereum.state, polygon: reached.polygon.state },
            chainsWhy: { tron: reached.tron.why, ethereum: reached.ethereum.why, polygon: reached.polygon.why },
          }
        : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
