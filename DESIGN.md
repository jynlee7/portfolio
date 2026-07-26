# Design

<!-- impeccable:design-schema 1 -->

## Direction contract

**THESIS.** A machine you operate, not a page you scroll. The visitor wakes a
workstation, opens files, and leaves with the résumé. It refuses two defaults
at once: the portfolio scroll-stack of hero-then-cards-then-footer, and the
frosted-glass consumer-desktop clone that the desktop-metaphor genre always
ships.

**OWN-WORLD.** A scientific workstation, not a consumer OS. Opaque bone panels
(`#eceae4`) with 1px chiseled bevels — white on the top and left edges, warm
grey on the bottom and right — over a generated contour map of a two-minimum
loss surface. Near-black title bars (`#22212a`). Fillets of 3–5px, because
milled plastic has a small radius and nothing here is a pill. Indigo
(`#4338f5`) is the only accent and marks exactly one thing at a time: the
active path. The host's own monospace appears only on measured values.

**STORY.** A hiring manager sees the name, the field, and one line worth being
curious about before touching anything; wakes the machine; opens `resume.pdf`
or a project folder; leaves with the PDF.

**FIRST VIEWPORT.** The lock screen. The hour where Jayden is at the top,
identity low and small at the bottom, the contour field filling everything
between. The whole surface is the door. (Pacific, not Berkeley time — those are
now two different readings on this machine. See Rules.)

**FORM.** Desktop OS, pinned by the user's brief (a desktop-portfolio
reference supplied in full). The world is pinned; the rendition is not. Taken
to the scientific-workstation end of that world's range rather than the
consumer-Mac end, because the subject matter is HPC clusters, Slurm and Monte
Carlo, and because the reference's own softest rendition is what every model
ships for this genre.

## Type

| Role | Face | Size | Notes |
|---|---|---|---|
| Display | Cabinet Grotesk 800 | 1.75rem `--step-h1` | Document headings, name |
| Body | Switzer 400/500/600 | 0.9375rem | Window content, 68ch measure |
| Chrome | Switzer 500 | 11 / 12 / 13px | Menubar, icon labels, window titles |
| Measured | host monospace | inherits | Clock, temperature, dates, sizes, GPA |
| Clock | host monospace 300 | `clamp(4rem, 2rem + 11vw, 9rem)` | Lock screen only |

Monospace is for **measurement, not costume**. It never labels a section or
sets a heading. The tracking floor is -0.05em, used only on the lock clock.

## Color

Strategy: **Restrained.** Neutrals carry the machine; one accent.

All values measured, not estimated.

| Token | Value | Contrast |
|---|---|---|
| `--ink` | `#1b1a20` | 16.6:1 on `--page` |
| `--ink-muted` | `#55525f` | 7.3:1 on `--page` |
| `--ink-faint` | `#6a6775` | 5.3:1 on `--page` |
| `--accent-ink` | `#ffffff` | 6.7:1 on `--accent` |
| `--bar-ink` | `#f3f1ec` | 14.1:1 on `--bar` |
| `--bar-ink-dim` | `#a5a1b0` | 6.3:1 on `--bar` |
| `--on-desk` | `#26242c` | 10.2:1 on the darkest lab stop |
| `--on-desk-dim` | `#524f5c` | 5.3:1 on the darkest lab stop |
| `--on-desk-quiet` | `#5b5866` | 4.6:1 on the darkest lab stop |

Text sitting directly on the wallpaper is measured against the **darkest** stop
of the field, not its average, because the wallpaper is a gradient.

On the light desk, `--on-desk-quiet` cannot go lighter than `--on-desk-dim` and
still clear AA. Quiet is carried there by size and tracking instead of colour.
Do not lighten it to make the two visually distinct.

Three wallpapers, all generated from one field: `lab` (bone, default), `slate`
(mid grey-blue), `blueprint` (drenched indigo). The chrome does not change
material between them — only what sits directly on the wallpaper inverts.

## Shape and depth

Radii: `--r-ctl` 3px, `--r-win` 5px, `--r-icon` 8px. Nothing larger.

A raised panel is `--raise`: `inset 1px 1px 0 #fff, inset -1px -1px 0 #b6b2a7`.
Inset reverses it. **A bevel is 1px and never blurred** — it is a physical
edge, not a glow.

Only floating things cast a shadow: windows, menus, the dock. Two stops with
real offset and blur; no zero-offset halos.

Translucency is earned, not decorative. It appears in exactly three places, all
of which are OS chrome physically floating over the desk: the menubar, the
dock, and the icon-label veil. Window bodies are opaque.

## Motion

Chrome responds like a machine: 90ms snap, 140ms state, 220ms window open.

**One authored moment: the field responds to the pointer.** The wallpaper is a
loss surface, so the cursor is a perturbation on it — a gaussian bump follows
with lag and the contours are recomputed around it every frame, genuinely
bending, splitting and merging. It is not parallax and not a hover lift; the
geometry changes. Implemented in `src/os/flow.ts` over the shared field in
`src/field/core.ts`, so the live canvas and the static SVG cannot drift.

Budget: zero frames at rest. The loop runs only while the pointer is on the
surface plus a settle tail, and never starts under reduced motion, on a coarse
pointer, or on a hidden tab. Measured at 59fps on a 1440-wide viewport.

The lock screen's entrance resolves the field level by level (deepest first),
then hands off to the live canvas so the two never animate the same contours
at once.

`dinner.run` is the one interactive surface besides the field, and it is
turn-based specifically so the budget survives it: nothing runs between turns,
the board redraws once when a night is eaten, and an idle open window requests
zero frames. Its single animated moment is the reveal at the end — a 260ms
crossfade from the inferred map to the real one, bounded, self-terminating, and
skipped entirely under reduced motion, where the truth simply appears.

## Composition

The desktop is not a scroll. The nameplate and desktop items share one flow
column on the left, so a longer pitch pushes the icons down instead of landing
on them; widgets occupy a right rail; the dock floats bottom-centre.

Windows cascade from a fixed origin clear of both the nameplate and the rail,
and their max-height accounts for the cascade offset so the last one in a stack
cannot run off the desk.

Content lives in the document as `<article class="doc">` and is **moved** into
a window frame on open, never cloned. There is exactly one copy of every fact,
so the windowed view and the no-JS page cannot disagree.

Mobile is an iOS home screen, not a shrunken desktop: a 4-column tile grid,
widgets stacked, windows become full-height sheets.

## Rules

- Never add a widget, icon, or document for something that is not true. The
  rail holds current roles and live Berkeley weather; that is all there is.
- Monospace only on measured values.
- **Every clock on this machine tells the truth by default.** The bar clock can
  be switched to Berkeley time — Pacific plus ten, the hour every class here
  actually starts on — but only by clicking it, it says `BT` while it is, and
  the tooltip names the Pacific time it is standing in for. A clock that
  silently disagrees with the visitor's own is a bug, not a joke. The lock
  screen's clock is never switchable; the first viewport does not do jokes.
- Any text placed on the wallpaper is measured against the field's darkest
  stop before it ships.
- Tooltips are floating chrome and take the panel's material: `--chrome` face,
  `--raise` bevel, hairline, one float shadow. Their dwell delay is timed in
  JS, never as a `transition-delay` — the reduced-motion block zeroes every
  delay in the document, and a tooltip that fires on the way past is worse than
  no tooltip.
- The desktop is an enhancement. `html:not(.js)` must always render a complete,
  readable document; `.desk` drops its fixed positioning and wallpaper there.
- Every launcher is a real `<button data-open>`. Double-click is an addition on
  top of the keyboard path, never the only way in.
- Documents whose value is the prose are written in `content/*.md` and compiled
  into `index.html` at build time by the `written-docs` plugin in
  `vite.config.mjs`. Compiled in, never fetched: the one-copy-of-every-fact rule
  and the no-JS page both depend on the article being in the served HTML.
- A principle without an anchor renders a striped gap, not clean prose. Same
  argument as the screenshot wells — an unproven claim is missing content, and
  the page says so rather than reading fine without it.
- The field's math lives in `src/field/core.ts` and nowhere else. Changing the
  surface means regenerating the wallpapers with `node scripts/field.mjs`.
- Project artwork sits in a striped well until a real screenshot exists. The
  well is deliberately obvious; it is not a design element.
