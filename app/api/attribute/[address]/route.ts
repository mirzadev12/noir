import { attributeWallet } from "@/lib/attribute";
import { NextResponse } from "next/server";
import { json, NO_STORE } from "@/lib/desk-http";
import { checkLine } from "@/lib/desk-intake";
import { allowWrite, clientOf } from "@/lib/write-guard";

/**
 * GET /api/attribute/[address] — the nearest VASP on both sides of one wallet, as the desk files it.
 *
 * The answer is the attribution record itself (`lib/desk-types.ts`): where its USDT went (the exchange and
 * the account there, or why the trail stopped), who funded its payers, any OFAC listing, the typologies
 * observed and the hash of every chain response it was read from. `?chain=polygon` reads a 0x address on
 * Polygon; a chain NOIR screens but does not trace answers `traced: false`. A wallet that could not be read
 * answers `readable: false`, never an empty record. Confidence is how much evidence was seen, not a probability.
 * It shares the per-client limit of the write routes, because each call costs several chain reads.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: RouteContext<"/api/attribute/[address]">) {
  const allowed = allowWrite(clientOf(request.headers));
  if (!allowed.ok) {
    return NextResponse.json({ error: `Too many requests from this client in a minute. Try again in ${allowed.retryAfter} seconds.` }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(allowed.retryAfter) } });
  }
  const { address: raw } = await ctx.params;
  let typed: string;
  try {
    typed = decodeURIComponent(raw).trim();
  } catch {
    return json({ error: "That address is not valid text." }, 400);
  }
  const checked = checkLine(typed, new URL(request.url).searchParams.get("chain") ?? "");
  if (!checked.ok) return json({ error: checked.reason, address: typed }, 400);
  try {
    return json(await attributeWallet(checked.wallet, checked.chain));
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "The wallet could not be read.", address: checked.wallet }, 502);
  }
}
