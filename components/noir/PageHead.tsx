/**
 * PageHead — how a screen begins: its name as the page's one <h1>, and one line
 * that says what the screen is for. No small label above it.
 *
 * Props
 *   title     the screen's name, in sign type
 *   size      "title" (default) | "display" (the landing page's headline)
 *   lede      one sentence beneath: what the officer does here
 *   children  anything to set beneath the lede, such as the actions
 *   aside     content set to the right on a wide screen (a count, a status)
 */

import { Heading } from "./Type";

export function PageHead({
  title,
  size = "title",
  lede,
  aside,
  children,
  className = "",
}: {
  title: React.ReactNode;
  size?: "title" | "display";
  lede?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between ${className}`}>
      <div className="min-w-0 flex-1">
        <Heading level={1} size={size === "display" ? "display" : "title"}>
          {title}
        </Heading>
        {lede ? <p className="mt-4 max-w-prose text-lead text-ink-soft">{lede}</p> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
      {aside ? <div className="min-w-0 shrink-0">{aside}</div> : null}
    </header>
  );
}
