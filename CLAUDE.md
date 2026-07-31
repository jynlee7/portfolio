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
index.html          sprite · lock · menubar · desk · dock · docs (folders+files)
src/tokens.css      all design tokens, with measured contrast in comments
src/style.css       everything else; direction contract in the header comment
src/main.ts         boot order
src/os/lock.ts      initLock, mountLockField, relock
src/os/menubar.ts   initMenubar (menus, wallpaper switch, bar clock)
src/os/desktop.ts   initLaunchers, initDock (magnification, running dots)
src/os/arrange.ts   initArrange, tidy (draggable icons, persistence)
src/os/windows.ts   openDoc, closeDoc, closeAll, minimize, initWindowKeys,
                    restoreWindows (zoom, resize, MRU cycling, jl.win)
src/os/palette.ts   initPalette (⌘K; index derived from the DOM, never authored)
src/os/status.ts    initStatus, say (the desktop's one live region)
src/os/widgets.ts   initWeather (Open-Meteo, Berkeley)
src/os/flow.ts      initFlow (pointer-driven live wallpaper)
src/os/spots.ts     initSpots (spots.map — the walk-around game; no loop)
src/field/core.ts   the scalar field — shared by generator AND runtime
src/game/neighborhood.ts
                    spots.map's block plan — pure geometry, no DOM
content/spots.md    the places. Jayden's to write.
scripts/spots.mjs   compiles spots.md into the article at build time
scripts/field.mjs   writes public/field-{lab,slate,blueprint}.svg
```

`PRODUCT.md` product truth · `DESIGN.md` visual contract · `GAME.md` the game's
contract · `TODO.md` what's left.

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

**Folders are documents whose content is their own listing.** `doc--folder`
articles hold a `.filelist` of real `<button data-open>` rows; the files they
list are ordinary `<article class="doc">` elements sitting beside them on the
shelf, so opening one goes through the same `openDoc` move as everything else
and the window manager knows nothing about hierarchy. A file belongs to one
folder and appears in no other listing, and the desktop shows only top-level
items — that is the whole containment rule.

Two things follow that are easy to break. **Order the files directly beneath
their folder in `index.html`**: without JS the listing is hidden (its rows are
controls that cannot fire) and the folder heading has to introduce the files
that follow it in the flow. And **the dock opens folders, not the writeups
inside them** — pointing it at `*-readme` was tried and reverted, because three
of the six dock items then wear the same page glyph and the row stops being
readable at a glance.

**Motion budget.** One authored moment (the pointer deforming the field).
Everything else is 90–220ms utility. Any loop must cost zero frames at rest and
must not start under reduced motion, on a coarse pointer, or on a hidden tab.

**Storage keys:** `jl.woke` (sessionStorage, lock dismissed) · `jl.win`
(sessionStorage, open windows and their geometry) · `jl.desk` (wallpaper) ·
`jl.icons` (icon positions) · `jl.bt` (Berkeley-time toggle) · `jl.spots`
(found places and walker position).

`jl.win` is session-scoped on purpose, unlike `jl.icons` and `jl.desk`. A
returning visitor wants the desk they arranged; they do not want five windows
restored in front of them on a cold visit, which is clutter aimed at exactly
the person who has ninety seconds and is looking for one PDF. Session scope
keeps a reload — or a bounce out to the résumé and back — intact, and gives the
layout the same lifetime as `jl.woke`, so the lock screen and the windows can
never disagree about whether this is a new visit.

**The palette's index is derived, never authored.** `src/os/palette.ts` reads
its rows out of the live DOM every time it opens: documents from `article.doc`,
commands from the menubar's own `[data-action]` and `[data-desk]` items, mail
from the dock's link. Nothing in that file knows the name of a single document.
Adding a document to `index.html` puts it in the palette; there is no list to
update, and no list that can drift or invent an entry.

**Shortcuts the browser owns are not bound.** `⌘W` (close tab) and `⌘M`
(macOS minimise) never reliably reach the page, so nothing here uses them.
Escape closes the frontmost window, ⌘`/Ctrl+` cycles, ⌘K opens the palette, and
minimising is a click on the window's own dock item — the one gesture that
needs no chord at all. Any new binding must clear the same bar.

**Escape is layered.** The palette stops it (it is modal), an open menu stops
it (and returns focus to its trigger), and only then does the window manager
see it and close the frontmost window. A new Escape handler must place itself
in that order deliberately or it will close a window somebody was not closing.

**The game has its own contract: read `GAME.md` before touching it.** Short
version: `spots.map` never touches the wallpaper, has no `requestAnimationFrame`
loop of any kind, and every place in it is real and written by Jayden in
`content/spots.md`. Changing the game never means regenerating an SVG.

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
