/**
 * Blank — a line to write on, for the parts of a printed letter that only the
 * officer can fill in: the legal basis, a name, a date, a signature. NOIR never
 * fills these in (it prints no statute), so on paper they are ruled blanks.
 *
 * Props
 *   label  what goes on the line ("Legal basis")
 *   lines  how many ruled lines (default 1)
 *   hint   one quiet line beneath, e.g. "To be written by the requesting officer"
 */

export function Blank({ label, lines = 1, hint, className = "" }: { label: string; lines?: number; hint?: string; className?: string }) {
  return (
    <div className={`keep-together min-w-0 ${className}`}>
      <p className="type-label">{label}</p>
      <div aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="write-line h-9" />
        ))}
      </div>
      {hint ? <p className="mt-1 text-small text-ink-soft">{hint}</p> : null}
    </div>
  );
}
