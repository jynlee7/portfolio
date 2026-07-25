# Design

<!-- impeccable:design-schema 1 -->

## Direction contract

**THESIS.** A hiring manager's 60 seconds, staged as a stack of physical
cards laid on a table — each card holds exactly one piece of evidence and
nothing else. It refuses the category default: the dark-mode terminal
portfolio with a monospace font, a green accent, and a grid of identical
project tiles.

**OWN-WORLD.** Cool off-white ground (`#f4f4f8`). Pure-white slabs with
40–64px radii floating on it under four-stop shadow ramps with negative
spread. One saturated indigo (`#4338f5`) that owns whole regions rather than
tinting accents — the closing card is drenched in it. Cabinet Grotesk set
enormous, tracked to −0.035em, leading below 1.0. Switzer for body at a
relaxed 1.45. No borders anywhere; separation is carried by shadow and the
gap between slabs.

**STORY.** The visitor learns who this is and what they build before
scrolling. They scroll through three pieces of hard evidence, each with a
live link. They leave with the resume PDF or the email address.

**FIRST VIEWPORT.** One white slab, near-full-height, radius 64px. The name
set at display scale flush left across two lines, tracked tight. Beneath it,
one sentence of what they build. Beneath that, two controls side by side:
a filled indigo resume button and a quiet email link. Lower right of the same
slab, an indigo radial field bleeds off the corner — the only color in the
first screen.

**FORM.** Pinned by the user's brief (lovi.care), not rolled. Slab-stack
staging, committed at the saturated end of that world's range rather than its
softest white-on-white rendition.

## Type

| Role | Face | Size | Leading | Tracking |
|---|---|---|---|---|
| Display | Cabinet Grotesk 800 | `clamp(2.75rem, 1.2rem + 6.2vw, 5.5rem)` | 0.88 | −0.035em |
| H2 | Cabinet Grotesk 800 | `clamp(1.875rem, 1.3rem + 2.6vw, 2.75rem)` | 0.95 | −0.028em |
| H3 | Cabinet Grotesk 500 | 1.375rem | 1.15 | −0.02em |
| Body | Switzer 400 | 1.0625rem | 1.45 | −0.011em |
| Meta | Switzer 500 | 0.8125rem | 1.3 | 0 |

Display never exceeds 6rem. Body measure caps at 68ch. Neither face appears
on the saturated-default list; both are Fontshare, free for commercial use.

## Color

Strategy: **Committed** — indigo carries whole regions, not accents.

Ratios below are measured, not estimated. Every value that carries text
clears WCAG AA (4.5:1).

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--ink` | `#1c1b22` | Body and display text | 15.6:1 on `--bg` |
| `--ink-muted` | `#5c5a68` | Secondary text | 6.1:1 on `--bg` |
| `--ink-faint` | `#6c6a78` | Dates, footer, meta | 4.8:1 on `--bg` |
| `--bg` | `#f4f4f8` | Page ground | — |
| `--surface` | `#ffffff` | Slabs | — |
| `--accent` | `#4338f5` | Primary action, drenched close card | 6.7:1 vs white |
| `--accent-soft` | `#ecebfe` | Artifact wells inside white slabs | — |
| `--accent-ink-muted` | `#e4e1ff` | Secondary text on the drenched card | 5.3:1 on `--accent` |

On the drenched card, secondary text is tinted from the indigo hue, never
gray.

Two values were corrected after measurement: `--ink-faint` began at `#8a8796`
(3.20:1, failing) and the drenched-card tint at `#c3bffb` (3.90:1, failing).
Do not reintroduce either.

## Shape and depth

Radii: 14 / 24 / 40 / 64px. Section slabs take 40–64. Nothing takes 16px.

Shadows are four-stop ramps with negative spread and real vertical offset —
never a zero-offset halo:

```
--shadow-card:
  0 0.5px 1.3px -0.7px rgb(20 18 40 / 0.10),
  0 1.6px 4.1px -1.4px rgb(20 18 40 / 0.10),
  0 4.1px 10.8px -2.1px rgb(20 18 40 / 0.10),
  0 13px 33.8px -2.75px rgb(20 18 40 / 0.08);
```

No borders on slabs. Hairlines only inside dense metadata rows.

## Motion

**One authored moment**, not an identical entrance per section. On load the
hero name wipes up from beneath an `overflow: hidden` mask, with the role,
pitch, and actions following at 130/90/90ms, while the indigo corner field
scales from 0.82 and resolves a 30px blur. Everything below the fold uses one
quieter treatment: opacity plus a 24px rise, once, on intersection.

Curve: `cubic-bezier(0.16, 0.84, 0.3, 1)`, exponential ease-out. Hero 620ms,
sections 520ms.

**The reveal is opt-in, not opt-out.** An inline script adds `.js` to
`<html>`; the hidden state is scoped to `.js .reveal`. If the script fails or
is blocked, every section renders visible and static. Content is never left
at `opacity: 0` waiting on JS that may not arrive.

Under `prefers-reduced-motion: reduce`, all content renders in final position
with no transition.

## Composition

The slab stack varies density rather than repeating one card size:

1. **Hero** — near-full-height, radius 64px top.
2. **Lead-in** — a deliberately thin band; the quiet beat before the evidence.
3. **Featured project** — full width, 21:9 artifact above a two-column meta
   row. This is the strongest project and it is sized to say so.
4. **Supporting pair** — two half-width slabs side by side, 16:10 artifact
   above stacked meta. Collapses to one column under 900px.
5. **Experience** — hairline-separated rows, date column left.
6. **Close** — drenched indigo, radius 64px bottom, both actions repeated.

Three equal project slabs was the first attempt and read as a card grid. The
featured-plus-pair arrangement replaced it.

## Rules

- No same-size icon-heading-text card grid as page structure.
- No section numbers, no per-section uppercase eyebrow.
- No gradient text; emphasis is weight and size.
- No monospace as decoration — it appears only on real URLs and stack names.
- Project artwork sits in a 16:10 well. Until real screenshots exist the well
  renders a labeled placeholder, never invented product imagery.
