/**
 * Button — an action: something that changes the desk, opens a form or starts a
 * print. (A destination that only navigates is a <ButtonLink> or a <RouteLink>.)
 *
 * Props
 *   variant  "solid" (default: black block that turns route blue on hover — the
 *            primary action) | "outline" (2px black box — a secondary action) |
 *            "text" (route-blue underlined words — a quiet action)
 *   size     "md" (default, a 48px-class target) | "sm"
 *   icon     an <Icon> name drawn after the label
 *   busy     the action is running: the button is disabled and says so to screen readers
 *
 * `buttonClass` is exported so <ButtonLink> draws exactly the same block.
 * Colours, weights, rule thickness and corner radius are tokens in
 * app/globals.css; a button never carries its own.
 */

import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "solid" | "outline" | "text";
export type ButtonSize = "md" | "sm";

const BASE = "inline-flex max-w-full items-center justify-center gap-3 rounded-control type-sign leading-none no-underline select-none transition-colors";
const VARIANT: Record<ButtonVariant, string> = {
  solid:
    "border border-ink bg-ink text-on-light hover:bg-route hover:border-route hover:no-underline disabled:cursor-not-allowed disabled:border-ink-soft disabled:bg-ink-soft aria-disabled:border-ink-soft aria-disabled:bg-ink-soft cursor-pointer",
  outline: "rule-box bg-transparent text-ink hover:bg-paper-3 hover:text-ink hover:no-underline disabled:cursor-not-allowed disabled:text-ink-soft cursor-pointer",
  text: "text-route underline hover:no-underline disabled:cursor-not-allowed disabled:text-ink-soft cursor-pointer",
};
const SIZE: Record<ButtonSize, string> = {
  md: "min-h-control px-5 py-3 text-lead",
  sm: "min-h-10 px-3 py-2 text-body",
};

export function buttonClass(variant: ButtonVariant = "solid", size: ButtonSize = "md", extra = ""): string {
  return `${BASE} ${VARIANT[variant]} ${variant === "text" ? "" : SIZE[size]} ${extra}`;
}

export function Button({
  variant = "solid",
  size = "md",
  icon,
  busy = false,
  type = "button",
  disabled,
  className = "",
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  busy?: boolean;
  children: React.ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      <span className={`min-w-0 ${size === "sm" ? "whitespace-nowrap" : "text-balance"}`}>{children}</span>
      {icon ? <Icon name={icon} /> : null}
    </button>
  );
}
