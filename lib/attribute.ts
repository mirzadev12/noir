/**
 * One wallet → one attribution record: the nearest VASP on both sides of it.
 *
 *  - Outbound, where its money went: the forward trace (`lib/tracer.ts`) and
 *    the exchange wallet the money reached, with the account there.
 *  - Inbound, who funded it: its payers one hop back (`lib/payers.ts`) and the
 *    exchanges in our own table that funded them. An explorer's tag is carried
 *    as a lead and never files the wallet under a VASP.
 *
 * Nothing here decides anything a lookup did not: every name comes from the
 * label table, and the confidence is the label's — how much evidence was seen,
 * never a probability of being right. A wallet the chain would not answer for
 * is stated as unreadable, never as one that holds nothing.
 *
 * Server-only (the default dependencies read the chain).
 */

import payersFile from "../data/demo-payers.json";
import type {
  AttributionRecord,
  EntryChain,
  InboundAttribution,
  InboundLead,
  OutboundAttribution,
  OutboundStop,
  RouteStop,
  VaspKind,
} from "./desk-types";
import { DEMO_MODE, frozenTrace } from "./demo";
import type { PayersTrace, TracedPayer } from "./payers";
import { screenAddress, type Screening } from "./screen";
import type { Label, TraceResult } from "./types";

export interface AttributeDeps {
  trace(wallet: string, chain: EntryChain): Promise<TraceResult>;
  payers(wallet: string, chain: EntryChain): Promise<PayersTrace>;
  screen(wallet: string): Pick<Screening, "listing">;
  /** The recorded answer in demo mode, or null to read the chain. */
  recorded(wallet: string, chain: EntryChain): { trace: TraceResult; payers: PayersTrace | null } | null;
}

const TRACED = new Set(["tron", "ethereum", "polygon"]);
const UNREAD = /could not be read/i;
const round2 = (n: number) => Math.round(n * 100) / 100;
const isVasp = (label: Label | null): label is Label & { kind: VaspKind } =>
  !!label && (label.kind === "exchange_deposit" || label.kind === "exchange_hot");

/** The exchange the money reached — the largest share, as the tracer ranks an exit. */
function outboundOf(trace: TraceResult): { outbound: OutboundAttribution | null; stop: OutboundStop | null } {
  const reached = trace.nodes
    .filter((n) => n.depth > 0 && n.taintedValueUsdt > 0)
    .sort((a, b) => b.taintedValueUsdt - a.taintedValueUsdt);
  const exit = reached.find((n) => isVasp(n.label));
  if (exit && isVasp(exit.label)) {
    return {
      outbound: {
        vasp: exit.label.entity,
        kind: exit.label.kind,
        account: exit.address,
        confidence: exit.label.confidence,
        source: exit.label.source,
        evidence: exit.label.evidence ?? null,
        usdt: round2(exit.taintedValueUsdt),
        txHashes: trace.edges.filter((e) => e.to === exit.address).map((e) => e.txHash),
        route: routeTo(trace, exit.address),
      },
      stop: null,
    };
  }
  const stopped = reached.find((n) => n.label && ["mixer", "sanctioned", "contract"].includes(n.label.kind));
  return { outbound: null, stop: (stopped?.label?.kind as OutboundStop | undefined) ?? "none-found" };
}

/**
 * The stops from the wallet to `target`, walking back one hop at a time
 * through the parent that carried the most of the wallet's money. Drawn as
 * the route line; it states nothing the trace's own nodes do not.
 */
function routeTo(trace: TraceResult, target: string): RouteStop[] {
  const byAddress = new Map(trace.nodes.map((n) => [n.address, n]));
  const stop = (address: string): RouteStop => {
    const n = byAddress.get(address);
    return {
      address,
      depth: n?.depth ?? 0,
      label: n?.label ? { entity: n.label.entity, kind: n.label.kind } : null,
      usdt: round2(n?.taintedValueUsdt ?? 0),
    };
  };
  const route = [stop(target)];
  const seen = new Set([target]);
  let current = byAddress.get(target);
  while (current && current.depth > 0) {
    const depth = current.depth;
    const parents = trace.edges
      .filter((e) => e.to === current!.address && byAddress.get(e.from)?.depth === depth - 1 && !seen.has(e.from))
      .map((e) => byAddress.get(e.from)!)
      .sort((a, b) => b.taintedValueUsdt - a.taintedValueUsdt);
    if (!parents.length) break;
    seen.add(parents[0].address);
    route.unshift(stop(parents[0].address));
    current = parents[0];
  }
  return route;
}

/** The strongest label that credits `entity` among the payers — the evidence behind an inbound row. */
function strongest(entity: string, payers: TracedPayer[]): Label | null {
  const key = entity.toLowerCase();
  let best: Label | null = null;
  for (const p of payers) {
    const labels = [p.label, ...p.sources.map((s) => s.label)];
    for (const l of labels) {
      if (isVasp(l) && l.entity.toLowerCase() === key && (!best || l.confidence > best.confidence)) best = l;
    }
  }
  return best;
}

function inboundOf(p: PayersTrace): { inbound: InboundAttribution[]; leads: InboundLead[] } {
  const inbound: InboundAttribution[] = [];
  const leads: InboundLead[] = [];
  for (const row of p.exchanges) {
    const label = row.via === "table" ? strongest(row.entity, p.payers) : null;
    if (label && (row.kind === "exchange_hot" || row.kind === "exchange_deposit")) {
      inbound.push({
        vasp: row.entity,
        kind: row.kind,
        payers: row.payers,
        paidUsdt: round2(row.paidUsdt),
        confidence: label.confidence,
        source: label.source,
      });
    } else {
      leads.push({ tag: row.entity, payers: row.payers, paidUsdt: round2(row.paidUsdt) });
    }
  }
  return { inbound, leads };
}

export async function attributeWallet(
  wallet: string,
  chain: EntryChain,
  deps: Partial<AttributeDeps> = {},
): Promise<AttributionRecord> {
  const d = { ...defaultDeps(), ...deps };
  const sanctioned = d.screen(wallet).listing ?? null;
  const base = {
    wallet,
    chain,
    outbound: null,
    outboundStop: null,
    inbound: [],
    inboundLeads: [],
    inboundRead: "not-run" as const,
    sanctioned,
  };

  if (!TRACED.has(chain)) {
    return {
      ...base,
      traced: false,
      readable: true,
      provenance: { generatedAt: new Date().toISOString(), basis: "live", apiCalls: 0, responseHashes: [] },
    };
  }

  const recorded = d.recorded(wallet, chain);
  let trace: TraceResult;
  try {
    trace = recorded ? recorded.trace : await d.trace(wallet, chain);
  } catch (err) {
    if (err instanceof Error && UNREAD.test(err.message)) {
      return {
        ...base,
        traced: true,
        readable: false,
        provenance: { generatedAt: new Date().toISOString(), basis: "live", apiCalls: 0, responseHashes: [] },
      };
    }
    throw err;
  }

  // Payers read any 0x address as Ethereum, so a Polygon wallet's inbound is
  // not run rather than answered with another chain's history.
  const payers = recorded
    ? recorded.payers
    : chain === "polygon"
      ? null
      : await d.payers(wallet, chain);

  const { outbound, stop } = outboundOf(trace);
  const inb = payers?.readable ? inboundOf(payers) : { inbound: [], leads: [] };
  return {
    ...base,
    traced: true,
    readable: true,
    outbound,
    outboundStop: stop,
    inbound: inb.inbound,
    inboundLeads: inb.leads,
    inboundRead: payers ? (payers.readable ? "read" : "unreadable") : "not-run",
    typologies: trace.riskFlags.map((f) => ({ code: f.code, reason: f.reason, at: f.atAddress })),
    provenance: {
      generatedAt: trace.provenance.generatedAt,
      basis: recorded ? "recorded" : "live",
      apiCalls: trace.provenance.apiCalls + (payers?.provenance.apiCalls ?? 0),
      responseHashes: [...trace.provenance.responseHashes, ...(payers?.provenance.responseHashes ?? [])],
    },
  };
}

/** Recorded payers, exact chain:address match — the same rule demo mode applies to traces. */
function recordedPayers(wallet: string, chain: EntryChain): PayersTrace | null {
  const cases = (payersFile as { cases: Record<string, PayersTrace> }).cases;
  const key = `${chain}:${/^0x/i.test(wallet) ? wallet.toLowerCase() : wallet}`;
  return cases[key] ?? null;
}

function defaultDeps(): AttributeDeps {
  return {
    async trace(wallet, chain) {
      const { runTrace } = await import("./tracer");
      return runTrace({
        address: wallet,
        amount: "auto",
        fraudDate: "auto",
        ...(chain === "polygon" ? { chain: "polygon" as const } : {}),
      });
    },
    async payers(wallet) {
      const { tracePayers } = await import("./payers");
      return tracePayers(wallet);
    },
    screen: screenAddress,
    recorded(wallet, chain) {
      if (!DEMO_MODE) return null;
      const frozen = frozenTrace(wallet, chain === "polygon" ? "polygon" : undefined);
      return frozen ? { trace: frozen.trace, payers: recordedPayers(wallet, chain) } : null;
    },
  };
}

