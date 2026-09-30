/**
 * ButtonLink — a destination drawn as a button: "Open the desk", "Draft one
 * request", "Request package (JSON)". Same block as <Button>; it is a link, so
 * it navigates (or downloads) instead of acting.
 *
 * Props
 *   href     where it goes. An address on NOIR uses Next's <Link>; `download`
 *            or `external` render a plain anchor
 *   variant  "solid" | "outline" | "text" — as <Button>
 *   size     "md" | "sm"
 *   icon     an <Icon> name drawn after the label
 */

import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./Button";
import { Icon, type IconName } from "./Icon";

export function ButtonLink({
  href,
  variant = "solid",
  size = "md",
  icon,
  external = false,
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  external?: boolean;
  children: React.ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children">) {
  const inner = (
    <>
      <span className={`min-w-0 ${size === "sm" ? "whitespace-nowrap" : "text-balance"}`}>{children}</span>
      {icon ? <Icon name={icon} /> : null}
    </>
  );
  const cls = buttonClass(variant, size, className);
  if (external || rest.download !== undefined) {
    return (
      <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {inner}
    </Link>
  );
}
