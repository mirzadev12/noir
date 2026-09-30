/**
 * Figure — one number with its name: the way every quantity is shown, whether
 * it is a count on the landing page or the USDT that reached an account.
 *
 * Props
 *   label   what it counts, in small capitals above it ("Deposit addresses")
 *   value   the number, already formatted (see lib/noir-format.ts)
 *   unit    what it is measured in ("USDT"); never a currency conversion
 *   note    one quiet line beneath it, e.g. where it was counted from
 *   size    "sm" | "md" (default) | "lg"
 *
 * Numbers are monospaced and tabular so a column of them lines up.
 */

const SIZE = { sm: "text-lead", md: "text-figure", lg: "text-title" } as const;

export function Figure({
  label,
  value,
  unit,
  note,
  size = "md",
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="type-label text-ink-soft">{label}</div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={`type-mono font-bold ${SIZE[size]}`}>{value}</span>
        {unit ? <span className="type-label">{unit}</span> : null}
      </div>
      {note ? <div className="mt-1 text-small text-ink-soft">{note}</div> : null}
    </div>
  );
}
