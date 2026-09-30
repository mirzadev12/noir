/**
 * Sign — the destination sign: a solid block that names where something goes.
 * A VASP's page opens with one, a navy field with an amber arrow, and it is the only one on
 * that screen.
 *
 * Props
 *   title    the destination, large and heavy (a VASP's name)
 *   level    HTML heading rank for the title, default 2 (a screen with no PageHead passes 1)
 *   size     how loud the title is: "sign" (default, 48px on a phone to 92px on a
 *            desk) | "title" | "lead"
 *   tone     "signal" (navy field, white type, amber arrow; the default: at most once per screen) | "ink" (black,
 *            white type) | "paper" (white with a 2px black outline: a quieter sign) |
 *            "prohibit" (red, white type: a sanctioned destination, and only that)
 *   pointer  an arrow before the title: the sign points the way to it
 *   action   the primary action, set to the right of the sign (a black <Button>)
 *   children sub-lines beneath the title: counts, USDT, evidence, the FIU-IND line
 *
 * A sign has no small label above its title. The block's colours, padding and
 * the title's face are tokens in app/globals.css; a Sign carries none of its own.
 */

import { Icon } from "./Icon";
import { Heading } from "./Type";

const TONE = {
  signal: "on-ink rounded-control bg-paper-2 text-on-ink glow",
  ink: "on-ink rounded-control hair-box bg-paper-2 text-on-ink",
  paper: "rule-box bg-paper text-ink",
  prohibit: "on-ink bg-prohibit text-on-ink",
} as const;

export function Sign({
  title,
  level = 2,
  size = "sign",
  tone = "signal",
  pointer = false,
  flap = false,
  action,
  children,
  className = "",
}: {
  title: React.ReactNode;
  level?: 1 | 2 | 3;
  size?: "sign" | "title" | "lead";
  tone?: keyof typeof TONE;
  pointer?: boolean;
  /** Flip a plain-text title in letter by letter, like a split-flap departures sign (still under reduced motion). */
  flap?: boolean;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex min-w-0 flex-col gap-6 p-5 md:p-8 lg:flex-row lg:items-end lg:justify-between ${TONE[tone]} ${className}`}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {pointer ? <Icon name="arrow-right" size="lg" className="mt-2 hidden text-signal md:inline-block" /> : null}
        <div className="min-w-0 flex-1">
          <Heading level={level} size={size === "sign" ? "sign" : size === "title" ? "title" : "lead"}>
            {flap && typeof title === "string" ? (
              <span aria-label={title}>
                {[...title].map((ch, i) => (
                  <span key={i} aria-hidden="true" className="flap-in" style={{ ["--flap" as string]: i }}>
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </span>
            ) : (
              title
            )}
          </Heading>
          {children ? <div className="mt-4 flex flex-col gap-1 text-lead font-medium">{children}</div> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
