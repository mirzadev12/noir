/**
 * Notice — a sentence the officer must not miss, set apart from the page.
 *
 * Props
 *   tone   "note" (default: a heavy rule at the left; information) |
 *          "caution" (a 2px box with a warning icon; something to check) |
 *          "stop" (a black block, white words: something failed or was refused) |
 *          "sanction" (a red block, white words: an OFAC listing, and only that)
 *   title  a short heading in sign type, optional
 *
 * Failure is a black block, not a red one: the sign system spends its one alarm
 * colour on sanctions. `stop` and `sanction` are announced to screen readers as
 * alerts; the others as plain notes.
 */

import { Icon, type IconName } from "./Icon";

const TONE: Record<"note" | "caution" | "stop" | "sanction", { box: string; icon: IconName | null; role: "note" | "alert" }> = {
  note: { box: "rule-l pl-4 py-1", icon: null, role: "note" },
  caution: { box: "rule-box p-4", icon: "warning", role: "note" },
  stop: { box: "rounded-control border border-prohibit bg-paper-2 p-4 text-ink", icon: "warning", role: "alert" },
  sanction: { box: "on-ink bg-prohibit p-4 text-on-ink", icon: "prohibit", role: "alert" },
};

export function Notice({
  tone = "note",
  title,
  children,
  className = "",
}: {
  tone?: keyof typeof TONE;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <div role={t.role} className={`flex min-w-0 gap-3 ${t.box} ${className}`}>
      {t.icon ? <Icon name={t.icon} className="mt-0.5" /> : null}
      <div className="min-w-0">
        {title ? <p className="type-sign text-lead leading-tight">{title}</p> : null}
        {children ? <div className={title ? "mt-1" : ""}>{children}</div> : null}
      </div>
    </div>
  );
}
