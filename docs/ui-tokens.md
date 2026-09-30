# Restyling NOIR: tokens first

Every visual value in NOIR — colour, type, space, rule weight, icon stroke,
corner radius, motion, sidebar width — is set in **one file: `app/globals.css`**.
Pages and components contain no hex codes, font names or pixel values. They are
built only from the primitives in `components/noir/`, and the primitives read the
tokens through Tailwind 4 (`@theme`).

So to apply a reference image: **edit the tokens, look, then touch a primitive
only if the structure differs.** No page needs to change to change the look.

```
app/globals.css        every value                    ← start here
app/layout.tsx         which font faces load          (names only; roles are in the CSS)
components/noir/*      the primitives                 ← only when the structure differs
app/icon.svg           the favicon; it carries palette values as an asset
```

## What each token controls

### Colour (`@theme`, section 1)

The palette is a professional navy set: navy fields, navy-black ink, one amber
marker, and a disciplined status set. Contrast is measured on white unless noted.

| Token | Value now | Controls |
| --- | --- | --- |
| `--color-paper` | `#ffffff` | The ground: page background, the letter, the fill of outlined controls |
| `--color-paper-2` | `#f6f7f9` | Quiet bands: the closing band, table header fill, the officer panel |
| `--color-ink` | `#0e1b2c` | Navy-black: all type, 2px rules, small solid marks (17.3:1) |
| `--color-ink-soft` | `#44526a` | Secondary type: hints, notes, hashes beside addresses (7.9:1) |
| `--color-ink-faint` | `#5e6b80` | Captions and meta, breadcrumb separators (5.4:1) |
| `--color-navy` | `#0b2545` | Fields: the sidebar, the landing band and footer, **the destination sign (one per screen)**, primary buttons |
| `--color-signal` | `#e0a100` | Amber **marker only**: the sign's arrow, a route terminus, the wordmark underline. 6.8:1 on navy, 2.3:1 on white, so never text on white |
| `--color-route` | `#1b5fd1` | Links, secondary actions, the focus ring, the caret (5.8:1) |
| `--color-rule` | `#d6dbe3` | Hairlines: table rows, dividers, quiet tag outlines |
| `--color-ok` | `#1e6b43` | Answered, frozen, data received, channel found (6.5:1) |
| `--color-wait` | `#8a5a00` | Sent and awaiting, no request yet, not found (5.9:1) |
| `--color-prohibit` | `#b42318` | Sanctions, refusals, errors (6.6:1) |
| `--color-on-ink` | `#ffffff` | Type on navy or on the red (15.4:1 on navy) |
| `--color-on-ink-soft` | `#b8c4d6` | Secondary type and outlines on navy (8.7:1) |

Tailwind's own palette is switched off (`--color-*: initial`), so a class such as
`bg-blue-500` does not exist. Only the names above do: `bg-navy`, `text-ink-soft`,
`text-ok`, `border-rule`, and so on. Print stays black on white.

Browser surfaces are themed from the same tokens (section 2, `@layer base`):
`::selection` is amber at 35% over white, the focus ring is route blue (amber on
navy), the caret is route blue (amber on navy), scrollbars and native checkboxes
use ink and paper, and `color-scheme: light` keeps form controls light.

### Type

| Token | Controls |
| --- | --- |
| `--font-sans`, `--font-mono` | The two stacks. The faces themselves (IBM Plex Sans, JetBrains Mono, and Noto Sans Devanagari as a fallback) load in `app/layout.tsx` and arrive as `--font-plex`, `--font-jetbrains`, `--font-devanagari` |
| `--font-weight-normal / -medium / -bold / -black` | 400 body, 500 emphasis, 800 signs and buttons, 900 the wordmark and destination sign |
| `--text-micro … --text-lead` | Fixed sizes: `micro` (12px, the smallest anything is set), `small`, `body`, `lead` |
| `--size-title`, `--size-sign`, `--size-figure` | The three large working-screen sizes. They are fixed `rem` values that **step at the md and lg breakpoints** (declared in `:root`), never with the viewport. `--text-title`, `--text-sign`, `--text-figure` read them |
| `--size-display` | The one fluid size (`clamp`): the landing page's headline, and nothing else |
| `--stretch-sign` | Archivo's width axis for signs (78% = condensed). Set to `100%` for a normal-width grotesque |
| `--tracking-sign`, `--tracking-label` | Letter-spacing of signs and of small capitals |

Roles bundle these and are what primitives apply: `type-sign`, `type-sign-black`,
`type-label`, `type-mono`. To change how *all* signs look, change a role, not a page.

### Space and shape

| Token | Controls |
| --- | --- |
| `--spacing` | The unit (0.25rem). Every gap, padding and margin is a multiple of it, so one number tightens or loosens the whole interface |
| `--gutter` | Page side padding (16px on a phone, 40px from `md` up) |
| `--spacing-sidebar`, `--spacing-bar` | Width of the navy route list; height of the strip that replaces it on a phone |
| `--spacing-rail` | Width of the intake rail beside the desk |
| `--spacing-control` | Height of buttons and fields |
| `--container-page`, `--container-prose`, `--container-letter` | Widest a screen, a paragraph, and the request letter run |
| `--radius-control` | Corner radius of every control and tag. `0` is the square-cornered sign system; one number rounds everything |
| `--rule-heavy`, `--rule-hair`, `--rule-focus` | 2px black rules, 1px grey rules, the focus ring |
| `--icon-stroke` | The one line weight of every icon, at every size (icons use a non-scaling stroke) |
| `--route-weight` | Thickness of the route line between stations |
| `--facts-label` | Width of the name column in a Facts list |

### Motion

`--motion-fast` (150ms) and `--motion-base` (250ms) are the state-change
durations; `--motion-draw` and `--motion-stagger` drive the one animation NOIR
has: the route line drawing from its origin to its terminus, once. Under
`prefers-reduced-motion: reduce` every one of them becomes `0ms`, so nothing
animates for anyone who asks for less.

### Print (the request letter)

`--print-margin` (A4 margin) and `--print-size` (body size on paper). Printing
hides the sidebar and forces black on white (`@media print`, section 7).

## The primitives (`components/noir/`)

Import them from `@/components/noir`. Each file starts with a comment saying what
it is for and what its props do.

| Primitive | What it is |
| --- | --- |
| `Shell`, `Frame`, `Page` | The frame: navy sidebar, context bar, page (the landing draws its own band and footer) and a screen's content column |
| `ContextBar`, `SearchBox`, `CopyButton`, `SectionNav` | The breadcrumb and recorded-mode line; go-anywhere search; copy beside an address; in-page tabs |
| `Sidebar` | The route list and the phone strip with a Menu button |
| `Sign` | The destination sign: the one navy field with an amber arrow. No label above its title |
| `RouteLine` | Stops on a line: a wallet's route to a VASP, and a request's status history. Draws once |
| `PageHead` | A screen's name (its `<h1>`) and one line saying what it is for |
| `Section` | A titled band: heavy rule, title, optional count |
| `Mono` | Addresses, hashes, references: monospaced, wraps anywhere |
| `ChainBadge` | The chain as a small square sign (TRX, ETH, POL); outlined when not traced |
| `Tag` | A short fact: a status, a tier, "Recorded"; a red tone for OFAC only |
| `Button`, `ButtonLink`, `RouteLink` | An action; a destination drawn as a button; an inline link |
| `Facts` | A definition list of named facts |
| `Table` | One table pattern; stacks into labelled rows on a phone |
| `Empty`, `Notice` | An empty list; a sentence set apart (note, caution, stop, sanction) |
| `Field`, `TextInput`, `TextArea`, `Select`, `Check` | Labelled controls |
| `Figure`, `Heading`, `Label`, `Text`, `Rule`, `Blank` | A number with its name; type roles; a divider; a line to write on |
| `Icon` | The authored icon set (below) |

### Icons

`Icon` draws NOIR's own icons on one 24-unit grid with square ends and mitred
corners at one stroke weight (`--icon-stroke`). NOIR uses no emoji and no text
character (an arrow glyph, a cross, a tick) as an icon. To add one, draw it in
`components/noir/Icon.tsx`.

## Recipe: applying a reference image

1. **Palette.** Sample the reference and set the colour tokens. Keep the roles:
   one loud colour for the destination field, one for links, one ink, one alarm.
2. **Type.** If the reference uses other faces, swap the two `next/font/google`
   imports in `app/layout.tsx` (keep the `variable` names) and adjust the
   weights, `--stretch-sign` and tracking. Sizes are the `--text-*` and `--size-*` scale.
3. **Shape.** Set `--radius-control`, the rule weights and `--icon-stroke`. A
   softer reference means a radius and thinner rules; a harder one, heavier rules.
4. **Density.** Change `--spacing` (whole-interface density), `--gutter`,
   `--spacing-sidebar`.
5. **Structure.** Only if the reference arranges things differently (a sign with
   the action beneath rather than beside, a table with a different head), edit
   the primitive.
6. **Look.** `DEMO_MODE=true npm run dev`, file the recorded wallets, and check
   every screen at 1440, 768 and 375 wide, and the letter in print preview.

## What must survive any restyle

These are product rules, not taste:

- Light ground, navy-black ink. No dark theme, no brass or gold, no serif display type,
  no top navigation bar (the sidebar is the navigation; on a phone it folds into a
  strip with a Menu button).
- The navy destination sign is one per screen; amber is a marker, never text on
  white. The link colour is for links and actions only. The red is for
  sanctions, refusals and errors only; ok green and wait amber-brown are for
  request and channel status only.
- No small label above a heading.
- Status tags say their meaning in words; colour never carries it alone.
- Nothing set below 12px.
- Nothing prints a percentage of "accuracy", the word "empty" for a wallet that
  could not be read, a statute on a request, a rupee figure, or a claim that
  SAHYOG is connected (`README.md` lists the truth rules).
