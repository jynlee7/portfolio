# CLAUDE.md

Jayden Lee's personal portfolio. Read `DESIGN.md` before touching any UI — it is
the direction contract, not decoration.

## What this is

A portfolio for hiring managers, built as a **desktop operating system**: lock
screen, menubar, wallpaper, draggable icons, windows, dock, widget rail, and an
iOS-style home screen on mobile.

The rendition is a **scientific workstation**, not a consumer Mac: opaque bone
panels, 1px chiseled bevels, 3–5px radii, indigo as the only accent, host
monospace on measured values only. The wallpaper is a generated contour map of
a two-minimum loss surface, which is also the subject of Jayden's work.

## Stack

Vite 8 + vanilla TypeScript. No framework, no UI library, no CSS framework.
Node v25.3.0 (runs `.ts` imports natively, which the wallpaper generator relies
on).

```
npm run dev      # vite, localhost:5173
npm run build    # tsc && vite build
node scripts/field.mjs   # regenerate the three wallpapers
```

## Hard constraints

1. **"No AI slop."** The user's stated bar, and the reason for most decisions
   here. If an element could be guessed from the category alone, it is wrong.
2. **Local only.** No Vercel config, no deploy, no domain, no analytics. The
   user asked explicitly to stay local. Do not add deployment without being
   asked.
3. **Never fabricate anything about Jayden.** No invented metrics, repo URLs,
   live demo links, awards, testimonials, or logos. Neither project has a
   deployed URL. Unknown values ship as a visible placeholder plus an entry in
   `TODO.md`.
4. **Do not clone the reference portfolios.** Two desktop-portfolio references
   were supplied as briefs. Take the metaphor, never the ornaments — their
   award badges in particular would be fabricated credentials.

## Layout of the code

```
index.html          sprite · lock · menubar · desk · dock · docs
src/tokens.css      all design tokens, with measured contrast in comments
src/style.css       everything else; direction contract in the header comment
src/main.ts         boot order
src/os/lock.ts      initLock, mountLockField, relock
src/os/menubar.ts   initMenubar (menus, wallpaper switch, bar clock)
src/os/desktop.ts   initLaunchers, initDock (magnification, running dots)
src/os/arrange.ts   initArrange, tidy (draggable icons, persistence)
src/os/windows.ts   openDoc, closeDoc, closeAll, initWindowKeys
src/os/widgets.ts   initWeather (Open-Meteo, Berkeley)
src/os/flow.ts      initFlow (pointer-driven live wallpaper)
src/os/dinner.ts    initDinner (dinner.run — the minigame; turn-based, no loop)
src/field/core.ts   the scalar field — shared by generator AND runtime
src/game/neighborhood.ts
                    dinner.run's own hidden surface — pure, no DOM
scripts/field.mjs   writes public/field-{lab,slate,blueprint}.svg
```

`PRODUCT.md` product truth · `DESIGN.md` visual contract · `TODO.md` what's left.

## Conventions that matter

**Content lives in the document, once.** Each `<article class="doc" id="doc-*">`
holds real content. `openDoc()` **moves** the article into a window frame and
`closeDoc()` moves it back. Never clone — one copy of every fact means the
windowed view and the no-JS page cannot disagree.

**The desktop is an enhancement.** An inline script adds `.js` to `<html>`.
Everything OS-shaped is hidden under `html:not(.js)`, which must always render a
complete readable document. Check this after structural changes.

**Monospace only on measured values** (`.num`): clock, temperature, dates, file
sizes, GPA. Never as a label or heading costume.

**Contrast is measured, never estimated.** Text on the wallpaper is measured
against the field's *darkest* stop, not its average. Token comments carry real
numbers; if you change a colour, re-measure and update the comment. A previous
session shipped a comment claiming 7.1:1 for a value that was actually 3.9:1.

**The field has one source of truth.** `src/field/core.ts` holds the surface
function, level spacing and palettes. The generator and the live canvas both
import it. Changing the surface means re-running `node scripts/field.mjs`, or
the static wallpaper and the live canvas will disagree and the background will
visibly jump on load.

**Every launcher is a real `<button data-open>`.** Double-click is an addition
on top of the keyboard path, never the only way in.

**Motion budget.** One authored moment (the pointer deforming the field).
Everything else is 90–220ms utility. Any loop must cost zero frames at rest and
must not start under reduced motion, on a coarse pointer, or on a hidden tab.

**Storage keys:** `jl.woke` (sessionStorage, lock dismissed) · `jl.desk`
(wallpaper) · `jl.icons` (icon positions) · `jl.bt` (Berkeley-time toggle) ·
`jl.dinner` (today's `dinner.run`).

**`dinner.run` does not touch the wallpaper.** Its surface lives in
`src/game/neighborhood.ts` and is reseeded daily; `src/field/core.ts` stays the
wallpaper's single source of truth, and the game only borrows the pure
`marchingSquares` helper from it. Changing the game never means regenerating an
SVG. The board is seeded from the *Pacific* date, matching the menubar clock, so
"the same neighborhood on the same day" is true across timezones.

## Verifying work

Headless browser at `~/.claude/skills/gstack/browse/dist/browse`.

```bash
B=~/.claude/skills/gstack/browse/dist/browse
$B viewport 1440x900          # SEPARATE command — there is no --viewport flag
$B goto "http://localhost:5173/?x=$RANDOM"
$B js "document.getElementById('lock-enter').click(); 1"
$B screenshot /tmp/shot.png   # only /tmp or the repo are writable
```

Hard-won gotchas:

- The browse server **can restart between separate invocations and lose page
  state**. Chain `goto` + `js` + `screenshot` inside one bash call.
- `$B js` with an **async IIFE frequently returns nothing**. Write synchronous
  JS and read state in a follow-up call.
- Headless Chromium has **no PDF plugin**, so the résumé window always shows its
  fallback there. That is not a bug.
- It reports `pointer: fine`, so **coarse-pointer guards cannot be exercised**
  headlessly. Same for `prefers-reduced-motion`.
- macOS blocks `~/Desktop` from the terminal entirely. Files there cannot be
  read even unsandboxed; ask for them to be moved into the repo.

Before calling anything done:

```bash
npm run build                                             # includes tsc
node ~/.claude/skills/impeccable/scripts/detect.mjs index.html src/style.css src/tokens.css
```

The detector prints nothing and exits 0 when clean.

## Design workflow

UI work goes through the `impeccable` skill. A new surface or replacement world
routes via `reference/new-work.md`; load `reference/craft-floor.md` immediately
before editing UI. A brief-pinned world pins the *world*, not its softest
rendition — that distinction is why this is a workstation and not a glass Mac.
