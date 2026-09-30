/**
 * ManyToOne — NOIR's idea as a picture: wallets from separate cases, each on
 * its own route, arriving at one exchange, which leaves as one request. The
 * exchange and its wallet count are the recorded desk's busiest destination;
 * the case labels are placeholders, and the caption says so.
 * The routes flow; under reduced motion they are still.
 */

export function ManyToOne({ vasp, wallets }: { vasp: string; wallets: number }) {
  // One drawn route per wallet the exchange holds, up to five, centred on it.
  const n = Math.max(2, Math.min(wallets, 5));
  const rows = Array.from({ length: n }, (_, i) => i);
  const y = (i: number) => 170 + (i - (n - 1) / 2) * 58;
  return (
    <figure className="min-w-0">
      <svg viewBox="0 0 760 340" className="hidden h-auto w-full xl:block" role="img" aria-labelledby="m2o-title m2o-desc">
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
            <text x="22" y={y(i) - 24} fill="var(--color-ink-faint)" fontSize="13" fontFamily="var(--font-sans)">
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
      {/* Phones: the same picture standing up, drawn at its own scale so every label stays readable.
          Each case label sits above its wallet, and each route lands on its own point of the exchange. */}
      <svg
        viewBox={`0 0 340 ${n * 62 + 262}`}
        className="mx-auto h-auto w-full max-w-md xl:hidden"
        role="img"
        aria-label="Wallets from several cases each follow their own route down to the same exchange, and one request goes to that exchange."
      >
        {rows.map((i) => {
          const y = 26 + i * 62;
          const top = n * 62 + 58;
          const land = 90 + ((i + 0.5) * 160) / n;
          return (
            <g key={i}>
              <text x="20" y={y - 7} fill="var(--color-ink-faint)" fontSize="13" fontFamily="var(--font-sans)">
                {`Case ${i + 1}`}
              </text>
              <rect x="20" y={y} width="150" height="36" rx="10" fill="var(--color-paper-3)" stroke="var(--color-rule-strong)" />
              <text x="34" y={y + 23} fill="var(--color-ink-soft)" fontSize="14" fontFamily="var(--font-mono)">
                {`wallet ${i + 1}`}
              </text>
              <path
                d={`M170 ${y + 18} C 300 ${y + 18}, ${land + 40} ${top - 50}, ${land} ${top}`}
                fill="none"
                stroke="var(--color-signal)"
                strokeWidth="2"
                className="flow"
                style={{ animationDelay: `${i * -0.35}s` }}
              />
            </g>
          );
        })}
        <rect x="70" y={n * 62 + 58} width="200" height="84" rx="16" fill="var(--color-paper-2)" stroke="var(--color-signal)" strokeWidth="2" />
        <text x="170" y={n * 62 + 96} textAnchor="middle" fill="var(--color-ink)" fontSize="22" fontWeight="800" fontFamily="var(--font-sans)">
          {vasp}
        </text>
        <text x="170" y={n * 62 + 122} textAnchor="middle" fill="var(--color-ink-soft)" fontSize="14" fontFamily="var(--font-sans)">
          {wallets} wallets{wallets > 5 ? " (5 drawn)" : ""}
        </text>
        <path d={`M170 ${n * 62 + 142} V ${n * 62 + 190}`} stroke="var(--color-route)" strokeWidth="2.5" />
        <path d={`M160 ${n * 62 + 180} l10 12 10 -12`} fill="none" stroke="var(--color-route)" strokeWidth="2.5" />
        <rect x="146" y={n * 62 + 196} width="48" height="46" rx="6" fill="var(--color-ink)" />
        <path d={`M154 ${n * 62 + 210} h32 M154 ${n * 62 + 220} h32 M154 ${n * 62 + 230} h20`} stroke="var(--color-paper)" strokeWidth="2.5" />
      </svg>
      <figcaption className="mt-3 text-small text-ink-faint">
        A diagram of the mechanism. The exchange and its wallet count are the recorded desk&rsquo;s busiest destination; the case labels are placeholders. On the desk, every wallet and case is your own.
      </figcaption>
    </figure>
  );
}
