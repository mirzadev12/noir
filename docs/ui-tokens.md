# Restyling NOIR

Every visual value lives in `app/globals.css`; every screen is built from the primitives in
`components/noir/`. To restyle NOIR from a reference image, change the tokens first, then the
primitives, and pages follow. `DESIGN.md` records the system as built, with its rules.

## Colour (`@theme` in `app/globals.css`)

| Token | Value | Controls |
| --- | --- | --- |
| `--color-paper` | `#07080b` | The ground of every screen |
| `--color-paper-2` | `#0e1015` | Raised panels: sidebar, bands, table heads, the departures board, signs |
| `--color-paper-3` | `#151821` | Hover and selected rows, inputs, the board's top row |
| `--color-ink` | `#f4f5f7` | Primary type; also the fill of primary buttons |
| `--color-ink-soft` | `#a1a8b3` | Secondary type (8.4:1) |
| `--color-ink-faint` | `#7d8592` | Captions and meta (5.4:1) |
| `--color-on-light` | `#07080b` | Type on a white primary button |
| `--color-signal` | `#3b82f6` | The accent: arrows, route lines and termini, the pill dot, glows |
| `--color-signal-2` | `#2563eb` | The deep end of the headline gradient, and of the hall's light |
| `--color-signal-3` | `#1e3a8a` | Night blue: the far wall of a lit hall (the landing's stages, the footer's horizon) |
| `--color-route` | `#60a5fa` | Links and secondary actions, the focus ring |
| `--color-rule` / `--color-rule-strong` | `#20242d` / `#313745` | Hairlines / section rules, table heads, boxed controls |
| `--color-ok` / `--color-wait` / `--color-prohibit` | `#34d399` / `#fbbf24` / `#f87171` | Answered or frozen / sent or no request yet / sanctions, refusals, errors |

The request letter is a white paper sheet: `.letter-sheet` redefines the colour tokens to a light set,
and `@media print` does the same for the whole page.

## Type

IBM Plex Sans (loaded in `app/layout.tsx`; semibold for headings, 700 for the wordmark and signs) for words, JetBrains Mono for addresses, hashes and figures.
Sizes are `--text-*` tokens; the working screens use fixed rem steps (`--size-title`, `--size-sign`,
`--size-figure`) that change at the md and lg breakpoints. Only the landing headline is fluid:
`--size-display` is `min(4.75rem, 8.6cqi)`, sized to its own `@container` column so each line fits whole.
The landing has three sizes of its own, each stepping at md and lg: `--size-headline` (a section's heading, `text-headline`),
`--size-lede` (a section's opening sentence, `text-lede`) and `--size-count` (the counted figures, `text-count`).
Roles are utilities: `type-sign`, `type-sign-black`, `type-label`, `type-mono`.

## Shape, rules and motion

`--radius-control` (0.75rem) rounds every control, panel and sign; tags and filter chips are full pills.
`--radius-stage` (1.75rem) rounds the landing's rooms: its halls, direction panels, intake panel and diagram panel.
The light is five utilities, each a layered radial gradient of the accent over a raised panel: `stage` (the hall),
`lit-in` and `lit-out` (the direction panels), `horizon` (the footer) and `sign-lit` (the destination sign, quieter).
`lane-fade` masks the hall's lanes so they fade toward its walls. To change the light's colour, change `--color-signal`,
`--color-signal-2` and `--color-signal-3`; to switch it off, make each utility a flat `background: var(--color-paper-2)`.
`--rule-heavy` and `--rule-hair` are both 1px; the difference is colour. Motion durations are
`--motion-fast` / `--motion-base` / `--motion-draw` / `--motion-stagger` with one `--ease`, and all
become 0ms under `prefers-reduced-motion`, where the animated utilities are switched off entirely.
Animated utilities: `flap-in` (split-flap names), `breathe` (status lights), `flow` (dashed routes),
`rise` (landing entrance), `lane-pulse` (the lanes behind the board), `route-draw-x/y` and
`route-arrive` (route lines). `text-gradient` is used on the landing headline's second line only;
`glow` on the product board and the destination sign only.

## Primitives

`Sign` (the destination sign; `flap` flips a plain-text name in), `Button` / `ButtonLink`, `Tag`
(tones `plain`, `solid`, `quiet`, `ok`, `wait`, `prohibit`), `Table` (scrolls inside its own frame;
stacks under 40rem), `Section`, `PageHead`, `Mono` (even address breaks, optional copy), `ChainBadge`,
`RouteLine`, `Sidebar`, `ContextBar`, `Field` family, `Notice`, `Icon` (drawn, one stroke weight).
