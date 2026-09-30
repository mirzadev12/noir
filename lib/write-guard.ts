/**
 * What stands in front of every route that changes something or spends chain
 * reads: a limit on the size of the body, and a limit on how often one client
 * may write.
 *
 * Neither is a security boundary on its own. They keep one mistake from
 * becoming an outage: a script in a loop, a file pasted into the wrong box, a
 * client that retries forever. Reads are not limited; a desk that refreshes
 * every few seconds is normal.
 *
 * A client is known by the first hop of `x-forwarded-for` (or `x-real-ip`),
 * which a hosting proxy sets and a caller behind it cannot remove. With no
 * proxy in front there is nothing to tell clients apart by, so they share one
 * far larger allowance instead of one client being able to lock out the rest.
 *
 * `NOIR_WRITE_LIMIT` sets the writes a client may make in a minute (default
 * 60); `0` turns the limit off. The count is kept in memory, per server.
 *
 * Server-only.
 */

import { NextResponse } from "next/server";

/** Every write but a filing: far more than the largest honest body (500 ids is 9 KB). */
export const MAX_WRITE_BYTES = 16 * 1024;
/** A filing: 500 lines of the longest addresses with a case column fit well inside this. */
export const MAX_FILING_BYTES = 64 * 1024;

export const WRITES_PER_MINUTE = 60;
/** How many times the per-client allowance all unidentified clients share. */
const UNKNOWN_FACTOR = 10;
const WINDOW_MS = 60_000;
/** Clients remembered at once; past it the ones with no write in the last minute are forgotten. */
const MAX_CLIENTS = 5_000;

const NO_STORE = { "Cache-Control": "no-store" };

/** The client as the proxy in front names it, or null when there is no proxy to say. */
export function clientOf(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded ? forwarded.split(",")[0].trim() : "";
  if (first) return first.slice(0, 64);
  const real = headers.get("x-real-ip")?.trim();
  return real ? real.slice(0, 64) : null;
}

/** The writes a client may make in a minute; 0 means no limit. */
export function writeLimit(env: string | undefined = process.env.NOIR_WRITE_LIMIT): number {
  if (env === undefined || env.trim() === "") return WRITES_PER_MINUTE;
  const n = Number(env);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : WRITES_PER_MINUTE;
}

type Book = Map<string, number[]>;

function book(): Book {
  const holder = globalThis as typeof globalThis & { __noirWrites?: Book };
  return (holder.__noirWrites ??= new Map());
}

/**
 * Count one write by `client` at `now`, or refuse it. A refusal says how many
 * seconds until the oldest write in the window falls out of it. `writes` is the
 * book to count in; the server's own by default.
 */
export function allowWrite(
  client: string | null,
  now: number = Date.now(),
  perMinute: number = writeLimit(),
  writes: Book = book(),
): { ok: true } | { ok: false; retryAfter: number } {
  if (perMinute === 0) return { ok: true };
  const key = client ?? "\u0000unknown";
  const allowance = client === null ? perMinute * UNKNOWN_FACTOR : perMinute;
  const recent = (writes.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= allowance) {
    writes.set(key, recent);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000)) };
  }
  recent.push(now);
  writes.set(key, recent);
  if (writes.size > MAX_CLIENTS) {
    for (const [k, times] of writes) if (times.every((t) => now - t >= WINDOW_MS)) writes.delete(k);
  }
  return { ok: true };
}

const refuse = (status: 413 | 429, error: string, extra: Record<string, string> = {}) =>
  NextResponse.json({ error }, { status, headers: { ...NO_STORE, ...extra } });

type Handler<A extends unknown[]> = (request: Request, ...rest: A) => Promise<Response> | Response;

/**
 * A write handler behind the guard. The body is read once here and checked for
 * size; the handler is given a request that carries it, so it reads the body
 * exactly as it did before. Too large is a 413; too many writes from one client
 * in a minute is a 429 with `Retry-After`.
 */
export function guarded<A extends unknown[]>(handler: Handler<A>, maxBytes: number = MAX_WRITE_BYTES, tooLarge?: string): Handler<A> {
  const large = tooLarge ?? `That request is too large: at most ${Math.round(maxBytes / 1024)} KB.`;
  return async (request: Request, ...rest: A): Promise<Response> => {
    const allowed = allowWrite(clientOf(request.headers));
    if (!allowed.ok) {
      return refuse(429, `Too many changes from this client in a minute. Try again in ${allowed.retryAfter} ${allowed.retryAfter === 1 ? "second" : "seconds"}.`, {
        "Retry-After": String(allowed.retryAfter),
      });
    }
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declared) && declared > maxBytes) return refuse(413, large);
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) return refuse(413, large);
    // The same request with its body read: the handler parses it as it always did.
    const replay = new Request(request.url, { method: request.method, headers: request.headers, body: text });
    return handler(replay, ...rest);
  };
}
