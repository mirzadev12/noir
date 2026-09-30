/**
 * One wallet's attribution as a graph: who funded it on the left, the wallet
 * in the middle, where its money went on the right.
 *
 * The graph is drawn from the attribution record and from nothing else, so it
 * can never say more than the record does:
 *
 *  - **inbound**: each exchange in NOIR's table that funded the wallet's
 *    payers, with how many payers and what they paid in (the record counts the
 *    payers, it does not name them), then the wallet;
 *  - **outbound**: the route the record kept, stop by stop, ending at the
 *    account at the VASP; or, where no VASP was reached, one node that says
 *    where the trail ended and why;
 *  - **a listed address**: when the wallet's money reached an address on the
 *    OFAC list on its way, that address hangs off the wallet as its own node.
 *
 * An explorer's tag is a lead and is not in the graph. A wallet that could not
 * be read has no graph at all (`null`): it is never drawn as a wallet with
 * nothing around it.
 *
 * Pure and client-safe: positions are columns and rows, and the component that
 * draws it (`components/noir/TraceGraph.tsx`) turns them into coordinates.
 */

import type { AttributionRecord, OutboundStop } from "./desk-types";
import { amount, shortAddress } from "./noir-format";

export type GraphNodeKind = "funder" | "wallet" | "hop" | "terminus" | "listed" | "stop";

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  /** Column from the left, 0-based. */
  col: number;
  /** Row within its column, 0-based, top first. */
  row: number;
  /** The words on the node: a VASP's name, "The wallet", "Hop". */
  title: string;
  /** The address the node stands for, when it is one address. */
  address: string | null;
  /** A second line that is not an address: "funded 1 payer". */
  sub: string | null;
  /** USDT, formatted, with its unit; null when the record gives none for this node. */
  figure: string | null;
  /** What the node or its figure is, in a word or two. */
  note: string | null;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** Inbound edges run toward the wallet, outbound away from it; `listed` is the branch to an OFAC-listed address. */
  side: "inbound" | "outbound" | "listed";
  /** The order the trace reached it: 1 is the first step out from the wallet, in either direction. */
  step: number;
}

export interface TraceGraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cols: number;
  rows: number;
  walletCol: number;
  /** Whether the funders were read, could not be read, or are not looked up on this chain. */
  inbound: "read" | "unreadable" | "not-run";
}

/** An address on the OFAC list that the wallet's money reached on its way. */
export interface ListedContact {
  address: string;
  entity: string;
  /** USDT of the traced money that reached it, when the trace kept the figure. */
  usdt?: number | null;
}

const STOP_TITLE: Record<OutboundStop, string> = {
  mixer: "A mixer",
  sanctioned: "An OFAC-listed address",
  contract: "A smart contract",
  "none-found": "No VASP named",
};
const STOP_NOTE: Record<OutboundStop, string> = {
  mixer: "the trail ended there",
  sanctioned: "the trail ended there",
  contract: "a pool, router or bridge",
  "none-found": "no exchange NOIR can name",
};

const usdt = (n: number) => `${amount(n)} USDT`;
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

/** The graph of a record, or null when the wallet was not read or its chain is not traced. */
export function traceGraphOf(record: AttributionRecord, listed: ListedContact | null = null): TraceGraphModel | null {
  if (!record.readable || !record.traced) return null;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const walletCol = record.inbound.length > 0 ? 1 : 0;
  record.inbound.forEach((f, row) => {
    nodes.push({ id: `funder-${row}`, kind: "funder", col: 0, row, title: f.vasp, address: null, sub: `funded ${plural(f.payers, "payer")}`, figure: usdt(f.paidUsdt), note: "paid in" });
    edges.push({ from: `funder-${row}`, to: "wallet", side: "inbound", step: 1 });
  });

  const out = record.outbound;
  const route = out?.route && out.route.length >= 2 ? out.route : null;
  nodes.push({ id: "wallet", kind: "wallet", col: walletCol, row: 0, title: "The wallet", address: record.wallet, sub: null, figure: route ? usdt(route[0].usdt) : null, note: route ? "traced" : null });

  let lastCol = walletCol;
  if (out) {
    let previous = "wallet";
    const hops = route ? route.slice(1, -1) : [];
    hops.forEach((stop, i) => {
      const id = `hop-${i}`;
      lastCol = walletCol + 1 + i;
      nodes.push({ id, kind: "hop", col: lastCol, row: 0, title: stop.label?.entity ?? "Hop", address: stop.address, sub: null, figure: usdt(stop.usdt), note: "passed through" });
      edges.push({ from: previous, to: id, side: "outbound", step: i + 1 });
      previous = id;
    });
    lastCol += 1;
    nodes.push({
      id: "terminus",
      kind: "terminus",
      col: lastCol,
      row: 0,
      title: out.vasp,
      address: out.account,
      sub: null,
      figure: usdt(out.usdt),
      note: out.kind === "exchange_deposit" ? "deposit account" : "exchange wallet",
    });
    edges.push({ from: previous, to: "terminus", side: "outbound", step: hops.length + 1 });
  } else {
    const stop = record.outboundStop ?? "none-found";
    const named = stop === "sanctioned" && listed;
    lastCol = walletCol + 1;
    nodes.push({
      id: "stop",
      kind: stop === "sanctioned" ? "listed" : "stop",
      col: lastCol,
      row: 0,
      title: named ? listed.entity : STOP_TITLE[stop],
      address: named ? listed.address : null,
      sub: null,
      figure: named && typeof listed.usdt === "number" ? usdt(listed.usdt) : null,
      note: stop === "sanctioned" ? "OFAC-listed; trail ended" : STOP_NOTE[stop],
    });
    edges.push({ from: "wallet", to: "stop", side: stop === "sanctioned" ? "listed" : "outbound", step: 1 });
  }

  // A listed address the money reached on its way to a VASP hangs off the wallet, beneath the route.
  if (out && listed) {
    nodes.push({ id: "listed", kind: "listed", col: walletCol + 1, row: 1, title: listed.entity, address: listed.address, sub: null, figure: typeof listed.usdt === "number" ? usdt(listed.usdt) : null, note: "on the OFAC list" });
    edges.push({ from: "wallet", to: "listed", side: "listed", step: 1 });
  }

  const rows = Math.max(1, record.inbound.length, ...nodes.map((n) => n.row + 1));
  return { nodes, edges, cols: lastCol + 1, rows, walletCol, inbound: record.inboundRead };
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The graph in words, for a reader who cannot see it. */
export function describeGraph(model: TraceGraphModel): string {
  const by = (kind: GraphNodeKind) => model.nodes.filter((n) => n.kind === kind);
  const parts: string[] = [];
  const funders = by("funder");
  if (funders.length > 0) parts.push(funders.map((f) => `${f.title} ${f.sub}, who paid in ${f.figure}`).join("; "));
  else if (model.inbound === "unreadable") parts.push("its funders could not be read");
  else if (model.inbound === "not-run") parts.push("funders are not looked up on this chain");
  else parts.push("no exchange in NOIR’s table funded its payers");

  const terminus = by("terminus")[0];
  const hops = by("hop").length;
  if (terminus) {
    parts.push(`${terminus.figure} reached ${terminus.title} (${terminus.note})${hops ? ` through ${plural(hops, "hop")}` : " directly"}`);
  } else {
    const stop = model.nodes.find((n) => n.id === "stop");
    if (stop) parts.push(`its trail ended at ${stop.kind === "listed" && stop.address ? `${stop.title} (${shortAddress(stop.address)}), on the OFAC list` : `${stop.title.charAt(0).toLowerCase()}${stop.title.slice(1)}: ${stop.note}`}`);
  }
  const listed = model.nodes.find((n) => n.id === "listed");
  if (listed) parts.push(`${listed.figure ? `${listed.figure} of it` : "its money"} reached ${listed.title} (${shortAddress(listed.address ?? "")}), on the OFAC list`);
  return `${parts.map(sentence).join(". ")}.`;
}
