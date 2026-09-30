/**
 * Facts — a short list of named facts: a wallet's provenance, a VASP's channel,
 * a request's reference. A definition list, so a screen reader hears each name
 * with its value.
 *
 * Props
 *   items   [{ label, value }] — `value` may be text, an address in <Mono>, a
 *           <Tag>, or a link. An item with `value` null is left out, so a fact
 *           that does not exist is not printed as a blank
 *
 * From the sm breakpoint up the names sit in a column at the left
 * (`--facts-label` in app/globals.css), each row set off by a hairline; on a
 * phone the value sits under its name.
 */

export interface Fact {
  label: string;
  value: React.ReactNode | null;
}

export function Facts({ items, className = "" }: { items: Fact[]; className?: string }) {
  return (
    <dl className={`min-w-0 ${className}`}>
      {items
        .filter((i) => i.value !== null && i.value !== undefined && i.value !== false)
        .map((i) => (
          <div key={i.label} className="hair-t grid min-w-0 gap-1 py-3 sm:grid-cols-[var(--facts-label)_minmax(0,1fr)] sm:gap-6">
            <dt className="type-label pt-0.5 text-ink-soft">{i.label}</dt>
            <dd className="m-0 min-w-0">{i.value}</dd>
          </div>
        ))}
    </dl>
  );
}
