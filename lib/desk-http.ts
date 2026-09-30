/**
 * What every /api/desk route shares: no caching, one wording for a desk that
 * cannot be stored, a tolerant body reader, and the audit line for a wallet.
 *
 * Server-only.
 */

import { NextResponse } from "next/server";
import { appendAudit } from "./audit-store";
import type { AuditAction, AuditValue } from "./audit";
import type { ChainName } from "./chain-client";
import type { DeskEntry } from "./desk-types";
import type { Actor } from "./identity";

export const NO_STORE = { "Cache-Control": "no-store" };

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export function failed(err: unknown) {
  const why = err instanceof Error ? err.message : "its storage could not be used";
  return json({ error: `This server cannot keep the desk: ${why}` }, 503);
}

export async function body<T>(request: Request): Promise<Partial<T>> {
  try {
    const v = (await request.json()) as unknown;
    return v && typeof v === "object" ? (v as Partial<T>) : {};
  } catch {
    return {};
  }
}

const TRACED: ReadonlySet<string> = new Set(["tron", "ethereum", "polygon"]);

/** One audit line about one desk wallet. The log's chain field holds traced chains only. */
export function auditEntry(
  action: AuditAction,
  actor: Actor,
  entry: Pick<DeskEntry, "id" | "wallet" | "chain">,
  detail: Record<string, AuditValue> = {},
) {
  return appendAudit({
    action,
    actor,
    chain: TRACED.has(entry.chain) ? (entry.chain as ChainName) : null,
    address: entry.wallet,
    detail: { entryId: entry.id, chain: entry.chain, ...detail },
  });
}
