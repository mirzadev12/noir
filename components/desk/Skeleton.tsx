/**
 * Loading skeletons: the layout's own shape drawn in rules and quiet bars while
 * a screen reads the desk, so nothing jumps when the content lands. No spinner
 * and no shimmer: a desk officer is waiting on data, not on an animation.
 * Screen readers hear one line, "Loading …".
 */

const W = { xs: "w-16", sm: "w-28", md: "w-48", lg: "w-72", xl: "w-96" } as const;

export function Bar({ w = "md", tall = false }: { w?: keyof typeof W; tall?: boolean }) {
  return <span aria-hidden="true" className={`block max-w-full bg-rule ${W[w]} ${tall ? "h-8" : "h-3"}`} />;
}

export function SkeletonHead({ sign = false }: { sign?: boolean }) {
  return (
    <div aria-hidden="true">
      <Bar w="md" tall />
      <div className="mt-4 flex flex-col gap-2">
        <Bar w="xl" />
        <Bar w="lg" />
      </div>
      {sign ? <div className="mt-8 h-36 bg-navy/90" /> : null}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div aria-hidden="true" className="mt-12">
      <div className="rule-t pt-3">
        <Bar w="sm" tall />
      </div>
      <div className="mt-6 rule-b pb-2">
        <div className="flex gap-6">
          {Array.from({ length: cols }, (_, i) => (
            <Bar key={i} w="xs" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="hair-b flex items-center gap-6 py-5">
          <Bar w={r % 2 ? "sm" : "md"} />
          {Array.from({ length: cols - 1 }, (_, i) => (
            <Bar key={i} w="xs" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Loading({ what, sign = false, rows, cols }: { what: string; sign?: boolean; rows?: number; cols?: number }) {
  return (
    <div className="min-w-0" role="status">
      <span className="sr-only">Loading {what}…</span>
      <SkeletonHead sign={sign} />
      <SkeletonTable rows={rows} cols={cols} />
    </div>
  );
}
