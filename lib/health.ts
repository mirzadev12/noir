/**
 * What `/api/health` can say beyond "the server answers": whether the state
 * directory can be written, and which chains answer.
 *
 * The first is asked on every health check and must stay cheap: a probe file
 * is written and removed at most once a minute, and the answer is remembered
 * in between. The second costs one small request per chain, so it is made only
 * when the caller asks for it (`?deep=1`); an uptime monitor never triggers it.
 *
 * A chain's probe goes where that chain's history reads go (`lib/endpoints.ts`)
 * and carries a key only where a read would: never to an agency's own endpoint.
 * A probe that answers says the endpoint is up and accepts this deployment; it
 * says nothing about any one wallet.
 *
 * Server-only.
 */

import { rm } from "node:fs/promises";
import { blockscoutKey, ethHistory, polygonHistory, tronHistory, tronKey } from "./endpoints";
import { ETH_USDT_CONTRACT, POLYGON_USDT_CONTRACT } from "./ethclient";
import { stateFile, writeStateFile } from "./state-file";
import { USDT_CONTRACT } from "./trongrid";

export type Chain = "tron" | "ethereum" | "polygon";

export interface StateAnswer {
  writable: boolean;
  /** Why not, in words; null when it can be written. */
  reason: string | null;
}

const REMEMBER_MS = 60_000;
const PROBE = ".health-probe";

type Remembered = { at: number; answer: StateAnswer };

/**
 * Can the state directory be written right now? A real write, then removed:
 * permission bits alone do not say (a read-only disk, a full disk). The answer
 * is remembered for `maxAgeMs` (a minute); pass 0 to ask afresh.
 */
export async function stateWritable(maxAgeMs: number = REMEMBER_MS): Promise<StateAnswer> {
  const holder = globalThis as typeof globalThis & { __noirStateProbe?: Remembered };
  const held = holder.__noirStateProbe;
  if (held && maxAgeMs > 0 && Date.now() - held.at < maxAgeMs) return held.answer;
  let answer: StateAnswer;
  try {
    await writeStateFile(PROBE, new Date().toISOString());
    await rm(stateFile(PROBE), { force: true });
    answer = { writable: true, reason: null };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    answer = { writable: false, reason: `The state directory could not be written${code ? ` (${code})` : ""}. The desk and the audit log cannot be kept until it can.` };
  }
  holder.__noirStateProbe = { at: Date.now(), answer };
  return answer;
}

export interface ChainProbe {
  /** The one request to make, or null when the endpoint is not one that can be asked. */
  url: string | null;
  headers: Record<string, string>;
  /** Why there is nothing to ask, when `url` is null. */
  why: string | null;
}

const JSON_ONLY = { accept: "application/json" };
const notUrl = (setting: string) => `${setting} is set but is not an http(s) URL`;

/** One small request per chain: the token's own page or its latest event, a few hundred bytes. */
export function chainProbes(): Record<Chain, ChainProbe> {
  const tron = tronHistory();
  const tronK = tronKey(tron);
  const eth = ethHistory();
  const ethK = blockscoutKey();
  const polygon = polygonHistory();
  return {
    tron: tron.base
      ? { url: `${tron.base}/v1/contracts/${USDT_CONTRACT}/events?limit=1`, headers: { ...JSON_ONLY, ...(tronK ? { "TRON-PRO-API-KEY": tronK } : {}) }, why: null }
      : { url: null, headers: {}, why: notUrl("TRONGRID_URL") },
    ethereum: eth.base
      ? { url: `${eth.base}/tokens/${ETH_USDT_CONTRACT}`, headers: { ...JSON_ONLY, ...(ethK ? { authorization: `Bearer ${ethK}` } : {}) }, why: null }
      : { url: null, headers: {}, why: notUrl("BLOCKSCOUT_URL") },
    polygon: polygon.base
      ? { url: `${polygon.base}/tokens/${POLYGON_USDT_CONTRACT}`, headers: { ...JSON_ONLY }, why: null }
      : { url: null, headers: {}, why: notUrl("POLYGON_BLOCKSCOUT_URL") },
  };
}

export interface Reach {
  state: "reachable" | "unreachable";
  /** Why it is unreachable, in words; null when it answered. */
  why: string | null;
}

const PROBE_TIMEOUT_MS = 6_000;

/** Ask one probe. Reachable is a 2xx answer; anything else is unreachable, with what happened. */
export async function reach(probe: ChainProbe, fetcher: typeof fetch = fetch): Promise<Reach> {
  if (probe.url === null) return { state: "unreachable", why: probe.why };
  try {
    const res = await fetcher(probe.url, { headers: probe.headers, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS), cache: "no-store" });
    if (res.ok) return { state: "reachable", why: null };
    return { state: "unreachable", why: res.status === 429 ? "it answered 429: this deployment is being rate-limited" : `it answered ${res.status}` };
  } catch {
    return { state: "unreachable", why: "it did not answer" };
  }
}

/** Every chain, asked at once. */
export async function chainReach(fetcher: typeof fetch = fetch): Promise<Record<Chain, Reach>> {
  const probes = chainProbes();
  const [tron, ethereum, polygon] = await Promise.all([reach(probes.tron, fetcher), reach(probes.ethereum, fetcher), reach(probes.polygon, fetcher)]);
  return { tron, ethereum, polygon };
}
