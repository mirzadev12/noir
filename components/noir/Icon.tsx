/**
 * Icon — NOIR's authored SVG icons. There is one set, drawn on one 24-unit
 * grid with square ends and mitred corners, at one stroke weight
 * (`--icon-stroke` in app/globals.css). The stroke does not scale with the icon:
 * an icon at any size is drawn with the same 2px line as a rule.
 *
 * NOIR uses no emoji and no text glyph (an arrow character, a cross, a tick)
 * as an icon. If an icon is needed and is not here, draw it here.
 *
 * Props
 *   name   which icon (see NAMES)
 *   size   "sm" (1em, inline with small type) | "md" (1.25em, default) | "lg" (2em)
 *   title  when the icon carries meaning on its own; otherwise it is hidden from
 *          screen readers, because the words beside it say the same thing
 *
 * Icons inherit colour from the text they sit in (currentColor).
 */

const PATHS = {
  "arrow-right": "M3 12h17M13 5l7 7-7 7",
  "arrow-left": "M21 12H4M11 5l-7 7 7 7",
  "arrow-down": "M12 3v17M5 13l7 7 7-7",
  "arrow-up": "M12 21V4M5 11l7-7 7 7",
  external: "M10 4H4v16h16v-6M14 4h6v6M20 4l-9 9",
  print: "M7 9V3h10v6M7 17H3V9h18v8h-4M7 14h10v7H7z",
  download: "M12 3v13M6 10l6 6 6-6M4 21h16",
  refresh: "M20 12a8 8 0 1 1-2.4-5.7M20 3v5h-5",
  close: "M5 5l14 14M19 5L5 19",
  menu: "M3 6h18M3 12h18M3 18h18",
  check: "M4 12l5 5L20 6",
  plus: "M12 4v16M4 12h16",
  prohibit: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8",
  warning: "M12 3L2 21h20L12 3zM12 10v5M12 18v1",
  file: "M6 3h8l5 5v13H6V3zM14 3v5h5M9 13h7M9 17h7",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 3",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6",
  "chevron-down": "M5 9l7 7 7-7",
  route: "M4 20V9h16V4M4 20h4M16 4h4",
  copy: "M9 9h11v11H9zM5 15V4h11",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l5 5",
} as const;

export type IconName = keyof typeof PATHS;

const SIZE = { sm: "1em", md: "1.25em", lg: "2em" } as const;

export function Icon({ name, size = "md", title, className = "" }: { name: IconName; size?: keyof typeof SIZE; title?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={SIZE[size]}
      height={SIZE[size]}
      fill="none"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={`inline-block shrink-0 align-[-0.2em] ${className}`}
      style={{ strokeWidth: "var(--icon-stroke)" }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path d={PATHS[name]} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
