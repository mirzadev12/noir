/**
 * Tag — a short fact printed like a label on a sign: a status, an evidence tier,
 * a registry listing, "Recorded".
 *
 * Props
 *   tone  "plain" (default: 2px black outline) | "solid" (black block: the
 *         strongest state) | "quiet" (hairline outline, secondary ink: a fact
 *         that is true but not urgent) | "prohibit" (red: an OFAC listing or a
 *         refusal) | "ok" (green outline: answered, frozen, data received) |
 *         "wait" (amber-brown outline: sent and awaiting, no request yet)
 *   icon  an <Icon> name drawn before the words
 *
 * Small capitals, square corners. Colour is never used to carry meaning here
 * except the red of a sanction: the words do.
 */

import { Icon, type IconName } from "./Icon";

const TONE = {
  plain: "rule-box bg-paper text-ink",
  solid: "border border-ink bg-ink text-on-light",
  quiet: "hair-box bg-paper text-ink-soft",
  prohibit: "rule-box-prohibit bg-prohibit text-on-ink",
  ok: "border border-ok bg-transparent text-ok",
  wait: "border border-wait bg-transparent text-wait",
} as const;

export function Tag({
  tone = "plain",
  icon,
  children,
  title,
  className = "",
}: {
  tone?: keyof typeof TONE;
  icon?: IconName;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span title={title} className={`type-label inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 leading-tight ${TONE[tone]} ${className}`}>
      {icon ? <Icon name={icon} size="sm" /> : null}
      <span className="min-w-0">{children}</span>
    </span>
  );
}
