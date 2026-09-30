/**
 * Type — the three text primitives every screen is written with, so no page
 * chooses a size, weight or colour on its own.
 *
 *   <Heading level size>   a sign-type heading. `level` is the HTML rank (1–4);
 *                          `size` is how loud it is: "display" | "sign" | "headline" | "title" | "lead".
 *                          Rank on screen is carried by size alone.
 *   <Label soft>           small heavy capitals that name a thing: "OUTBOUND".
 *   <Text size tone>       running text. size "body" | "small" | "lead" | "lede" (a landing section's opening sentence); tone "ink" | "soft".
 *                          `measure` limits the line length for reading.
 *
 * Sizes, weights and widths come from app/globals.css.
 */

import { createElement } from "react";

const HEADING = {
  display: "type-sign-black text-display",
  sign: "type-sign-black text-sign",
  headline: "type-sign-black text-headline",
  title: "type-sign text-title",
  lead: "type-sign text-lead",
} as const;

export function Heading({
  level = 2,
  size = "title",
  children,
  className = "",
  id,
}: {
  level?: 1 | 2 | 3 | 4;
  size?: keyof typeof HEADING;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return createElement(`h${level}`, { id, className: `min-w-0 text-balance wrap-anywhere ${HEADING[size]} ${className}` }, children);
}

export function Label({ children, soft = false, className = "" }: { children: React.ReactNode; soft?: boolean; className?: string }) {
  return <span className={`type-label ${soft ? "text-ink-soft" : ""} ${className}`}>{children}</span>;
}

const TEXT = { body: "text-body", small: "text-small", lead: "text-lead", lede: "text-lede" } as const;

export function Text({
  children,
  size = "body",
  tone = "ink",
  measure = false,
  as = "p",
  className = "",
}: {
  children: React.ReactNode;
  size?: keyof typeof TEXT;
  tone?: "ink" | "soft";
  measure?: boolean;
  as?: "p" | "div" | "span";
  className?: string;
}) {
  return createElement(
    as,
    { className: `min-w-0 ${TEXT[size]} ${tone === "soft" ? "text-ink-soft" : ""} ${measure ? "max-w-prose" : ""} ${className}` },
    children,
  );
}
