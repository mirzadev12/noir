---
name: NOIR
description: A dark, precise routing console that sends each unknown wallet to the VASP it must be written to.
colors:
  paper: "#07080b"
  paper-2: "#0e1015"
  paper-3: "#151821"
  navy: "#0e1015"
  ink: "#f4f5f7"
  ink-soft: "#a1a8b3"
  ink-faint: "#7d8592"
  signal: "#3b82f6"
  signal-2: "#2563eb"
  signal-3: "#1e3a8a"
  route: "#60a5fa"
  rule: "#20242d"
  rule-strong: "#313745"
  ok: "#34d399"
  wait: "#fbbf24"
  prohibit: "#f87171"
  on-light: "#07080b"
  letter-paper: "#ffffff"
  letter-ink: "#0e1b2c"
  letter-ink-soft: "#44526a"
  letter-rule: "#d6dbe3"
  letter-route: "#1b5fd1"
typography:
  display:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "min(4.75rem, 8.6cqi)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.015em"
  sign:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "5.5rem"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  lede:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.4
  lead:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  small:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.08em"
  figure:
    fontFamily: "JetBrains Mono, ui-monospace, Consolas, monospace"
    fontSize: "2.25rem"
    lineHeight: 1.05
    fontFeature: "\"tnum\" 1, \"zero\" 1"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: "\"tnum\" 1, \"zero\" 1"
rounded:
  control: "0.75rem"
  stage: "1.75rem"
  pill: "9999px"
spacing:
  unit: "0.25rem"
  gutter-phone: "1rem"
  gutter: "2.5rem"
  control: "3rem"
  bar: "3.5rem"
  sidebar: "15rem"
  rail: "22rem"
  prose: "42rem"
  letter: "56rem"
  page: "76rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-light}"
    typography: "{typography.lead}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "{spacing.control}"
  button-primary-hover:
    backgroundColor: "{colors.route}"
    textColor: "{colors.on-light}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.lead}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
    height: "{spacing.control}"
  button-outline-hover:
    backgroundColor: "{colors.paper-3}"
  button-text:
    textColor: "{colors.route}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "{spacing.control}"
  tag-plain:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  tag-ok:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ok}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  tag-wait:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.wait}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  tag-prohibit:
    backgroundColor: "{colors.prohibit}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  destination-sign:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    typography: "{typography.sign}"
    rounded: "{rounded.control}"
    padding: "32px"
  sidebar:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.ink}"
    width: "{spacing.sidebar}"
  sidebar-item-current:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.lead}"
    padding: "16px 20px"
  chain-badge:
    backgroundColor: "{colors.paper-3}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    height: "24px"
    padding: "0 6px"
  letter-sheet:
    backgroundColor: "{colors.letter-paper}"
    textColor: "{colors.letter-ink}"
    width: "{spacing.letter}"
---

# Design System: NOIR

## Overview

**Creative North Star: "The Night Departures Hall"**

NOIR is a routing console seen at night: a near-black ground, panels one tonal step lighter, white type in a sober, institutional sans, and a single electric blue that marks where things are going. Its grammar comes from wayfinding: every wallet has a destination, the destination is named on one sign per screen, arrows and a drawn route line carry direction, and the desk reads as a departures board. It is a working tool for an investigator at a government desk, so density is measured, lines are hairlines, and rank is carried by type size rather than by colour or ornament.

The system is flat and quiet by default and spends its few effects in named places: a gradient on one line of the landing headline, a soft blue glow on the product board and the destination sign, and a small set of motions (split-flap names, a breathing status light, travelling lane pulses, a flowing route, a route line that draws once). All of it decorates content that is already there, and all of it stops for people who ask for less motion.

The one surface that is not dark is the request letter: a white paper sheet on screen and in print, because it leaves NOIR and goes into a file. Navigation sits in the sidebar; there is no top navigation bar, no gold and no serif display type.

**Key Characteristics:**
- Near-black ground, raised panels one step lighter; depth by tone, not shadow.
- One electric-blue accent for direction; light blue for links and actions.
- White primary buttons: the brightest block on any screen is the next action.
- IBM Plex Sans for every word, semibold for headings and bold for signs; JetBrains Mono for addresses, hashes and figures.
- Hairline rules, gently rounded controls, pill-shaped status tags.
- Sidebar navigation on every screen; a phone strip with a Menu button below md.
- Motion is decoration over visible content and goes to zero under reduced motion.

## Colors

A dark neutral ramp with one electric-blue accent, one link blue, and a status trio that only ever speaks for status.

### Primary
- **Electric Signal Blue** (signal): the accent. Arrows, the route line between stations, a route's terminus, the status pill dot, native checkboxes, the selection tint, the glow on the product board and destination sign, and the wordmark. Never body text.
- **Deep Signal Blue** (signal-2): the far end of the accent gradient; used only inside the headline gradient.

### Secondary
- **Link Blue** (route): links, text actions, the focus ring, the caret, and the hover fill of the primary button. Links and actions only.

### Tertiary (status)
- **Answered Green** (ok): answered, frozen, data received, channel found, and the breathing "Recorded" light.
- **Waiting Amber** (wait): sent and awaiting, no request yet, not found.
- **Refusal Red** (prohibit): OFAC sanctions, refusals and errors; the sanction sign and sanction notice are the only red fields.

### Neutral
- **Night Ground** (paper): the ground of every screen, and the fill of outlined controls and tags.
- **Raised Panel** (paper-2): the sidebar, the context bar's bands, table heads, the product board, the destination sign, error and stop boxes. `navy` currently carries the same value and names the same field role (sidebar, phone strip, selected filter, the route line's current-stop field).
- **Lifted Panel** (paper-3): hover and selected rows, the outline button's hover fill, traced chain badges.
- **Signal White** (ink): primary type, and the primary button's fill.
- **Fog Grey** (ink-soft): secondary type, hints, placeholders, disabled fills.
- **Dim Grey** (ink-faint): captions, meta, board column heads.
- **Hairline** (rule): table rows and dividers.
- **Strong Hairline** (rule-strong): boxed controls, table heads, section rules, the scrollbar thumb.
- **Night Type** (on-light): type on a white control.

### The Letter Palette
Scoped to the letter sheet: Letter White (letter-paper) ground, Letter Ink (letter-ink) type and strong rules, Letter Grey (letter-ink-soft) secondary type, Letter Rule (letter-rule) hairlines, Letter Blue (letter-route) for links and the sheet's accent. In print the whole page is forced to black on white.

### Named Rules
**The One Light Rule.** Electric blue marks direction: arrows, route lines and termini. The light itself has named places and no others: the landing's hall (the hero and the closing line stand in one), its two direction panels, the footer's horizon, the glow on the product board and the glow on the destination sign, which also stands in a quieter version of the hall's light. The gradient in type appears once, on the landing headline's second line. Nothing else is lit.

**The Status Speaks In Words Rule.** Green, amber and red are for request, channel and sanction status only, and every status also says its meaning in words; colour never carries it alone.

**The Paper Letter Rule.** The request letter is always a white sheet with its own light tokens, on screen and in print. No dark token reaches it.

## Typography

**Display Font:** IBM Plex Sans (with Segoe UI, system-ui)
**Body Font:** IBM Plex Sans (with Noto Sans Devanagari as a fallback for Hindi entries only)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, Consolas)

**Character:** A sober, institutional sans: bold for signs, semibold for headings, relaxed at 400 for reading; a monospace with tabular, slashed-zero figures for everything a machine produced.

### Hierarchy
- **Display** (700, fluid to its own column, 0.92): the landing headline only; the one fluid size.
- **Headline** (700, 2.125rem phone / 2.75rem md / 3.5rem lg, 1.0): a landing section's heading, and the names on its two direction panels. Landing only.
- **Sign** (700, 3rem phone / 4.5rem md / 5.5rem lg, 0.95, -0.015em): a VASP's name on its destination sign; the wordmark uses the same black cut at title size.
- **Title** (600, 1.5rem / 1.75rem / 2rem, 1.05, -0.015em): screen names, section titles, the current stop on a route.
- **Lead** (400 running, 600 in sign role; 1.25rem, 1.4): button labels, sidebar route names, notice titles, a working screen's lede.
- **Lede** (400, 1.125rem / 1.25rem / 1.375rem, 1.4): a landing section's opening sentence. Landing only.
- **Body** (400, 1rem, 1.55): running text; paragraphs held to 42rem.
- **Small** (400/500, 0.875rem, 1.5): hints, notes, breadcrumbs, route descriptions.
- **Label** (600, 0.8125rem, 0.08em, uppercase): field labels, table heads, tags, filters. The smallest size anything is set.
- **Figure / Mono** (JetBrains Mono, tabular, slashed zero): addresses, hashes, counts and amounts; figures step 1.5rem / 1.875rem / 2.25rem.

### Named Rules
**The Size Carries Rank Rule.** Working screens use fixed rem sizes that step at the md and lg breakpoints, never with the viewport; rank is carried by size, far apart, not by colour.

**The No Label Above A Heading Rule.** A heading stands alone: no small capitals line above a page head, section title or sign. Labels name form fields, table columns and facts, beside or above their value.

**The Mono For Machines Rule.** Anything a chain or a system produced (an address, a hash, a reference, a figure) is set in mono and never hyphenated.

## Layout

A fixed left sidebar (15rem) from md up; below md it folds into a 3.5rem sticky strip with the wordmark and a Menu button, and the route list slides over the page. The content column runs to 76rem with a side gutter of 1rem on a phone and 2.5rem from md; paragraphs stop at 42rem; the letter measures 56rem on screen and prints on A4 with a 16mm margin. The desk adds a 22rem intake rail from lg. Every gap is a multiple of a 0.25rem unit; sections open 48px apart (64px from md) under a rule with 12px above the title. The landing centres its headline over a full-width departures board with route lanes running behind it. The one table pattern is a real table from lg and stacks into labelled rows below it, so no screen scrolls sideways.

## Elevation & Depth

Flat. Depth is tonal: ground, raised panel, lifted panel, each one step lighter, separated by hairlines. The only shadow in the system is the accent glow.

### Shadow Vocabulary
- **Accent glow** (`box-shadow: 0 0 0 1px color-mix(in srgb, #3b82f6 35%, transparent), 0 40px 90px -40px color-mix(in srgb, #3b82f6 55%, transparent)`): the landing's departures board and the destination sign, nothing else.
- **Hall light** (`stage`, `lit-in`, `lit-out`, `horizon`, `sign-lit`: layered radial gradients of the accent and its deep ends over a raised panel): the landing's hall and closing line, its direction panels, its footer, and the destination sign. A background, never a shadow; it carries no offset and lights no text.

### Named Rules
**The Tonal Step Rule.** To raise a surface, step it one tone lighter and give it a hairline; do not add a shadow.

## Shapes

Gently rounded controls (0.75rem): buttons, fields, the destination sign, the product board, stop boxes and error lines share one radius set by one token. The landing's halls, direction panels, intake panel and diagram panel are rooms, not controls, and take the stage radius (1.75rem). Status tags and status dots are full pills. Rules are 1px: strong hairlines for boxes, table heads and section tops, faint hairlines for rows. The route line is a 4px bar in the accent. Icons are NOIR's own, drawn on a 24-unit grid with a 2px non-scaling stroke, square ends and mitred corners. The focus ring is a 3px link-blue outline offset 2px.

## Components

### Buttons
- **Shape:** gently rounded (0.75rem), at least 48px tall.
- **Primary:** a white block with night type in bold sign type at lead size (12px 20px); hover fills link blue. Disabled goes to fog grey.
- **Outline:** a strong-hairline box, transparent, white type; hover lifts to the lifted panel.
- **Text:** link-blue underlined words; the underline drops on hover.
- **Small:** 40px tall, body size, for tight rows.

### Chips (status tags and filters)
- **Tags:** uppercase label type in a pill, 2px 10px. Plain (strong hairline, white type), quiet (hairline, fog grey), ok and wait (a coloured outline and coloured words), prohibit (a red field). The words always name the state.
- **Filters:** label-type buttons with a mono count; selected is a raised-panel field with a strong hairline, unselected a hairline box in fog grey.

### Cards / Containers
- **Corner Style:** 0.75rem.
- **Background:** raised panel on the night ground.
- **Shadow Strategy:** none; only the product board and destination sign glow.
- **Border:** strong hairline, or hairline for secondary panels.
- **Internal Padding:** 20px, 28 to 32px from md.

### Inputs / Fields
- **Style:** a strong-hairline box on the night ground, 0.75rem corners, 48px tall (40px dense), 8px 12px padding; the label above in label type, the hint below in fog grey.
- **Focus:** the 3px link-blue ring.
- **Error:** a rounded red-outlined line on the raised panel, red words, announced as an alert.

### Navigation
- **Sidebar:** the raised-panel route list: the two-tone wordmark (NO in night type on an electric-blue tile, IR in electric blue), a "Wallet to VASP" line, then five routes, each a sign-type name over a small description with an arrow at the right, divided by hairlines. The current route drops to the night ground (a dark inset in the raised panel) with its description in fog grey; others lift on hover. Hidden in print.
- **Context bar:** a breadcrumb and recorded-mode line under a hairline above each screen.

### Destination Sign
The one per screen: a raised-panel field with the glow, an accent arrow before the VASP's name in sign type, sub-lines beneath at lead size, and the primary action to its right from lg. Names may flip in letter by letter. Quieter tones exist (a hairline panel; a red field for a sanctioned destination only).

### Route Line
Stations joined by a 4px accent bar, vertical on a phone and horizontal from md. The current stop is a raised-panel field with its name in the black sign cut. The line draws once from origin to terminus, each segment after the last, and the stops fade in as it arrives.

### Departures Board
The landing's product board: a glowing raised panel headed "Departures" with an accent arrow, a breathing green "Recorded" light and a UTC clock, over a table of destinations, chains, wallet counts, USDT and status; names flip in like a split-flap sign. It stands at the far end of the hall and steps out past the hall's lower edge.

### The Hall
The landing's hero and its closing line each stand in a hall: a stage-radius panel one tone above the ground, a hairline around it, the accent's light low on its far wall. The hero's hall holds the headline centred, the lede, two buttons and the board; route lanes run through its lower half, fading toward its walls, with travelling pulses of light. The closing hall holds one headline, the honest count of what is built, and two buttons.

### Counted Figures
Under the hero's hall: four figures in JetBrains Mono at count size (2.5rem / 3rem / 4rem), each over what it counts, separated by single hairlines at any width (two by two on a phone). Every figure is counted from `data/` when the site is built, and the line beneath names the files. Landing only; working screens state figures in sentences and tables.

### Direction Panels
Inbound on the left, outbound on the right, read as one route: an arrow runs into a mono pill on the seam ("the wallet") and an arrow runs out of it. Each is a stage-radius panel with its name in headline type at the foot and one sentence beneath; inbound is lit from the left in the deep accent, outbound from the right in the accent. Stacked on a phone, the pill is dropped and inbound's arrow points back.

### Request Letter
A white A4 sheet with its own light palette: facts as label-over-value pairs, a line to write on, a seal box. No statute is printed; the officer supplies the legal basis.

## Do's and Don'ts

### Do:
- **Do** read every value from the tokens; a page carries no hex, font name or pixel value of its own.
- **Do** keep one destination sign per screen, and give it the only glow besides the product board.
- **Do** make the primary action the white button; secondary actions are outlines, quiet ones are link-blue words.
- **Do** set addresses, hashes and figures in JetBrains Mono with tabular, slashed-zero figures.
- **Do** say every status in words; green, amber and red only confirm it.
- **Do** step working sizes at md and lg; only the landing headline is fluid.
- **Do** keep the request letter a white sheet, on screen and in print.
- **Do** tie every motion to the motion tokens so it goes to zero under reduced motion.

### Don't:
- **Don't** add shadows other than the accent glow, a gradient in type other than the landing headline's second line, or the hall's light anywhere the One Light Rule does not name.
- **Don't** use electric blue for body text, or link blue for anything but links and actions.
- **Don't** use red for anything but sanctions, refusals and errors.
- **Don't** set a small label above a heading.
- **Don't** set anything below 12px.
- **Don't** use a text character or emoji as an icon; draw it in the Icon set.
- **Don't** add a top navigation bar, brass or gold, or a serif display face: the navigation lives in the sidebar and the type is one sober sans.
