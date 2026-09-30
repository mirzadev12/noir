/**
 * RouteLink — a link inside running text or a table cell: route blue, underlined,
 * with an optional arrow to say which way it leads.
 *
 * Props
 *   href      an address on NOIR (Next's <Link>) or, with `external`, a page on
 *             another site, which opens in a new tab and says so
 *   arrow     "right" | "left" | "down": an arrow drawn after (right, down) or
 *             before (left) the words
 *   external  the link leaves NOIR: adds the external icon and opens a new tab
 *   copy      a value to offer a copy button for, after the link (an address or hash, as on an explorer)
 *   mono      the words are an address or hash: monospaced, and broken only between even parts (see <Mono>)
 *
 * Route blue is only ever used for links and actions; this is where most of it
 * appears.
 */

import Link from "next/link";
import { CopyButton } from "./CopyButton";
import { Icon } from "./Icon";
import { Mono } from "./Mono";

export function RouteLink({
  href,
  arrow,
  external = false,
  mono = false,
  copy,
  title,
  className = "",
  children,
}: {
  href: string;
  arrow?: "right" | "left" | "down";
  external?: boolean;
  mono?: boolean;
  copy?: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = `max-w-full ${arrow ? "whitespace-nowrap" : ""} ${className}`;
  const inner = mono ? <Mono>{children}</Mono> : children;
  const body = (
    <>
      {arrow === "left" ? <Icon name="arrow-left" size="sm" className="mr-1.5" /> : null}
      {inner}
      {arrow === "right" ? <Icon name="arrow-right" size="sm" className="ml-1.5" /> : null}
      {arrow === "down" ? <Icon name="arrow-down" size="sm" className="ml-1.5" /> : null}
      {external ? <Icon name="external" size="sm" className="ml-1.5" title="Opens another site" /> : null}
    </>
  );
  const link = external ? (
    <a href={href} target="_blank" rel="noreferrer noopener" title={title} className={cls}>
      {body}
    </a>
  ) : (
    <Link href={href} title={title} className={cls}>
      {body}
    </Link>
  );
  if (!copy) return link;
  return (
    <span className="inline-flex min-w-0 max-w-full items-baseline gap-x-2">
      {link}
      <CopyButton value={copy} />
    </span>
  );
}
