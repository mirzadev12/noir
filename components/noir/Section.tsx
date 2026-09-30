/**
 * Section — a titled band on a screen: a heavy black rule, the title in sign
 * type, an optional count at the right, an optional sentence beneath.
 *
 * Props
 *   title    "Outbound — where the money went"
 *   count    a number or short text printed at the right in mono
 *   note     one sentence of explanation, in secondary ink
 *   id       anchor for links (#request)
 *   flush    no space above (the first band in a column)
 */

export function Section({
  title,
  count,
  note,
  id,
  flush = false,
  children,
  className = "",
}: {
  title: React.ReactNode;
  count?: React.ReactNode;
  note?: React.ReactNode;
  id?: string;
  flush?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`min-w-0 scroll-mt-6 ${flush ? "" : "mt-12 md:mt-16"} ${className}`}>
      <header className="rule-t flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-3">
        <h2 className="type-sign min-w-0 text-balance text-title">{title}</h2>
        {count !== undefined ? <span className="type-mono text-small text-ink-soft">{count}</span> : null}
      </header>
      {note ? <p className="mt-2 max-w-prose text-ink-soft">{note}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
