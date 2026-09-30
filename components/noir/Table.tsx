/**
 * Table — one table pattern for every list of rows: wallets under a VASP,
 * requests in the register, VASPs in the registry.
 *
 * Props
 *   columns   [{ label, align? }] — the head. align "end" right-aligns a column
 *             of figures.
 *   rows      [{ key, cells }] — `cells[i]` is the content under `columns[i]`.
 *   caption   read by screen readers only
 *
 * From the lg breakpoint up it is a real table (heavy rule under the head,
 * hairlines between rows). Below it each row stacks and each cell prints its
 * column name above it, so a table never scrolls sideways. The look lives in
 * `.noir-table` in app/globals.css.
 */

export interface Column {
  label: string;
  align?: "start" | "end";
}

export interface TableRow {
  key: string;
  cells: React.ReactNode[];
}

export function Table({
  columns,
  rows,
  caption,
}: {
  columns: Column[];
  rows: TableRow[];
  caption?: string;
}) {
  // A table wider than its column scrolls inside this frame; the page never scrolls sideways.
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="noir-table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.label} scope="col" data-align={c.align}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell, i) => (
                <td
                  key={columns[i]?.label ?? i}
                  data-label={columns[i]?.label}
                  data-align={columns[i]?.align}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
