/**
 * Lanes — the graphic behind the departures board: route lanes running across
 * the page, each carrying a pulse of light toward the board, the way wallets
 * run toward their exchange. Purely decorative (aria-hidden); the pulses stop
 * under reduced motion and the lanes stay as quiet rules.
 */

const LANES = [
  { top: "12%", delay: "0s", dur: "7s" },
  { top: "30%", delay: "-2.4s", dur: "9s" },
  { top: "50%", delay: "-5.1s", dur: "6.5s" },
  { top: "70%", delay: "-1.2s", dur: "8.2s" },
  { top: "88%", delay: "-3.8s", dur: "10s" },
];

export function Lanes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -inset-y-6 overflow-hidden">
      {LANES.map((l, i) => (
        <div key={i} className="absolute inset-x-0 h-px bg-rule" style={{ top: l.top }}>
          <span className="lane-pulse absolute top-1/2 h-0.5 w-40 -translate-y-1/2" style={{ animationDelay: l.delay, animationDuration: l.dur }} />
        </div>
      ))}
    </div>
  );
}
