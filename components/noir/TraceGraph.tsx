/**
 * TraceGraph — one wallet's attribution drawn as a fund-flow graph: the
 * exchanges that funded it on the left, the wallet, and where its money went on
 * the right. It draws exactly the model it is given (`lib/trace-graph.ts`),
 * which is made from the attribution record and nothing else.
 *
 * The trace runs once when it loads: the wallet appears, then each step out
 * from it is drawn in the order the trace reached it, forward toward the VASP
 * and back toward the funders. After that a slow dash runs along every edge in
 * the direction the money moved. Under reduced motion the graph is simply
 * there, whole and still.
 *
 * From the xl breakpoint it is a graph; narrower, the same nodes are the stops
 * of NOIR's route line (stacked on a phone), so nothing shrinks below reading
 * size and nothing scrolls sideways.
 *
 * Props
 *   model   the graph, from `traceGraphOf(record, listed)`
 *   chain   the wallet's chain, for explorer links
 *   linked  link VASP nodes to their page on the desk and addresses to a public
 *           explorer (a wallet's own page); off where those pages may not exist
 *           (the landing)
 */

import { describeGraph, type GraphEdge, type GraphNode, type TraceGraphModel } from "@/lib/trace-graph";
import { explorerHref, shortAddress, vaspHref } from "@/lib/noir-format";
import { Mono } from "./Mono";
import { RouteLine, type RouteStopView } from "./RouteLine";
import { RouteLink } from "./RouteLink";

const NW = 184; // node width
const NH = 104; // node height
const GAP_X = 72;
const GAP_Y = 24;
const PAD = 6;
const TOP = 34; // the row of column labels

const BOX: Record<GraphNode["kind"], { fill: string; stroke: string; dashed?: boolean; title: string }> = {
  wallet: { fill: "var(--color-paper)", stroke: "var(--color-ink)", title: "var(--color-ink)" },
  funder: { fill: "color-mix(in srgb, var(--color-signal-3) 50%, var(--color-paper-2))", stroke: "var(--color-signal)", title: "var(--color-ink)" },
  terminus: { fill: "color-mix(in srgb, var(--color-signal-3) 50%, var(--color-paper-2))", stroke: "var(--color-signal)", title: "var(--color-ink)" },
  hop: { fill: "var(--color-paper-3)", stroke: "var(--color-rule-strong)", title: "var(--color-ink)" },
  listed: { fill: "color-mix(in srgb, var(--color-prohibit) 14%, var(--color-paper-2))", stroke: "var(--color-prohibit)", title: "var(--color-prohibit)" },
  stop: { fill: "var(--color-paper-2)", stroke: "var(--color-ink-soft)", dashed: true, title: "var(--color-ink)" },
};
const EDGE: Record<GraphEdge["side"], string> = { inbound: "var(--color-route)", outbound: "var(--color-signal)", listed: "var(--color-prohibit)" };

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const INNER = NW - 32; // the room for text inside a node
/** A text longer than its node is squeezed to fit rather than left to run out of the box (`perChar` is its width per character at its size). */
const fit = (text: string, perChar: number) => (text.length * perChar > INNER ? { textLength: INNER, lengthAdjust: "spacingAndGlyphs" as const } : {});
/** A note in one or two lines of at most `max` characters; the second line only where the node has no figure to make room for. */
function noteLines(note: string, max: number, two: boolean): string[] {
  if (note.length <= max) return [note];
  if (!two) return [clip(note, max)];
  const cut = note.lastIndexOf(" ", max);
  return cut > 0 ? [note.slice(0, cut), clip(note.slice(cut + 1), max)] : [clip(note, max)];
}
/** Delay indices, in units of the stagger token: an edge starts its step, the node it reaches arrives as the edge lands. */
const edgeAt = (step: number) => 1 + (step - 1) * 5;
const nodeAt = (step: number) => edgeAt(step) + 4;

function place(model: TraceGraphModel) {
  const inner = model.rows * NH + (model.rows - 1) * GAP_Y;
  const width = PAD * 2 + model.cols * NW + (model.cols - 1) * GAP_X;
  const height = TOP + PAD * 2 + inner;
  const at = new Map<string, { x: number; y: number }>();
  for (let col = 0; col < model.cols; col++) {
    const inCol = model.nodes.filter((n) => n.col === col).sort((a, b) => a.row - b.row);
    const block = inCol.length * NH + (inCol.length - 1) * GAP_Y;
    inCol.forEach((n, i) => at.set(n.id, { x: PAD + col * (NW + GAP_X), y: TOP + PAD + (inner - block) / 2 + i * (NH + GAP_Y) }));
  }
  return { width, height, at };
}

function NodeBox({ node, x, y, step, chain, linked }: { node: GraphNode; x: number; y: number; step: number; chain: string; linked: boolean }) {
  const box = BOX[node.kind];
  const second = node.address ? shortAddress(node.address) : node.sub;
  const href = !linked ? null : node.kind === "funder" || node.kind === "terminus" ? vaspHref(node.title) : node.address && node.kind !== "wallet" ? explorerHref(chain, node.address) : null;
  const external = href !== null && /^https?:/.test(href);
  const body = (
    <g className="route-arrive" style={{ ["--stop" as string]: step }}>
      <rect x={x} y={y} width={NW} height={NH} rx={12} fill={box.fill} stroke={box.stroke} strokeWidth={node.kind === "hop" ? 1 : 1.5} strokeDasharray={box.dashed ? "5 5" : undefined} />
      <text x={x + 16} y={y + 28} fill={box.title} fontSize="17" fontWeight="600" fontFamily="var(--font-sans)" {...fit(clip(node.title, 30), 9.6)}>
        {clip(node.title, 30)}
      </text>
      {second ? (
        <text x={x + 16} y={y + 49} fill="var(--color-ink-soft)" fontSize="14" fontFamily={node.address ? "var(--font-mono)" : "var(--font-sans)"} {...fit(second, node.address ? 8.4 : 7.4)}>
          {second}
        </text>
      ) : null}
      {node.figure ? (
        <text x={x + 16} y={y + 72} fill="var(--color-ink)" fontSize="15" fontWeight="600" fontFamily="var(--font-mono)" {...fit(node.figure, 9)}>
          {node.figure}
        </text>
      ) : null}
      {node.note
        ? noteLines(node.note, 21, !node.figure).map((line, i) => (
            <text key={i} x={x + 16} y={y + (node.figure ? 91 : second ? 72 : 52) + i * 19} fill="var(--color-ink-soft)" fontSize="14" fontFamily="var(--font-sans)">
              {line}
            </text>
          ))
        : null}
    </g>
  );
  return href ? (
    <a
      href={href}
      className="no-underline hover:no-underline"
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      aria-label={`${node.title}${node.address ? `, ${node.address}` : ""}${external ? ", opens a public explorer in a new tab" : ""}`}
    >
      {body}
    </a>
  ) : (
    body
  );
}

/** A node's address, linked to a public explorer where links are on. */
function Address({ node, chain, linked }: { node: GraphNode; chain: string; linked: boolean }) {
  if (!node.address) return null;
  const href = linked && node.kind !== "wallet" ? explorerHref(chain, node.address) : null;
  return href ? (
    <RouteLink href={href} external mono title={node.address} className="inline-flex min-h-11 items-center">
      {shortAddress(node.address)}
    </RouteLink>
  ) : (
    <Mono title={node.address}>{shortAddress(node.address)}</Mono>
  );
}

/**
 * The same graph for a column too narrow to draw it: the funders as a list,
 * the wallet's way out as NOIR's route line, and a listed address the money
 * also reached on a line of its own, since it is a branch and not a stop.
 */
function Narrow({ model, chain, linked }: { model: TraceGraphModel; chain: string; linked: boolean }) {
  const funders = model.nodes.filter((n) => n.kind === "funder");
  const branch = model.nodes.find((n) => n.id === "listed");
  const line = model.nodes.filter((n) => n.kind !== "funder" && n.id !== "listed").sort((x, y) => x.col - y.col);
  const name = (n: GraphNode) => (linked && (n.kind === "funder" || n.kind === "terminus") ? <RouteLink href={vaspHref(n.title)} className="inline-flex min-h-11 items-center">{n.title}</RouteLink> : n.title);
  const stops: RouteStopView[] = line.map((n) => ({
    key: n.id,
    tone: n.kind === "wallet" ? "origin" : n.kind === "terminus" ? "terminus" : n.kind === "stop" ? "next" : "via",
    title: <span className={n.kind === "listed" ? "text-prohibit" : undefined}>{name(n)}</span>,
    detail: <Address node={n} chain={chain} linked={linked} />,
    meta: [n.figure, n.note].filter(Boolean).join(" · ") || undefined,
  }));
  return (
    <div className="flex min-w-0 flex-col gap-6 xl:hidden">
      {funders.length > 0 ? (
        <div className="min-w-0">
          <p className="type-label text-ink-faint">Funded by</p>
          <ul className="mt-2 flex flex-col">
            {funders.map((f) => (
              <li key={f.id} className="hair-t flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 py-2 first:border-t-0">
                <span className="type-sign text-lead">{name(f)}</span>
                <span className="text-small text-ink-soft">
                  {f.sub} · <span className="type-mono text-ink">{f.figure}</span> {f.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="type-label mb-3 text-ink-faint">The trail</p>
        <RouteLine stops={stops} draw orientation="vertical" />
      </div>
      {branch ? (
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-small">
          <span className="type-label text-prohibit">Also reached</span>
          <strong className="text-prohibit">{branch.title}</strong>
          <Address node={branch} chain={chain} linked={linked} />
          <span className="text-ink-soft">{[branch.figure, branch.note].filter(Boolean).join(" · ")}</span>
        </p>
      ) : null}
    </div>
  );
}

export function TraceGraph({ model, chain, linked = false }: { model: TraceGraphModel; chain: string; linked?: boolean }) {
  const { width, height, at } = place(model);
  const stepOf = new Map<string, number>([["wallet", 0]]);
  for (const e of model.edges) stepOf.set(e.side === "inbound" ? e.from : e.to, e.step);
  const funders = model.nodes.some((n) => n.kind === "funder");
  const last = model.nodes.find((n) => n.id === "terminus" || n.id === "stop");
  /** The top of a column's first node. */
  const topOf = (col: number) => Math.min(...model.nodes.filter((n) => n.col === col).map((n) => at.get(n.id)!.y));
  // A wallet with no funder in the graph says why in words: unread is never drawn as unfunded.
  const noFunders =
    funders ? null : model.inbound === "unreadable" ? "Its funders could not be read. That is not the same as having none." : model.inbound === "not-run" ? "Funders are not looked up on this chain." : "No exchange in NOIR’s table funded its payers.";

  return (
    <div className="min-w-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="hidden h-auto w-full xl:block" style={{ maxWidth: width }} role="img" aria-label={describeGraph(model)}>
        {/* What each side of the wallet is: labels for the graph's columns, not headings. */}
        {funders ? (
          <text x={PAD} y={topOf(0) - 14} fill="var(--color-ink-faint)" fontSize="14" fontWeight="600" letterSpacing="1.1" fontFamily="var(--font-sans)">
            FUNDED BY
          </text>
        ) : null}
        {last ? (
          <text x={at.get(last.id)!.x} y={at.get(last.id)!.y - 14} fill="var(--color-ink-faint)" fontSize="14" fontWeight="600" letterSpacing="1.1" fontFamily="var(--font-sans)">
            {last.id === "terminus" ? "WENT TO" : "THE TRAIL"}
          </text>
        ) : null}

        {model.edges.map((e) => {
          const a = at.get(e.from)!;
          const b = at.get(e.to)!;
          const x1 = a.x + NW;
          const y1 = a.y + NH / 2;
          const x2 = b.x;
          const y2 = b.y + NH / 2;
          const d = `M${x1} ${y1} C ${x1 + GAP_X / 2} ${y1}, ${x2 - GAP_X / 2} ${y2}, ${x2} ${y2}`;
          const colour = EDGE[e.side];
          return (
            <g key={`${e.from}-${e.to}`} fill="none" strokeLinecap="round">
              {/* The trace reaching this edge: forward for where the money went, backward for who funded it. */}
              <path d={d} pathLength={1} stroke={colour} strokeOpacity={0.5} strokeWidth={2} className={e.side === "inbound" ? "trace-draw-back" : "trace-draw"} style={{ ["--stop" as string]: edgeAt(e.step) }} />
              {/* The money, moving the way it moved. */}
              <g className="route-arrive" style={{ ["--stop" as string]: nodeAt(e.step) }}>
                <path d={d} stroke={colour} strokeWidth={2} className="flow" />
                <path d={`M${x2 - 8} ${y2 - 6} L${x2 - 1} ${y2} L${x2 - 8} ${y2 + 6}`} stroke={colour} strokeWidth={2} />
              </g>
            </g>
          );
        })}

        {model.nodes.map((n) => {
          const p = at.get(n.id)!;
          const step = stepOf.get(n.id) ?? 0;
          return <NodeBox key={n.id} node={n} x={p.x} y={p.y} step={step === 0 ? 0 : nodeAt(step)} chain={chain} linked={linked} />;
        })}
      </svg>

      <Narrow model={model} chain={chain} linked={linked} />
      {noFunders ? <p className={`mt-5 text-small ${model.inbound === "unreadable" ? "font-medium text-wait" : "text-ink-soft"}`}>{noFunders}</p> : null}
    </div>
  );
}
