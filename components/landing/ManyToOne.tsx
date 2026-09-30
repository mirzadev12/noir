/**
 * ManyToOne — NOIR's idea as a picture: wallets from separate cases, each on
 * its own route, arriving at one exchange, which leaves as one request. The
 * exchange and its wallet count are the recorded desk's busiest destination;
 * the case labels are placeholders, and the caption says so.
 * The routes flow; under reduced motion they are still.
 *
 * Two drawings, one meaning: a landscape one from the sm breakpoint up, and a
 * portrait one below it (cases stacked, their routes running down a rail into
 * the exchange, then the letter), drawn at about screen scale so every label is
 * at least 12px on a phone.
 */

export function ManyToOne({ vasp, wallets }: { vasp: string; wallets: number }) {
  // One drawn route per wallet the exchange holds, up to five, centred on it.
  const n = Math.max(2, Math.min(wallets, 5));
  const rows = Array.from({ length: n }, (_, i) => i);
  const y = (i: number) => 170 + (i - (n - 1) / 2) * 58;
  return (
    <figure className="min-w-0">
      <svg viewBox="0 0 760 340" className="hidden h-auto w-full sm:block" role="img" aria-labelledby="m2o-title m2o-desc">
        <title id="m2o-title">Many wallets, one exchange, one request</title>
        <desc id="m2o-desc">
          Wallets from several cases each follow their own route to the same exchange; the desk files them together and one request goes to
          that exchange.
        </desc>
        {rows.map((i) => (
          <g key={i}>
            <path
              d={`M150 ${y(i)} C 300 ${y(i)}, 330 170, 470 170`}
              fill="none"
              stroke="var(--color-signal)"
              strokeOpacity={0.9}
              strokeWidth="2"
              className="flow"
              style={{ animationDelay: `${i * -0.35}s` }}
            />
            <rect x="22" y={y(i) - 17} width="128" height="34" rx="10" fill="var(--color-paper-3)" stroke="var(--color-rule-strong)" />
            <text x="40" y={y(i) + 5} fill="var(--color-ink-soft)" fontSize="13" fontFamily="var(--font-mono)">
              {`wallet ${i + 1}`}
            </text>
            <text x="22" y={y(i) - 24} fill="var(--color-ink-faint)" fontSize="11" fontFamily="var(--font-sans)">
              {`Case ${i + 1}`}
            </text>
          </g>
        ))}
        <rect x="470" y="120" width="150" height="100" rx="16" fill="var(--color-paper-2)" stroke="var(--color-signal)" strokeWidth="2" />
        <text x="545" y="162" textAnchor="middle" fill="var(--color-ink)" fontSize="22" fontWeight="800" fontFamily="var(--font-sans)">
          {vasp}
        </text>
        <text x="545" y="190" textAnchor="middle" fill="var(--color-ink-soft)" fontSize="13" fontFamily="var(--font-sans)">
          {wallets} wallets{wallets > 5 ? " (5 drawn)" : ""}
        </text>
        <path d="M620 170 H 690" stroke="var(--color-route)" strokeWidth="2.5" />
        <path d="M680 160 l12 10 -12 10" fill="none" stroke="var(--color-route)" strokeWidth="2.5" />
        <rect x="700" y="146" width="44" height="48" rx="6" fill="var(--color-ink)" />
        <path d="M708 160 h28 M708 170 h28 M708 180 h18" stroke="var(--color-paper)" strokeWidth="2.5" />
      </svg>
      <svg viewBox="0 0 340 500" className="block h-auto w-full sm:hidden" role="img" aria-labelledby="m2o-p-title m2o-p-desc">
        <title id="m2o-p-title">Many wallets, one exchange, one request</title>
        <desc id="m2o-p-desc">
          Wallets from several cases are stacked; their routes run down into the same exchange, and one request goes from that exchange.
        </desc>
        {rows.map((i) => {
          const py = 30 + i * 52;
          return (
            <g key={i}>
              <path
                d={`M186 ${py} H 300 V 280`}
                fill="none"
                stroke="var(--color-signal)"
                strokeOpacity={0.9}
                strokeWidth="2"
                className="flow"
                style={{ animationDelay: `${i * -0.35}s` }}
              />
              <rect x="16" y={py - 22} width="170" height="44" rx="10" fill="var(--color-paper-3)" stroke="var(--color-rule-strong)" />
              <text x="28" y={py - 5} fill="var(--color-ink-soft)" fontSize="14" fontFamily="var(--font-sans)">
                {`Case ${i + 1}`}
              </text>
              <text x="28" y={py + 13} fill="var(--color-ink)" fontSize="14" fontFamily="var(--font-mono)">
                {`wallet ${i + 1}`}
              </text>
            </g>
          );
        })}
        <path d="M300 280 H 170 V 306" fill="none" stroke="var(--color-signal)" strokeWidth="2" className="flow" />
        <rect x="50" y="306" width="240" height="82" rx="16" fill="var(--color-paper-2)" stroke="var(--color-signal)" strokeWidth="2" />
        <text x="170" y="343" textAnchor="middle" fill="var(--color-ink)" fontSize="24" fontWeight="800" fontFamily="var(--font-sans)">
          {vasp}
        </text>
        <text x="170" y="368" textAnchor="middle" fill="var(--color-ink-soft)" fontSize="14" fontFamily="var(--font-sans)">
          {wallets} wallets{wallets > 5 ? " (5 drawn)" : ""}
        </text>
        <path d="M170 388 V 424" stroke="var(--color-route)" strokeWidth="2.5" />
        <path d="M160 414 l10 12 10 -12" fill="none" stroke="var(--color-route)" strokeWidth="2.5" />
        <rect x="146" y="434" width="48" height="52" rx="6" fill="var(--color-ink)" />
        <path d="M154 450 h32 M154 461 h32 M154 472 h20" stroke="var(--color-paper)" strokeWidth="2.5" />
        <text x="206" y="466" fill="var(--color-ink)" fontSize="15" fontWeight="700" fontFamily="var(--font-sans)">
          One request
        </text>
      </svg>
      <figcaption className="mt-3 text-small text-ink-faint">
        A diagram of the mechanism. The exchange and its wallet count are the recorded desk&rsquo;s busiest destination; the case labels are placeholders. On the desk, every wallet and case is your own.
      </figcaption>
    </figure>
  );
}
