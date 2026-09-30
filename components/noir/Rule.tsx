/**
 * Rule — a horizontal line, the sign system's only divider.
 *
 * Props
 *   weight  "heavy" (2px black, between sections) | "hair" (1px grey, between rows)
 *   on      "paper" | "ink"   the ground it sits on; a rule on the black sidebar is light
 *
 * Weights and colours are `--rule-heavy`, `--rule-hair` and the palette in
 * app/globals.css.
 */

export function Rule({ weight = "heavy", on = "paper", className = "" }: { weight?: "heavy" | "hair"; on?: "paper" | "ink"; className?: string }) {
  const line = on === "ink" ? "rule-on-ink-t" : weight === "heavy" ? "rule-t" : "hair-t";
  return <hr className={`m-0 h-0 w-full border-0 ${line} ${className}`} />;
}
