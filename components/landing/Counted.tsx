/**
 * Counted — the figures under the landing's hall: what NOIR can name, as the
 * counters of a departures board. Every figure is counted from the files in
 * data/ when the site is built (lib/landing.ts) and arrives here already
 * formatted; the line beneath names the files, so a reader can count them again.
 *
 * Props
 *   items     the figures: `value` (formatted), `label` (what it counts)
 *   children  the line beneath: where the figures were counted from
 */

export interface CountedItem {
  value: string;
  label: string;
}

export function Counted({ items, children }: { items: CountedItem[]; children?: React.ReactNode }) {
  return (
    <section aria-labelledby="counted-title" className="min-w-0">
      <h2 id="counted-title" className="sr-only">
        What NOIR can name, counted
      </h2>
      {/* The gaps between the cells show the ground beneath: one hairline between any two figures, at any width. */}
      <dl className="grid min-w-0 grid-cols-2 gap-px bg-rule xl:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="flex min-w-0 flex-col-reverse justify-end gap-3 bg-paper px-4 py-6 md:px-7 md:py-8">
            <dt className="max-w-44 text-body text-ink-soft">{it.label}</dt>
            <dd className="type-mono whitespace-nowrap text-count font-bold text-ink">{it.value}</dd>
          </div>
        ))}
      </dl>
      {children ? <p className="mt-5 max-w-prose text-small text-ink-faint">{children}</p> : null}
    </section>
  );
}
