/**
 * Board — a departure board: facts set the way signage sets them. One ruled
 * list; each row reads left to right as the figure (monospaced, right-aligned in
 * a fixed column so the digits line up), what it counts, and beneath that where
 * it comes from.
 *
 * Props
 *   rows     [{ key, figure, label, source? }]. `figure` is already formatted;
 *            `label` says what it counts; `source` names the file, list or date
 *            it was counted from, so a figure is never printed without its origin
 *   caption  read by screen readers only
 */

export interface BoardRow {
  key: string;
  figure: React.ReactNode;
  label: React.ReactNode;
  source?: React.ReactNode;
}

export function Board({ rows, caption }: { rows: BoardRow[]; caption?: string }) {
  return (
    <ul aria-label={caption} className="rule-t min-w-0">
      {rows.map((row) => (
        <li key={row.key} className="hair-b flex min-w-0 items-baseline gap-4 py-4 md:gap-8">
          <span className="type-mono w-28 shrink-0 text-right text-figure font-bold md:w-40">{row.figure}</span>
          <span className="min-w-0 flex-1">
            <span className="type-sign block text-lead leading-tight">{row.label}</span>
            {row.source ? <span className="mt-1 block text-small text-ink-soft">{row.source}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
