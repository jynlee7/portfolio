# CLAUDE.md

Jayden Lee's personal portfolio. Two surfaces, two design contracts — read the
right one before touching any UI:

| URL | What it is | Contract |
| --- | --- | --- |
| `/` | **The portfolio.** An editorial page: hero, work, experience, about, contact. | `DESIGN.md` |
| `/desktop/` | **Jayden's desktop.** The original OS — lock screen, menubar, windows, dock. | `docs/DESKTOP_DESIGN.md` |

## What this is

Since 28 Oct 2026 the homepage is a portfolio a hiring manager can read without
learning an interface: no lock screen, résumé one click from the first
viewport, every project summary visible without opening anything. Each role
and project has its own Three.js illustration with a static SVG fallback.

The desktop is still here, at `/desktop/`, as the playground: a portfolio
built as a **desktop operating system** in the rendition of a **scientific
workstation** — opaque bone panels, 1px chiseled bevels, 3–5px radii, indigo
as the only accent, host monospace on measured values only, over a generated
contour map of a two-minimum loss surface. **Nothing on the portfolio links
to it.** After 20 s on the page, a corner comes apart in bits to show the
desktop's field underneath, and "Go in" turns the whole screen over into it
(`src/portfolio/peek.ts`; DESIGN.md, "The computer under the page"). Direct
URLs (`/desktop/`, `/desktop/#resume`) still work, and its menubar carries a
**Portfolio** link home at every width.

**The desktop's two games are deferred** (28 Oct 2026, issue #4): `rift.exe`
and `spots.map` came out of the tree, with their contracts (`RIFT.md`,
`GAME.md`), their tests and the `win--full`/`win--game` window variants only
they used. Everything is on branch `archive/desktop-games` exactly as it ran;
the issue is the brief for bringing them back. Do not re-add either piecemeal.

Everything below headed "Conventions that matter" was written for the desktop
and still governs `/desktop/`. It does not govern `/`.

## Stack

Vite 8 + vanilla TypeScript, multi-page (`index.html` and `desktop/index.html`
are separate Rolldown inputs). No framework, no UI library, no CSS framework.
One runtime dependency: `three`, imported dynamically by the portfolio's
scenes and never by the desktop. Node v25.3.0 (runs `.ts` imports natively,
which the wallpaper generator and `vite.config.mjs` rely on).

```
npm run dev      # vite, localhost:5173 (/ and /desktop/)
npm run build    # tsc && vite build
node scripts/field.mjs   # regenerate the three wallpapers
```

## Hard constraints

1. **"No AI slop."** The user's stated bar, and the reason for most decisions
   here. If an element could be guessed from the category alone, it is wrong.
2. **Deploy is authorized; analytics is not.** The site ships to Vercel on
   `jaydenelee.com` (registered at Squarespace, on Squarespace nameservers —
   Squarespace is registrar and DNS only, never the host). Still no analytics,
   no tracking, no third-party scripts: the one network call the page makes is
   Open-Meteo for the weather widget. Adding any other is a separate ask.
3. **Never fabricate anything about Jayden.** No invented metrics, repo URLs,
   live demo links, awards, testimonials, or logos. Unknown values ship as a
   visible placeholder plus an entry in `TODO.md`. Every URL on this page comes
   from a document Jayden wrote — as of 12 Aug 2026 that means `clinical-sim`
   links its Deepnote app and `chessblitz` links its GitLab repo, both taken
   verbatim off the résumé; `this-site` still has no repo row, because the
   résumé lists the site, not its source.
4. **Do not clone the reference portfolios.** Two desktop-portfolio references
   were supplied as briefs. Take the metaphor, never the ornaments — their
   award badges in particular would be fabricated credentials.

## Layout of the code

```
index.html          the portfolio's shell; <!-- @portfolio --> is filled at build
content/portfolio.mjs
                    every fact on both surfaces — roles, projects, profile.
                    Sourced from public/resume.pdf; never type a fact into markup
scripts/portfolio.mjs
                    renders the portfolio's header/main/footer from it
scripts/desktop-docs.mjs
                    renders the desktop's about/experience/project/résumé
                    documents from it, at <!-- @portfolio-doc id --> markers,
                    and the nameplate status line and Now widget from the
                    current role, at <!-- @portfolio-part id --> markers
scripts/test-portfolio.mjs
                    Playwright acceptance checks for both surfaces (see below)
src/portfolio/      main.ts (menu, hash→details, Back) · scenes.ts (one shared
                    WebGL context, zero frames at rest) · scene-models.ts ·
                    peek.ts + peek.css (the desktop showing through) ·
                    style.css · scenes.css
public/scenes/      the static SVG fallback for every scene

desktop/index.html  sprite · lock · menubar · desk · dock · docs (folders+files)
src/tokens.css      the desktop's design tokens, measured contrast in comments
src/style.css       the desktop's everything else
src/main.ts         the desktop's boot order
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
src/field/core.ts   the scalar field — shared by generator AND runtime
scripts/field.mjs   writes public/field-{lab,slate,blueprint}.svg
```

`PRODUCT.md` product truth · `DESIGN.md` visual contract ·
`docs/DESKTOP_DESIGN.md` the desktop's · `TODO.md` what's left.

## Conventions that matter

**Content lives in the document, once.** Each `<article class="doc" id="doc-*">`
holds real content. `openDoc()` **moves** the article into a window frame and
`closeDoc()` moves it back. Never clone — one copy of every fact means the
windowed view and the no-JS page cannot disagree.

**On the desktop, the OS is an enhancement.** An inline script adds `.js` to `<html>`.
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
their folder in `desktop/index.html`**: without JS the listing is hidden (its rows are
controls that cannot fire) and the folder heading has to introduce the files
that follow it in the flow. And **the dock opens nothing.** As of 28 Sep 2026 it is Jayden's tool stack —
Lovable, Codex, Claude Code as display-only `role="img"` tiles — plus the mail
link past the separator. Documents open from the desk and the menubar. Add a
tool only when Jayden names it; the tiles are claims about him.

**Motion budget.** One authored moment (the pointer deforming the field).
Everything else is 90–220ms utility. Any loop must cost zero frames at rest and
must not start under reduced motion, on a coarse pointer, or on a hidden tab.

**Storage keys:** `jl.woke` (sessionStorage, lock dismissed) · `jl.win`
(sessionStorage, open windows and their geometry) · `jl.desk` (wallpaper) ·
`jl.icons` (icon positions) · `jl.bt` (Berkeley-time toggle) · `jl.peek`
(sessionStorage, portfolio:
`seen` or `shut`) · `jl.through` (sessionStorage, one-shot: arrived through
the peek, so the lock keeps its field at rest).

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
Adding a document to `desktop/index.html` puts it in the palette; there is no list to
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

## Verifying work

Headless browser at `~/.claude/skills/gstack/browse/dist/browse`.

```bash
B=~/.claude/skills/gstack/browse/dist/browse
$B viewport 1440x900          # SEPARATE command — there is no --viewport flag
$B goto "http://localhost:5173/?x=$RANDOM"           # the portfolio
$B goto "http://localhost:5173/desktop/?x=$RANDOM"   # the desktop, at its lock
$B js "document.getElementById('lock').click(); 1"
$B screenshot /tmp/shot.png   # full-page; only /tmp or the repo are writable
```

A deep link into the desktop (`/desktop/#resume`, any `#id` with a `doc-id`)
skips the lock screen on purpose — the visitor already chose a door.

Hard-won gotchas:

- The browse server **can restart between separate invocations and lose page
  state**. Chain `goto` + `js` + `screenshot` inside one bash call.
- `$B js` with an **async IIFE frequently returns nothing**. Write synchronous
  JS and read state in a follow-up call.
- Headless Chromium has **no PDF plugin**, so the résumé window always shows its
  fallback there. That is not a bug.
- `$B screenshot` is **full-page**, so `position: fixed` elements (the skip
  link at `top: -100px`) can appear mid-page in the image. Not a bug either.
- It reports `pointer: fine`, so **coarse-pointer guards cannot be exercised**
  headlessly. Same for `prefers-reduced-motion`.
- macOS blocks `~/Desktop` from the terminal entirely. Files there cannot be
  read even unsandboxed; ask for them to be moved into the repo.

Before calling anything done:

```bash
npm run build                                             # includes tsc
node ~/.claude/skills/impeccable/scripts/detect.mjs index.html desktop/index.html \
  src/style.css src/tokens.css src/portfolio/style.css src/portfolio/scenes.css
npx vite preview --port 4173 &                            # then:
node scripts/test-portfolio.mjs                           # 22 checks, both surfaces
```

The detector prints nothing and exits 0 when clean. The acceptance script
uses the project's own Playwright (a devDependency pinned to 1.62.1; run
`npx playwright install chromium` once on a new machine) and compares
`public/resume.pdf` byte-for-byte with `RESUME_SOURCE` (default:
`~/Downloads/resumes/Lee_Jayden_Resume_10202026.pdf`, the source shipped on
28 Oct 2026); set that env var when the résumé changes. With the variable
unset and the default file absent, as on a fresh checkout, that one check
reports SKIP instead of failing; with it set, a missing file fails.

## Design workflow

UI work goes through the `impeccable` skill. A new surface or replacement world
routes via `reference/new-work.md`; load `reference/craft-floor.md` immediately
before editing UI. A brief-pinned world pins the *world*, not its softest
rendition — that distinction is why this is a workstation and not a glass Mac.

<!-- handoff:start:conventions-and-traps -->
## Handoff note — 26 Aug 2026

**`palette.ts` and `status.ts` are documented above but not wired in.** Both `src/os/palette.ts` (⌘K command palette) and `src/os/status.ts` (`initStatus`/`say`, the live region) are complete, typed, and match everything this file already says about them — the DOM-derived index, the escape layering, the debounced announcer. But as of this diff:
- `src/main.ts` never imports or calls `initPalette()` or `initStatus()`
- `desktop/index.html` has no `#os-say` element and no `[data-action="palette"]` menu item for `collect()` to read
- `src/style.css` has no `.palette` rules

`npm run build` passes anyway, because nothing in the build graph references the missing wiring. Do not assume the palette or the live region are live from this file's prose alone — check `src/main.ts` and `desktop/index.html` first. Either finish the wiring or note here that these two files are a staged-but-unshipped feature.
<!-- handoff:end:conventions-and-traps -->
