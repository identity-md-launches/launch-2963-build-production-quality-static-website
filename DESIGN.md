# PAY//AGENT design system

Extracted from the implemented source: `src/assets/site.css` (all tokens and components),
`src/assets/site.js` (interactive states) and the page markup in `src/*.html`. `dist/` is a copy.
No rendered-browser confirmation was possible during the original build or this revision (see
`artifacts/validation.md`), so everything below describes declared source values, not measured
renders. Revision interaction checks used the production script in a DOM harness and an HTTP fixture.

## Overview

Audience: developers and operators evaluating spending controls for AI agents that pay over x402.
Character: industrial, editorial, black and off-white with a single acid-green accent. Large, tight
sans headlines; monospace reserved for terminals, code, badges, navigation and data labels. Surfaces
are flat with 1px rules; texture is a faint film grain on the black canvas and a 48px grid behind the
home hero. Motion is limited to color transitions, a blinking cursor (disabled under reduced
motion) and opt-in step reveals in the terminal and playground.

System-wide rules: dark canvas by default, one paper-colored band (`.band--paper`) or acid band
(`.cta`) at most per page for rhythm, honesty labels (SIMULATED / EXAMPLE / PROPOSED) as `.badge`
inside the component they qualify, never above a heading. The home hero's two-column split is a
one-page arrangement, not a rule.

## Colors

Defined as custom properties on `:root` in `src/assets/site.css` (hex notation).

| Token | Value | Job |
| --- | --- | --- |
| `--ink` | `#0c0c0b` | Page canvas, input backgrounds, text on acid |
| `--ink-2` | `#151513` | Raised surfaces: cards, panels, status strip, table heads, callouts |
| `--ink-3` | `#1f1f1c` | Inline `code` background on dark |
| `--line` | `#3a3a34` | All 1px rules and borders on dark |
| `--text` | `#efede6` | Primary text on dark; secondary button border |
| `--text-dim` | `#b1afa5` | Secondary text on dark: ledes, card copy, hints, nav links |
| `--paper` | `#efede6` | Paper band background |
| `--paper-2` | `#e3e0d6` | Table heads, code and callouts inside paper bands |
| `--paper-text` | `#0c0c0b` | Primary text on paper; focus ring on paper |
| `--paper-dim` | `#45443e` | Secondary text on paper |
| `--paper-line` | `#b9b6aa` | Rules on paper |
| `--acid` | `#c8ff2e` | Accent: primary buttons, current nav item, badges, focus ring, list markers, CTA band |
| `--acid-ink` | `#0c0c0b` | Text and outlines on acid |
| `--ok` | `#c8ff2e` | Pass states (playground stages, verdicts, terminal) |
| `--warn` | `#ffbf47` | Held / escalated states, warning callouts, 402 lines |
| `--bad` | `#ff7a66` | Denied / blocked states |

Terminal background is a literal `#050505` in `.term`. Status is always paired with text
(`pass`, `denied`, `PASS`, `DENY`, `blocked`), never color alone. Contrast ratios were not measured.

## Typography

- Families: `--font-sans` = `"Helvetica Neue", Helvetica, Arial, "Nimbus Sans", "Liberation Sans", system-ui, sans-serif`;
  `--font-mono` = `ui-monospace, "SFMono-Regular", "JetBrains Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace`.
  No font files are shipped; the stacks are system fallbacks by design.
- Weights: `--w-regular` 400 (body), `--w-bold` 700 (headings, labels, buttons, table row heads).
- Scale (six sizes, no others):

| Token | Value | Role |
| --- | --- | --- |
| `--fs-1` | `0.875rem` | Code, terminals, badges, nav, labels, hints, footer, table heads |
| `--fs-2` | `1rem` | Body, inputs, mobile nav, small headings |
| `--fs-3` | `1.25rem` | `h3`, ledes, section intros, panel titles |
| `--fs-4` | `clamp(1.5rem, 1.2rem + 1.2vw, 2rem)` | Long-form `h2` inside `.prose` |
| `--fs-5` | `clamp(2rem, 1.4rem + 2.6vw, 3.25rem)` | Section `h2`, inner-page `h1` |
| `--fs-6` | `clamp(2.75rem, 1.6rem + 5.2vw, 6rem)` | Home `h1` only |

- Tracking: `h1` -0.045em, `h2` -0.035em, prose `h2` -0.02em, `h3` -0.01em; body 0. No positive
  tracking anywhere, no uppercase transforms.
- Line height: body 1.6, ledes 1.45, `h1` 0.95, `h2` 1.0, `h3` 1.25, terminals 1.7.
- Measure: `--measure` 68ch for prose; ledes 40rem; headings use `text-wrap: balance`,
  paragraphs `text-wrap: pretty`.

## Layout

- Spacing scale `--s-1`..`--s-9`: 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4.5, 6.5rem.
- Container `.wrap`: max `--max` 76rem, side padding `--gutter` = `clamp(1rem, 0.6rem + 2vw, 2.5rem)`.
- Sections `.section`: `--s-8` vertical padding, 1px top rule.
- Grids `.grid--2/3/4`: one column, two from 40rem, three/four from 64rem.
- Breakpoints: 40rem (grids, pipeline to 3 columns), 52rem (nav collapses below; footer to 3 columns
  above), 64rem (hero split, doc sidebar, playground two columns, wide lifecycle rows), 80rem
  (pipeline to 6 columns).
- `.doc`: single column; from 64rem a 15rem sticky table of contents plus content.
- `.pg`: single column; from 64rem a 24rem control panel plus results column.
- `.flow > li`: a 3rem counter column and a flexible text column. Direct paragraphs explicitly
  use column 2 below their headings. At 64rem, `.flow--wide > li` has counter, heading and
  description columns; direct paragraphs explicitly use column 3. This placement was verified
  in the final CSS, not by rendered pixel measurements.
- Overflow: tables scroll inside `.table-wrap` (min-width 34rem); terminals scroll horizontally
  inside `pre` (focusable with `tabindex="0"`); the playground log wraps (`.term-log`).

## Elevation & Depth

Flat system. No shadows anywhere. Depth comes from tonal steps (`--ink` canvas, `--ink-2`
surfaces, `#050505` terminals) and 1px borders. The grain layer (`body::before`) sits at
`z-index: -1` behind content. The header is `position: relative; z-index: 50`; nothing is fixed or
sticky over text except the desktop table of contents, which occupies its own column.

## Shapes

One radius, `--radius` 2px, on buttons, chips, inputs, cards, panels, terminals, badges and tables.
Callouts and the playground outcome use a 3px left rule instead of a box. Terminal window dots are
8px squares.

## Components

| Component | Source | Use and variants | States |
| --- | --- | --- | --- |
| Skip link | `.skip-link` | First focusable element on every page | Visible on focus |
| Status strip | `.status-strip` | Concept disclaimer above the header on every page | Static |
| Header and nav | `.site-header`, `.site-nav`, `.nav-toggle` | Brand plus six primary links; `aria-current="page"` marks the current page | Below 52rem with JS, collapses behind a Menu button (`aria-expanded`, Escape closes and returns focus); without JS the list shows |
| Button | `.btn`, `.btn--primary`, `.btn-row` | Primary (acid) for the one main action per area, default (outline) for the rest; adapts in `.band--paper` and `.cta` | Hover inverts; `:disabled` at 0.5 opacity and not-allowed cursor (also shared by chips, inputs and selects); 48px min height (44px in terminal footers) |
| Badge | `.badge` | SIMULATED / EXAMPLE / PROPOSED labels inside terminals, cards and fields | Static |
| Terminal | `.term`, `.term-bar`, `.term-foot`, `.t-dim/.t-ok/.t-warn/.t-bad` | Code samples, transcripts, logs | Home replay button reveals lines; instant under reduced motion |
| Card | `.card`, `.card-meta` | Peer items in a grid; never nested | Static |
| Lifecycle list | `.flow`, `.flow--wide` | Numbered stage rows (CSS counter) | Static |
| Table | `.table-wrap` + `table` | Comparisons, controls, errors; row headers use `th scope="row"` | Horizontal scroll on narrow screens |
| Callout | `.callout`, `.callout--warn` | Scope and risk notes | Static |
| Table of contents | `.toc` | Long documents | Sticky from 64rem |
| Form field | `.field`, `label`, `.hint`, `.check`, `fieldset/legend` | Playground controls; every input has a `label for` | Hover border, acid focus ring |
| Chip | `.chip` | Scenario presets (`aria-pressed`) | Pressed fills acid |
| Pipeline stage | `.stage[data-state]` | Six playground stages | `idle`, `active`, `pass`, `fail`, `skip`, each with a text label |
| Outcome | `.outcome[data-result]` | Playground result, `role="status"` with `aria-live="polite"` | `pass`, `fail`, `hold`, empty |
| Checks list | `.checks`, `.verdict.pass/.fail` | Per-rule results | Rendered after the policy stage |
| CTA band | `.cta` | One closing call to action per page | Inverted buttons and focus ring |

Playground runs retain one scenario snapshot alongside the evaluation for all six stages and final
accounting. During animated Run, every scenario/policy input, select and preset button is natively
disabled along with Run, Step and Reset; all restore on completion. Step mode remains editable,
and an input edit discards a partial run. The existing status region explains running and outcome states.

`src/404.html` uses the existing `.lost`, `.term` and button styles. Its inline resolver maps
`data-root-href` URLs to the IPFS/IPNS content root or domain root; it also supports direct `file:`
preview. Assets resolve in the head and recovery anchors resolve on DOMContentLoaded. The skip link
keeps its literal `#main`; there is no `<base>` element. No-JavaScript fallbacks retain relative
URLs and explain the nested-path limitation.

## Do's and Don'ts

- Start every page from the shared shell in any `src/*.html`: skip link, status strip, header, `main#main`, footer.
- Long text: `.page-hero` then `.doc` with a `.toc` and `.prose` article; short legal text: `.page-hero` then `.legal > .prose`.
- Use one `.btn--primary` per area; everything else is `.btn`.
- Use only the six `--fs-*` tokens and two weights. Do not add a seventh size or a third family.
- Put honesty labels in a `.badge` inside the thing they describe, never as a kicker above a heading.
- Do not add shadows, gradients on text, or cards inside cards.
- Do not add `transition: all`; list the properties. Any looping animation goes inside `@media (prefers-reduced-motion: no-preference)`.
- Do not use em dashes in copy.
- Keep all URLs relative (`./page.html`), never root-absolute.

Recipe for a new page: copy `src/about.html`, change `<title>`, description, canonical, `og:*`
values and `aria-current`, replace the `.prose` sections, add the page to both nav lists if it is
primary and to `sitemap.xml`, then run `npm run build`.
