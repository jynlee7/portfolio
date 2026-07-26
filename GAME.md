# GAME.md

`spots.map` — the walk-around game on this desktop. This file is to the game
what `DESIGN.md` is to the UI: the direction contract, not a description.
Read it before touching anything under `src/game/`, `src/os/spots.ts`, or
`content/spots.md`.

## What it is

One screen of a Berkeley neighborhood, drawn as a survey plan. You walk it a
block at a time. Reaching a storefront reveals a place Jayden actually ate at,
what he ate there, and a line or two about it. When you have found them all,
the map is complete and that is the end.

The point is not the walking. The point is that every one of those places is
real, and the walking is what makes you read them one at a time instead of
skimming a list.

## What it is not

Settled, and not up for redesign in a later session without the user saying so:

- **No scrolling camera.** One screen, fully visible, always.
- **No timer, no score, no fail state, no combat, no inventory.**
- **No leaderboard and no share string.** `TODO.md` pre-refused both: "It is a
  toy on a portfolio, not a product. Nothing about it should ask for a second
  visit it has not earned."
- **No procedural generation.** The map is hand-drawn geometry. A generated
  neighborhood reads as a screensaver; a real block plan reads as a place.
- **No daily reseed.** That was `dinner.run`'s idea and it left with it.
- **No pixel art, no tiles, no sprites.** See §5.

---

## 1. The three constraints

These are the reason the site works, and a walk-around game strains all three.
Most of this file exists to hold the line on them.

### 1.1 Zero frames at rest

`DESIGN.md` spends the entire motion budget on one authored moment — the
pointer deforming the wallpaper field — and says `dinner.run` "is turn-based
specifically so the budget survives it." A game loop would be a second authored
moment, and there is no room for one.

**There is no `requestAnimationFrame` loop in this game.** Not a paused one, not
a throttled one, not one that idles cheaply. None.

- Movement is a discrete grid step, one cell per keypress.
- The walker is a **DOM element** over the canvas. Moving it writes `--cx`/`--cy`
  custom properties; a CSS `transform` transition on `var(--dur-snap)` animates
  it on the compositor. JS does not animate anything.
- The canvas repaints **once per step**, and only when a cell's discovered state
  actually changed. Walking through already-explored street cells repaints
  nothing.
- An idle open window requests zero frames. This is testable and must be tested
  — see §8.

The reduced-motion block at the end of `src/style.css` already zeroes every
duration in the document, so the walker snapping instantly under reduced motion
is free and needs no JS guard.

### 1.2 Never fabricate

Every place name, dish, and description comes from `content/spots.md`, **written
by Jayden**. Not by an agent, not "as a placeholder to be replaced later," not
"a plausible Berkeley restaurant." This is the hardest rule in the repo and this
game is the single easiest place to break it.

Until `content/spots.md` has entries, the game is honest about being empty:
storefronts draw dark and labelled vacant, the tally reads `0 / 0`, and the
article carries the same draft band `principles.txt` uses. An empty game that
says it is empty is correct and shippable. A game with invented restaurants is
the worst thing this repo could ship.

If you need data to develop against, write a throwaway file, verify, and delete
it before the milestone closes. Do not commit it.

### 1.3 One copy of every fact

`content/spots.md` compiles at build time into a real `<ol class="spots">` inside
the article. With JS off, that list *is* the content: a readable, annotated set
of places.

The game does not fetch it, parse it again, or copy it. It **reads those `<li>`
elements as its data source**, and reveals a place by *moving* its `<li>` into
the detail card — then moving it back out when you walk away. This is the same
move `openDoc`/`closeDoc` make with articles and window frames (`src/os/windows.ts`),
and for the same reason: one copy of every fact means the windowed view and the
no-JS page cannot disagree.

---

## 2. File map

```
GAME.md                     this file
content/spots.md            the places. Jayden's to write. Draft until he does.
scripts/spots.mjs           compiles spots.md → <ol class="spots">
vite.config.mjs             the written-docs plugin; SPOTS const + <!-- @spots -->
src/game/neighborhood.ts    pure map geometry — no DOM, testable in Node
src/os/spots.ts             the app: canvas, walker, input, card, persistence
index.html                  #doc-spots article · the rail widget · the Play menu
src/style.css               the spots block (replaced the dinner block)
src/os/windows.ts           WIDTH["spots"]
src/main.ts                 initSpots()
```

Reused rather than rebuilt — do not reimplement any of these:

| Need | Use |
|---|---|
| Open/close, front, Escape | `openDoc` `closeDoc` `isOpen` `onWindowsChange` — `src/os/windows.ts` |
| Click-to-open on the widget | `initLaunchers` binds every non-`.icon` `[data-open]` — `src/os/desktop.ts:12` |
| Smart typography, `safeHref`, inline `**bold**` | import from `scripts/doc.mjs` |
| Every colour, radius, shadow, duration | `src/tokens.css` |

---

## 3. The content format

`content/spots.md`, compiled by `scripts/spots.mjs`. This file holds only the
list — the article around it (heading, prose, the mount the canvas goes in) is
hand-authored in `index.html`, which is why there is no `Title:` or `Meta:` here.

```
Draft: yes

<!-- Comments are skipped, single- or multi-line. The format reminder
     lives in the file Jayden edits, not only in this one. -->

# Places I actually went

An optional lede paragraph.

## Cheese Board Collective
one slice, whatever's on it that day
The line is long and it does not matter. Half the reason to go is that
you can hear the jazz from outside.

## Top Dog
bockwurst, mustard, no ketchup
Open late enough to be the answer to a question you asked at 1am.
```

- `## Name` — the place.
- The **next single line** — the dish. One line only, and warned over 72
  characters, because it renders on one line beside the name.
- The **following paragraph** — the description. Wraps freely; a second
  paragraph is more description, not a new field.
- Optional `Slot: <id>` line, directly under the `##` — pins the place to a
  named storefront. Without it, entries fill `SLOTS` **in order**: entry *n*
  lands in storefront *n*. Jayden never types coordinates.
- `Draft: yes` renders the draft band and warns, exactly as in `doc.mjs`.

Pinned places claim their storefront before unpinned ones are dealt out, so
adding a `Slot:` never gets silently overridden by an entry written earlier.

A missing dish or missing description is a **build warning and a visible gap in
the page** — the same failure mode `scripts/doc.mjs` uses for a missing anchor,
and for the same reason: content that is quietly absent reads fine and is
therefore never fixed.

More entries than storefronts warns and drops the overflow. Fewer is fine — the
extras stay vacant, which is true, and makes the plan look like a neighborhood
rather than a board with every square filled.

**Zero entries is a supported state, not a broken one.** The list is replaced by
a sentence saying the storefronts are empty, and the map draws them vacant.

---

## 4. State and storage

Key `jl.spots`, `localStorage`, try/catch-wrapped so private mode still plays:

```ts
type Saved = { found: string[]; at: [number, number] };
```

`found` holds **slot ids**, not indices — reordering `content/spots.md` must not
scramble what you have already found. `at` is the walker's cell.

Only inputs are persisted, never derived state. On load, the game re-derives
everything from `found`. This is the rule `dinner.run` followed and it is why
its saves survived content changes.

A slot id that no longer exists is dropped silently on load.

---

## 5. The rendition

**A plotter survey map. Not a game board, and emphatically not pixel art.**

There is no sprite or tile language anywhere in this repo. Adding one would
break the world `DESIGN.md` commits to — a scientific workstation, opaque bone
panels, 1px chiselled bevels, 3–5px radii, indigo as the only accent. A tiled
RPG look is exactly the thing `CLAUDE.md` calls out: "If an element could be
guessed from the category alone, it is wrong."

| Element | Treatment | Measured |
|---|---|---|
| Board | Recessed in `var(--inset)` on `--chrome` — a plotter bed | |
| Survey grid | 1px `--hairline` at 0.28 alpha, every cell | 1.45:1, texture only |
| Block footprints | Flat `--chrome-dim`, 1px `--bevel-dark` edge | 1.53:1, a surface edge |
| Vacant storefront | **Dashed** outline, `--ink-faint` | 3.98:1 on `--chrome-dim` |
| Undiscovered storefront | **Solid** 1.5px outline, `--ink-muted` | 5.5:1 on `--chrome-dim` |
| Found storefront | Filled `--accent` square | 4.86:1 on `--chrome-dim` |
| Walker | `--accent-deep` **disc**, 58% of a cell | 8.2:1 on `--chrome` |
| Labels | Chrome register, `--ink-faint`; **never monospace** unless measured | 5.3:1 on `--page` |

Two rules are doing real work here and both were arrived at the hard way:

**States are told apart by form, not by two greys a hair apart.** Vacant and
undiscovered started as `--ink-faint` and `--ink-muted` outlines — 3.98:1 and
5.5:1, both passing, and indistinguishable side by side. Dashed versus solid is
the difference that actually reads.

**Indigo marks exactly one thing at a time**, per `DESIGN.md`. The walker and a
found storefront are both indigo and end up adjacent the moment you find one, so
the separation is carried by **shape**: the walker is a disc, every storefront is
a square.

One trap worth naming: percentage padding on an absolutely positioned box
resolves against the *containing block's* width, not the element's own. Sizing
the walker with `padding: 18%` collapsed it to nothing — it is sized as a
percentage child instead.

**Every colour pairing gets its measured contrast in a CSS comment.** Not
estimated. A previous session shipped a comment claiming 7.1:1 for a value that
measured 3.9:1, which is why this is written down twice.

---

## 6. Input

| | |
|---|---|
| Walk | Arrow keys and WASD, one cell per press |
| Enter a storefront | Walk onto its door cell — no confirm keystroke |
| Fine pointer | Click any door; the walker paths there via `pathTo` |
| Coarse pointer | A four-button D-pad, `@media (pointer: coarse)` only |
| Focus | One tab stop: the map is `role="application"`, doors are `tabindex="-1"` |

**Key handlers bind to the map container, never to `document`.** `initWindowKeys`
owns Escape globally in `src/os/windows.ts`, and a document-level arrow handler
would fight the desktop and scroll the window body. Arrow keys call
`preventDefault()` for the same reason.

**The D-pad is not optional polish.** On a 390px viewport a door cell is about
12px across, which is not a tap target, and `PRODUCT.md` says these visitors are
"often on a phone". Touch gets the same one-step-at-a-time interface the keyboard
has rather than a worse version of the pointer one. The buttons are 44px, and
they are hidden wherever there is a fine pointer — on a desktop they would be set
dressing.

Headless Chromium reports `pointer: fine`, so **the D-pad cannot be exercised
there**. Force it with an injected style to check layout, and test the real thing
on a device.

---

## 7. Milestones

Tick these as they land. A new chat should be able to read the current position
off this list.

- [x] **M0** — Commit `dinner.run` for recoverability, write this file, remove
      the game and all its wiring.
- [x] **M1** — `src/game/neighborhood.ts`: hand-authored block plan, `walkable`,
      `step`, `slotAt`, `frontOf`, `pathTo`, `validate`. Pure, no DOM.
- [x] **M2** — `scripts/spots.mjs` + `content/spots.md` + the `<!-- @spots -->`
      branch in `vite.config.mjs`.
- [x] **M3** — `src/os/spots.ts` and the `#doc-spots` article. Canvas plan,
      walker, door buttons, detail card, `jl.spots`.
- [x] **M4** — The rail widget, the full CSS block, the D-pad, mobile sheet
      rules, and both gates green.

**The engine is done. The game is not shippable until `content/spots.md` has
entries** — that is the one remaining task and it is Jayden's. See `TODO.md` §4.

---

## 8. Verification

Both must be clean before any milestone is called done:

```bash
npm run build      # tsc + vite; the written-docs plugin warns on bad content
node ~/.claude/skills/impeccable/scripts/detect.mjs index.html src/style.css src/tokens.css
```

The detector prints nothing and exits 0 when clean.

Headless — chain `goto`+`js`+`screenshot` in **one** bash call, because the
browse server can restart between invocations and lose page state:

```bash
B=~/.claude/skills/gstack/browse/dist/browse
$B viewport 1440x900
$B goto "http://localhost:5173/?x=$RANDOM" && \
  $B js "document.getElementById('lock-enter').click(); document.querySelector('.widget--spots').click(); 1" && \
  $B screenshot /tmp/spots.png
```

By hand, every milestone:

1. **Zero frames at rest.** DevTools performance, window open, no input for 5s
   → no frames recorded. The constraint most likely to regress silently.
2. **JS off.** `html:not(.js)` must render the article as a readable list of
   places with no empty box where the map would be.
3. **Empty content.** With `content/spots.md` holding zero entries: vacant
   storefronts, draft band, `0 / 0`. No crash, no invented place.
4. **Keyboard only.** Tab to the widget → Enter → arrows walk → Escape closes.
   Arrows must not scroll the window body or reach the desktop.
5. **390×844.** Sheet layout, doors tappable at ≥44px, tally readable at
   half-rail width.

Reduced motion and coarse pointer **cannot be exercised headlessly** — browse
reports `pointer: fine`. Check on a real device.

---

## 9. Renaming

The id `spots` appears in exactly these places. Change all of them together:

```
index.html          id="doc-spots" · data-open="spots" (widget, Play menu)
                    data-action="spots-reset" · <!-- @spots -->
src/os/spots.ts     const DOC = "spots" · const KEY = "jl.spots"
src/os/windows.ts   WIDTH.spots
src/main.ts         import { initSpots }
vite.config.mjs     SPOTS
content/spots.md    filename
scripts/spots.mjs   filename
```

The class names are three separate families and only the last is the app:

| Prefix | What it is |
|---|---|
| `.spots`, `.spots__h`, `.spots__lede`, `.spots__empty` | the compiled list and its framing |
| `.place`, `.place__name/dish/note` | one written-up place |
| `.plan`, `.plan__*` | the game — map, walker, doors, D-pad, card |
| `.widget--spots`, `.spots__mini`, `.spots__tally` | the rail tile |

---

## 10. What was removed, and where it went

`dinner.run` — a turn-based game where you probed an 8×6 grid of anonymous
blocks over seven nights, trading exploration against a weekly average, with the
inferred contour map redrawn as you learned. It was finished and it worked.

It was replaced rather than kept because it is the same idea as this game with
the real food taken out, and two food-finding games on one portfolio reads as
indecision.

**Recover it from commit `5997d68`**, which exists for exactly this purpose:

```bash
git show 5997d68:src/os/dinner.ts
git show 5997d68:src/game/neighborhood.ts
```

`marchingSquares` in `src/field/core.ts` stayed — `src/os/flow.ts` and
`scripts/field.mjs` still use it. This game does not: a neighborhood is a street
map, not a contour plot.

---

## 11. Decisions taken during the build

- **The Play menu was kept** and repointed at `spots.map`, even though the user
  chose "rail widget only" for the launcher. A menubar is OS chrome rather than
  a desktop launcher, and it is the only keyboard-discoverable path in. It also
  carries "Start the walk over", which needs somewhere to live. Delete the whole
  `<div class="menu">` if that reading is wrong.
- The old menu showed a `7` shortcut hint that was never wired to anything. It
  is gone rather than reproduced.
- **The map and readout sit side by side**, and the window is `56rem` rather
  than the planned `48rem`. Stacked, the card landed below the fold and the
  whole point of walking — step on a place, read it — happened off-screen. The
  columns keep a cell at ~19.5px, just under the 20px floor where a block stops
  reading as a building. Below 780px it stacks, where the sheet scrolls anyway.
- **The card never collapses.** It shows a resting prompt instead, because
  hiding it shifted the map sideways on every step onto a door.
- **`#i-map` was deleted from the sprite.** It was drawn for `dinner.run`'s
  two-minima idea, nothing referenced it after the removal, and the rail tile
  uses a miniature of the real block plan instead of a generic map glyph.
- **A pre-existing bug was fixed in `src/os/windows.ts`.** `openDoc` wrote inline
  `left`/`top`/`maxHeight` on every window; below 780px those beat the bottom-sheet
  rule, so *every* window on the site hung 16px off the right edge of a 390px
  screen. Placement is now skipped when `sheet()` is true, and the drag guard
  shares that helper.
