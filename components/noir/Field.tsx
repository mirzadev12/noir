/**
 * Field — a labelled control, and the controls themselves.
 *
 *   <Field label hint error htmlFor>   a label above, an optional hint and error beneath
 *   <TextInput> <TextArea> <Select>    the controls: 2px black box, square corners (`dense` for a tight column)
 *   <Check label hint>                 a checkbox with its words
 *
 * A `type="date"` input draws its picker in the dark scheme and prints the chosen
 * day beside it the way NOIR writes days ("29 Sep 2026, UTC"), or that format as an
 * example while it is empty, because the browser's own display follows the locale.
 *
 * Every control takes `tone="ink"` for use on the black sidebar. Field height,
 * rule weight and corner radius are tokens in app/globals.css.
 *
 * An error is drawn as a black block with white words, not a red one: the sign
 * system spends colour in one place, and a stop sign is black.
 */

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { utcDay } from "@/lib/noir-format";

type Tone = "paper" | "ink";

const CONTROL: Record<Tone, string> = {
  paper: "rule-box bg-paper text-ink placeholder:text-ink-soft",
  ink: "rule-box-on-ink bg-transparent text-on-ink placeholder:text-on-ink-soft focus:border-on-ink",
};
const CONTROL_BASE = "block w-full min-w-0 rounded-control px-3 py-2 text-body";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  tone = "paper",
  children,
  className = "",
}: {
  label: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className={`type-label mb-2 block ${tone === "ink" ? "text-on-ink-soft" : ""}`}>
        {label}
      </label>
      {children}
      {hint ? <p className={`mt-2 text-small ${tone === "ink" ? "text-on-ink-soft" : "text-ink-soft"}`}>{hint}</p> : null}
      {error ? (
        <p role="alert" className="mt-2 rounded-control border border-prohibit bg-paper-2 px-3 py-2 text-small font-medium text-prohibit">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  tone = "paper",
  dense = false,
  className = "",
  ...rest
}: { tone?: Tone; dense?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const input = (
    <input
      className={`${CONTROL_BASE} ${dense ? "min-h-10 py-1.5" : "min-h-control"} ${CONTROL[tone]} ${rest.type === "date" ? "scheme-dark" : ""} ${className}`}
      {...rest}
    />
  );
  if (rest.type !== "date") return input;
  const day = typeof rest.value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rest.value) ? `${utcDay(`${rest.value}T00:00:00Z`)}, UTC` : null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <div className="min-w-0 flex-1 basis-40">{input}</div>
      <span className="shrink-0 text-small text-ink-soft" aria-live="polite">
        {day ?? "e.g. 29 Sep 2026, UTC"}
      </span>
    </div>
  );
}

export function TextArea({ tone = "paper", mono = false, className = "", ...rest }: { tone?: Tone; mono?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${CONTROL_BASE} min-h-32 resize-y ${mono ? "type-mono text-small" : ""} ${CONTROL[tone]} ${className}`} {...rest} />;
}

export function Select({ tone = "paper", className = "", children, ...rest }: { tone?: Tone } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${CONTROL_BASE} min-h-control ${CONTROL[tone]} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Check({
  label,
  hint,
  className = "",
  ...rest
}: { label: React.ReactNode; hint?: React.ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <label className={`flex min-w-0 items-start gap-3 py-2 ${rest.disabled ? "text-ink-soft" : "cursor-pointer"} ${className}`}>
      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-ink" {...rest} />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint ? <span className="block text-small text-ink-soft">{hint}</span> : null}
      </span>
    </label>
  );
}
