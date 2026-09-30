/**
 * Mono — anything a person must be able to copy exactly: a wallet address, a
 * transaction hash, a reference number. Monospaced, tabular, never hyphenated.
 *
 * A long value never breaks in the middle of nowhere. A 42-character address is
 * cut into two equal halves and a 64-character hash into four, and the line may
 * break only between them, so a narrow screen shows two even lines instead of
 * one long line and a stray character. (A part that is itself wider than its
 * box still breaks, as a last resort, so nothing ever scrolls sideways.) Copying
 * the value copies it whole.
 *
 * Props
 *   size   "inherit" (default) | "small" | "lead"
 *   soft   secondary ink, for a hash beside an address
 *   block  render as a block instead of inline
 *   title  hover text; a long value carries itself here
 *   whole  never split (a short reference, or a value that must stay on one run)
 *   copy   a copy button after the value, as an explorer has beside every address
 */

import { monoParts } from "@/lib/noir-view";
import { CopyButton } from "./CopyButton";

const SIZE = { inherit: "", small: "text-small", lead: "text-lead" } as const;

export function Mono({
  children,
  size = "inherit",
  soft = false,
  block = false,
  whole = false,
  copy = false,
  title,
  className = "",
}: {
  children: React.ReactNode;
  size?: keyof typeof SIZE;
  soft?: boolean;
  block?: boolean;
  whole?: boolean;
  copy?: boolean;
  title?: string;
  className?: string;
}) {
  const Tag = block ? "div" : "span";
  const parts = !whole && typeof children === "string" ? monoParts(children) : null;
  const value = (
    <Tag title={title ?? (parts && parts.length > 1 ? (children as string) : undefined)} className={`type-mono min-w-0 wrap-anywhere ${SIZE[size]} ${soft ? "text-ink-soft" : ""} ${className}`}>
      {parts && parts.length > 1
        ? parts.map((p, i) => (
            <span key={i} className="inline-block max-w-full wrap-anywhere">
              {p}
            </span>
          ))
        : children}
    </Tag>
  );
  if (!copy || typeof children !== "string") return value;
  return (
    <span className="inline-flex min-w-0 max-w-full items-baseline gap-x-2">
      {value}
      <CopyButton value={children} />
    </span>
  );
}
