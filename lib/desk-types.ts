/**
 * NOIR's dispatch desk — the shared contract.
 *
 * Wallets from many cases are attributed to the nearest VASP in both
 * directions and filed under it; the officer sends one consolidated request
 * per VASP and records what the VASP did. Design:
 * docs/superpowers/specs/2026-09-29-dispatch-desk-design.md.
 *
 * Types only. Two halves of the backend are built against this file on
 * separate branches; change it only with a note in the spec's change log.
 *
 * Rules that the types encode:
 *  - An unreadable wallet is never an empty one: `readable` and `inboundRead`
 *    are stated, and a wallet NOIR could not read files under no VASP.
 *  - Confidence is how much evidence was seen, never accuracy.
 *  - Only our own label table files a wallet under a VASP. An explorer's tag
 *    is carried as a lead (`InboundLead`), never as an attribution.
 *  - No statute is ever part of a request; the officer supplies the basis.
 */

import type { LeContact } from "./le-contacts";
import type { FiuListing } from "./fiu";
import type { Actor } from "./identity";
import type { Listing } from "./screen";
import type { LabelSource } from "./types";

/** Chains NOIR traces. Anything else is recognised and screened, not traced. */
export type TracedChain = "tron" | "ethereum" | "polygon";

/** The chain an entry is on: a traced chain, or the screening module's chain id (e.g. "bitcoin"). */
export type EntryChain = TracedChain | string;

export type VaspKind = "exchange_deposit" | "exchange_hot";

/** Where the money went: the VASP the wallet's USDT reached, and the account there. */
export interface OutboundAttribution {
  vasp: string;
  kind: VaspKind;
  /** The customer deposit address, or the exchange wallet itself for a hot wallet. */
  account: string;
  /** 0..1, how much evidence was seen — never a probability of being right. */
  confidence: number;
  source: LabelSource;
  /** The label's own evidence line, verbatim, including any caution it carries. */
  evidence: string | null;
  /** USDT from this wallet that reached the account. */
  usdt: number;
  /** Transfers into the account on the traced path. */
  txHashes: string[];
  /**
   * Every stop from the wallet (depth 0) to the account, along the largest
   * share. Absent on records written before 29 Sep 2026 evening.
   */
  route?: RouteStop[];
}

/** One stop on the route the money took. `usdt` is the wallet's money that reached it. */
export interface RouteStop {
  address: string;
  depth: number;
  label: { entity: string; kind: string } | null;
  usdt: number;
}

/** A laundering typology the trace observed, in the trace's own words. */
export interface Typology {
  code: "SHORT_DWELL" | "HIGH_FANOUT" | "PEEL_CHAIN" | "ROUND_AMOUNTS" | "NEW_ADDRESS" | "SANCTIONED_CONTACT";
  reason: string;
  /** The wallet it was observed at. */
  at: string;
  /** For a contact with a listed address or a mixer: the USDT of the wallet's traced money that reached `at`, as the trace counted it. Absent on records read before it was kept. */
  usdt?: number;
}

/** Why no outbound VASP was named, when none was. */
export type OutboundStop = "mixer" | "sanctioned" | "contract" | "none-found";

/** Who funded the wallet: a VASP in our own table, one hop back or paying in directly. */
export interface InboundAttribution {
  vasp: string;
  kind: VaspKind;
  /** Payers of the wallet that this VASP funded. */
  payers: number;
  /** What those payers paid into the wallet, USDT. */
  paidUsdt: number;
  confidence: number;
  source: LabelSource;
}

/** A funding source named only by the explorer's tag: shown verbatim, never filed. */
export interface InboundLead {
  tag: string;
  payers: number;
  paidUsdt: number;
}

export interface AttributionRecord {
  wallet: string;
  chain: EntryChain;
  /** False for a chain NOIR does not trace: only `screening` is meaningful then. */
  traced: boolean;
  /** False when the wallet's own history could not be read. Never reported as empty. */
  readable: boolean;
  outbound: OutboundAttribution | null;
  /** Set exactly when `outbound` is null and the wallet was readable and traced. */
  outboundStop: OutboundStop | null;
  inbound: InboundAttribution[];
  inboundLeads: InboundLead[];
  /** "not-run" for untraced chains and unreadable wallets. */
  inboundRead: "read" | "unreadable" | "not-run";
  /** OFAC SDN listing of the wallet itself, any chain. Null means not listed — not a clearance. */
  sanctioned: Listing | null;
  /** Typologies the forward trace observed. Absent on older records and untraced chains. */
  typologies?: Typology[];
  provenance: {
    /** The moment the chain was read (for a recorded case, the capture moment). */
    generatedAt: string;
    /** "recorded": answered in demo mode from data/ by exact address match. */
    basis: "live" | "recorded";
    apiCalls: number;
    responseHashes: string[];
  };
}

export type EntryStatus =
  | "pending" //       filed, waiting for the worker
  | "attributed" //    record present, wallet read
  | "unreadable" //    record present, wallet could not be read
  | "screened-only" // record present, chain not traced
  | "failed"; //       the worker threw; `error` says why; re-attribute to retry

export interface Filing {
  caseRef: string | null;
  by: Actor;
  at: string;
}

export interface DeskEntry {
  /** Stable id, "e_" + 12 hex. */
  id: string;
  wallet: string;
  chain: EntryChain;
  /** Every time the wallet was filed, oldest first. Filing it again appends here. */
  filings: Filing[];
  status: EntryStatus;
  record: AttributionRecord | null;
  error: string | null;
  /** When the current record was written, or null. */
  attributedAt: string | null;
  /** Times the worker has read this wallet since it was last queued. Absent on entries written before retries existed. */
  attempts?: number;
  /**
   * When the worker will read an unreadable wallet again by itself (ISO, UTC);
   * null when it will not: the wallet was read, or the attempts are spent.
   */
  retryAt?: string | null;
}

export const ASKS = ["kyc", "access-logs", "transactions", "preservation", "freeze"] as const;
export type Ask = (typeof ASKS)[number];

export const REQUEST_STATUSES = [
  "drafted",
  "sent",
  "acknowledged",
  "data-received",
  "frozen",
  "refused",
  "no-response",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface StatusChange {
  status: RequestStatus;
  at: string;
  by: Actor;
  /** Calendar day the event happened (YYYY-MM-DD), when the officer gave one. */
  on: string | null;
  /** The VASP's or SAHYOG's reference number, as typed. */
  reference: string | null;
  note: string | null;
}

export interface VaspRequest {
  /** "r_" + 12 hex. */
  id: string;
  vasp: string;
  asks: Ask[];
  /** The desk entries the request covered when drafted; later filings are not in it. */
  entryIds: string[];
  /** Oldest first; the last element is the current status. The first is always "drafted". */
  history: StatusChange[];
}

/** The desk file on disk. */
export interface DeskFile {
  version: 1;
  entries: DeskEntry[];
  requests: VaspRequest[];
}

/**
 * A case reference the unit has closed. Closing files nothing and removes
 * nothing: the wallets, their attributions and the requests stay as they are.
 * While a case is closed a filing that names it is refused, and it can be
 * reopened. Kept beside the desk (`lib/case-store.ts`), not in it.
 */
export interface CaseClosure {
  caseRef: string;
  /** When it was recorded: ISO, UTC. */
  closedAt: string;
  by: Actor;
  /** Why, in the officer's words; at most 500 characters. */
  note: string | null;
}

/** One wallet as it sits under a VASP row. A wallet can sit under a VASP in both directions. */
export interface RoutedWallet {
  entryId: string;
  wallet: string;
  chain: EntryChain;
  direction: "outbound" | "inbound";
  caseRefs: string[];
  /** Outbound: the account at the VASP. Inbound: null. */
  account: string | null;
  /** Outbound: USDT that reached the account. Inbound: USDT paid in by payers this VASP funded. */
  usdt: number;
  confidence: number;
  source: LabelSource;
  evidence: string | null;
  txHashes: string[];
}

export interface VaspRow {
  vasp: string;
  /** Present only when the FIU-IND annexure lists the VASP; absence is never stated. */
  fiu: FiuListing | null;
  /** The recorded LE channel, a recorded "not found", or null if never looked up. */
  le: LeContact | null;
  wallets: RoutedWallet[];
  /** Distinct case references across the row's wallets. */
  caseRefs: string[];
  outboundUsdt: number;
  inboundUsdt: number;
  /** True only when at least one outbound account exists: a freeze needs an account. */
  canFreeze: boolean;
  /** Most recent request to this VASP, or null. */
  request: VaspRequest | null;
  /** Row wallets (entry ids) not covered by `request`: filed after it was drafted. */
  uncoveredEntryIds: string[];
}

/** What GET /api/desk returns. */
export interface DeskView {
  rows: VaspRow[];
  pending: DeskEntry[];
  unreadable: DeskEntry[];
  screenedOnly: DeskEntry[];
  failed: DeskEntry[];
  /** Attributed and readable, but no VASP in either direction. */
  unrouted: DeskEntry[];
}

/** The consolidated request as a document: everything the letter prints. */
export interface RequestLetter {
  requestId: string | null;
  vasp: string;
  /** The FIU-IND legal name when listed, else the VASP's trade name. */
  addressee: string;
  fiu: FiuListing | null;
  le: LeContact | null;
  asks: Ask[];
  /** False removes "freeze" from what may be asked. */
  canFreeze: boolean;
  wallets: RoutedWallet[];
  caseRefs: string[];
  /** Always blank: the officer writes the legal basis. NOIR prints no statute. */
  legalBasis: "";
  generatedAt: string;
}

/** One line of intake, checked before any chain read. */
export type IntakeLine =
  | { line: number; ok: true; wallet: string; chain: EntryChain; traced: boolean; caseRef: string | null }
  | { line: number; ok: false; raw: string; reason: string };
