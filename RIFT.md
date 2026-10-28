# RIFT.md

`rift.exe` — the fullscreen skirmish on this desktop. This file is to that
game what `GAME.md` is to `spots.map`: the direction contract, not a
description. Read it before touching anything under `src/game/rift/`,
`src/os/rift.ts`, or the `rift.exe` block in `src/style.css`.

`GAME.md` remains `spots.map`'s contract and nothing in it changed. The two
games do not share a rulebook because they are not the same kind of thing:
`spots.map` is a zero-motion survey toy built to prove real places Jayden went
to; `rift.exe` is a real-time skirmish built to be fun for ninety seconds and
demonstrate a second, harder discipline — a live simulation with a fixed-step
loop, collision, and a boss with phases. Where the two disagree, this file is
the one that amended the older contract, and it says so below rather than
leaving `GAME.md` looking self-contradictory.

## What it is

Ten waves and a boss, on the same loss surface the wallpaper draws. One
playable unit — **Mystic**, a skillshot marksman — moves, auto-attacks, and
casts four abilities on cooldown against an escalating spread of enemies that
also cast things you have to dodge. Clear a wave, level up, and at levels 2,
4, 6 and 8 pick one of three augments. Wave 10 is **The Saddle**, the boss,
alone: win or die, then the run is over.

The arena floor is not a backdrop drawn to look like the wallpaper — it *is*
the wallpaper's field. `src/os/rift.ts` imports `sampleGrid`,
`marchingSquares`, and the theme tables straight out of `src/field/core.ts`
and paints the resting surface once per run and on resize. The boss is named
for the saddle point between the field's two minima for the same reason: this
game is not generic, it is built on the one thing that makes this specific
site's wallpaper the thing it is.

## The amendment

`docs/DESKTOP_DESIGN.md`'s Motion section and `GAME.md` §1.1 both state, correctly, that
the desktop's entire motion budget was spent on one authored moment — the
pointer deforming the field — and that no game on this desktop runs a
`requestAnimationFrame` loop. `rift.exe` runs one. That is a deliberate,
user-approved amendment to both files, not an oversight, and this is the
record of it:

- The rule was never really "no loop." It was **zero frames at rest** —
  nothing on this machine may cost a frame when nobody is using it. `flow.ts`
  satisfies that by starting only while the pointer is on the surface;
  `spots.map` satisfies it by having no loop at all, because a discrete grid
  walk never needed one. `rift.exe` satisfies the same rule the same way
  `flow.ts` does: the loop runs only while a run is being actively played, and
  costs nothing otherwise. See §1 below for exactly what "otherwise" covers.
- `GAME.md`'s "no timer, no score, no fail state, no combat" line was marked
  **"not up for redesign in a later session without the user saying so."**
  The user said so — this is a second, different game, built to be a
  real-time skirmish on purpose, not a redesign of `spots.map`.
- Everything else `GAME.md` settles for `spots.map` — no leaderboard, no
  share string, hand-authored rather than generated content, never fabricate
  — still holds here in spirit: no leaderboard, no share string, and every
  name, kit, and augment is original rather than borrowed (see the IP note
  below), because that was never about motion, it was about what this
  portfolio is for.

## IP note — read before adding a second unit or reusing anyone else's kit

The genre is a League-of-Legends-shaped skirmish, and Jayden asked for that
shape on purpose. Game *mechanics* — skillshots, auto-attacks, cooldowns, XP
and augment drafts — are not copyrightable and are used here freely, the same
way any dodge-and-shoot arena game uses them. What is not reused: **any
champion name, ability name, splash art, icon, or the Riot/League wordmarks**,
and no Data Dragon or Riot API call. "Mystic" is not a reskinned Ezreal in
name only — the unit is original, the enemies are original, and the augment
names ("Steepest Descent," "Basin," "Curvature," ...) are drawn from the
site's own field vocabulary specifically so this reads as this portfolio's
game rather than fan art. This also keeps `CLAUDE.md` constraint #2 intact —
the page's one network call stays Open-Meteo, because nothing here needs a
CDN.

---

## 1. Zero frames at rest, precisely

The loop lives in `src/os/rift.ts` as a fixed-step accumulator on top of
`requestAnimationFrame`, calling the pure `step()` in `src/game/rift/sim.ts`
at a constant 60 Hz regardless of display refresh rate. It:

- **Starts only on an explicit "Begin run" press.** Never on window open,
  never on hover, never because a wave is about to spawn. Opening the window
  shows the start screen (or the paused/ended screen, if a run already
  exists) and draws exactly one static frame.
- **Stops hard** on: the run ending (won or lost), the player pressing
  Escape while a run is live (pauses, does not close — see §2), an augment
  pick opening, the game frame losing focus to anything else on the page, the
  tab going hidden, or the window closing.
- **An idle or paused run costs zero frames**, tested the same way `flow.ts`
  and `spots.map` are: open the window, do nothing, and DevTools' performance
  panel should show nothing after the one opening paint.
- Closing the window **pauses rather than abandons** a run in progress — the
  article moves back to the shelf, exactly as `closeDoc` already does for
  every document, and the in-memory run state goes with it. Reopening shows
  the pause screen with the run intact, the same way `spots.map`'s walk
  survives a close.

## 2. Escape is layered the way `CLAUDE.md` requires

`initWindowKeys` in `src/os/windows.ts` owns Escape globally and closes the
frontmost window. `rift.ts` binds its own Escape handler on the game's own
focusable frame (`.rift__frame`), in the bubble phase, ahead of that document
listener in the DOM — the same pattern `spots.map` uses for arrow keys, never
a `document`-level handler fighting the desktop. While a run is live, the
first Escape pauses and calls `stopPropagation()`, so the window manager never
sees it. Once already paused — or on the start, pick, or end screen — Escape
is left alone and bubbles up, closing the window like every other window on
this desktop. A new binding here has to place itself in that order
deliberately, per `CLAUDE.md`'s existing rule.

## 3. The split: pure sim, DOM renderer

```
src/game/rift/types.ts       shared types — Vec, Enemy, Projectile, Telegraph,
                              PlayerState, Intent, RiftState. Plain data only.
src/game/rift/units.ts       Mystic's kit, enemy archetypes, the boss
src/game/rift/waves.ts       the ten-wave table, spawn-queue builder
src/game/rift/augments.ts    the 14 augment ids + display text, offer rolling
src/game/rift/sim.ts         step(state, intent, dtMs) — pure, no DOM, no RAF
src/game/rift/validate.ts    data checks — wave table, augment ids, stats

src/os/rift.ts                the loop, the canvas, input, HUD, persistence
src/os/windows.ts             .win--full relay (doc--full → win--full)
src/style.css                 the "rift.exe" block + .win--full
index.html                    #doc-rift article · desk icon · Play menu
src/main.ts                   initRift()
```

Everything under `src/game/rift/` is checkable from Node, no browser:

```bash
node --experimental-strip-types \
  -e 'import("./src/game/rift/validate.ts").then(m => console.log(m.validate()))'
```

`validate()` checks the *tables* — wave composition, enemy stats, augment
ids — the same class of check `neighborhood.ts`'s `validate()` runs, not a
simulated match. A scripted match was run by hand during development (a
bot that moves, autoattacks, and casts on a schedule, driven straight through
`step()`) to confirm a full ten-wave-plus-boss run terminates cleanly in both
directions (win and loss) with no `NaN`, no negative HP leaking through, and
the augment-pick gate correctly holding the next wave back until a pick
resolves. That script was throwaway and was not committed, per the same rule
`GAME.md` §1.2 sets for dev-only content.

Relative imports inside `src/game/rift/` carry explicit `.ts` extensions
(`from "./types.ts"`, not `from "./types"`) specifically so the directory
stays Node-runnable the way `neighborhood.ts` is — Node's ESM loader, unlike
Vite's bundler resolution, requires the extension. `src/os/rift.ts` does not
follow that convention, because it is DOM-only and only ever bundled, exactly
like `src/os/spots.ts`.

## 4. State and storage

Key `jl.rift`, `localStorage`, try/catch-wrapped:

```ts
type Saved = { bestWave: number; bestMs: number; scheme: "wasd" | "click"; calm: boolean };
```

`bestWave`/`bestMs` are a personal best, not a leaderboard — nothing here is
shared, submitted, or comparable to anyone else's run, for the same reason
`TODO.md` refuses one for `spots.map`: "It is a toy on a portfolio, not a
product." `scheme` and `calm` are UI preferences, saved the moment they're
changed rather than only at run end. The live run itself (`RiftState`) is
never persisted — closing the window pauses it in memory (§1), but a full
page reload starts fresh, the same way `jl.win` is deliberately
session-scoped rather than surviving a reload.

## 5. Controls

Two schemes, chosen on the start screen and remembered:

| | WASD + mouse (default) | Click to move |
|---|---|---|
| Move | `W A S D`, held | Click a point; walks there, then stops |
| Aim | Live cursor position | Nearest enemy, automatically |
| Auto-attack | Held on left mouse button | Always on |
| `Q W E R` | Cast toward the aim point | Cast toward the aim point |
| Stop | (release keys) | `S` |

Click-to-move is a deliberate simplification of the textbook MOBA
right-click-to-move / left-click-attack-move split: real click-to-move is
built around a second modifier key newcomers do not already know, and this
scheme exists specifically so *someone who has never played a MOBA* has a
working option. One click, one scheme, always fighting back. `WASD + mouse`
is the default for the reason `CLAUDE.md`'s own controls research says it
should be: direct movement reads better for dodging than any click-to-move
scheme can.

Keys bind to `.rift__frame`, never to `document` — the reason is identical to
`GAME.md` §6's for `spots.map`: a document-level handler would fight the
desktop and the browser's own shortcuts. `Q`/`W`/`E`/`R` are edge-triggered
(consumed once per press via `event.repeat`), not level-triggered, so holding
a key does not spam a cast every frame.

**Touch is not built.** `PRODUCT.md` says visitors are often on a phone, and
`spots.map`'s D-pad is the standing precedent that touch controls are not
optional polish. `rift.exe` does not meet that bar yet: under
`(pointer: coarse)`, the scheme toggle hides (WASD is unreachable) and the
start screen says plainly that the arena wants a keyboard and a pointer.
Tapping still works — it behaves like a click in the click-to-move scheme —
but `Q`/`W`/`E`/`R` have no on-screen buttons. This is the one milestone (§7,
M4) intentionally left short; closing it means an ability D-pad in the
`(pointer: coarse)` register, sized ≥44px, exactly like `spots.map`'s.

## 6. The rendition

No sprites, no tiles, no pixel art — same rule `GAME.md` §5 states for
`spots.map`, for the same reason (`CLAUDE.md`: "If an element could be
guessed from the category alone, it is wrong"). Everything is drawn on two
canvases with flat geometry:

| Thing | Form | Colour |
|---|---|---|
| Arena floor | the field, sampled at rest | the active desk theme's own palette |
| Player | filled disc + facing tick | `--accent-deep` |
| Rusher | outlined triangle | `--ink-muted` |
| Caster | outlined square (filled centre while winding up) | `--ink-muted` / `--ink` |
| Wisp | small open circle | `--ink-faint` |
| The Saddle (boss) | outlined hexagon | `--ink` |
| Player telegraph (R, arming) | dashed capsule/line | `--accent` |
| Enemy telegraph (arming) | dashed line | `--ink` |
| Player bolt / mine | filled circle | `--accent` |
| Enemy projectile | filled circle | `--ink-muted` |

Same two rules `GAME.md` §5 draws out for `spots.map`, carried over
unchanged: **shape separates state, not two greys apart** (rusher vs. caster
vs. wisp vs. boss are four different outlines, never a palette trick), and
**indigo marks exactly one thing** — everything that belongs to the player
(the disc, bolts, mines, the R telegraph) is indigo; everything enemy-owned
stays in the ink family regardless of how dangerous it is. HUD text sitting
directly on the arena reuses `--on-desk` / `--on-desk-dim` / `--on-desk-quiet`
— the tokens `tokens.css` already measured against the field's darkest stop
for exactly this situation — rather than inventing a new contrast pair. The
HUD strip and the boss bar borrow the menubar's own `--veil` /
`backdrop-filter` treatment for the same reason the menubar is translucent:
legible chrome over a busy, theme-varying background. The start/pick/pause/end
screens do not — they take the **opaque bone-panel** material `docs/DESKTOP_DESIGN.md`
reserves for the command palette, its one deliberate non-veil modal-shaped
surface, because these screens play the same role here.

**A real bug caught in review, left here so it isn't reintroduced:** the
panels' CSS declares `display: flex` directly on `.rift__panel`, which — by
CSS origin rules, not specificity — silently overrides the browser's own
`[hidden] { display: none }` and stacks every panel visibly at once
regardless of the `hidden` property JS toggles. The fix is an explicit
`.rift__panel[hidden] { display: none; }` rule sitting right after the base
one. Any new panel-shaped overlay that sets its own `display` needs the same
override or it will silently ignore `hidden`.

## 7. Milestones

- [x] **M0** — Contracts: this file, the `docs/DESKTOP_DESIGN.md`/`GAME.md` amendment
      notes, the `.win--full` window variant.
- [x] **M1** — `sim.ts` core loop: movement, one enemy type, collision, one
      wave, verified at zero frames at rest.
- [x] **M2** — Full `QWER` kit, telegraphed skillshots, three enemy types,
      ten waves, the boss and its three phases.
- [x] **M3** — Leveling, the augment picker (14 augments), run summary,
      `jl.rift`, both control schemes.
- [ ] **M4** — Touch controls (an ability D-pad, ≥44px, `(pointer: coarse)`
      only), and a real-device pass for reduced motion and coarse pointer —
      headless Chromium reports `pointer: fine` and cannot exercise either.

## 8. Verification

```bash
npm run build
node ~/.claude/skills/impeccable/scripts/detect.mjs index.html src/style.css src/tokens.css
node --experimental-strip-types \
  -e 'import("./src/game/rift/validate.ts").then(m => console.log(m.validate()))'
```

Headless, chained in one call per `CLAUDE.md`'s standing warning that the
browse server can restart between separate invocations:

```bash
B=~/.claude/skills/gstack/browse/dist/browse
$B viewport 1440x900
$B goto "http://localhost:5173/?x=$RANDOM"
$B js "document.querySelector('[data-open=rift]').click(); document.querySelector('[data-begin]').click(); 1"
$B screenshot /tmp/rift.png
```

By hand, the checks headless Chromium cannot make (`pointer: fine` always,
`prefers-reduced-motion` cannot be forced):

1. Zero frames at rest — open the window, do nothing, DevTools performance
   panel shows nothing past the opening paint; same again once paused.
2. JS off — the article still reads as a complete document (lede + closing
   paragraphs); the `.rift` mount is absent rather than an empty box.
3. Keyboard only — `WASD`/`QWER` must not scroll the body or reach the desk;
   the first Escape pauses, the second closes.
4. Reduced motion — calm mode holds telegraph opacity flat instead of
   ramping it, and every CSS transition already zeroes via the global
   reduced-motion block; nothing here needs its own JS guard for that part.
5. 390×844 and `(pointer: coarse)` — the touch notice shows, the scheme
   toggle hides, tapping still moves and auto-attacks.
6. A run is genuinely winnable in three to five minutes and is fun to lose,
   too. Nothing above matters if this fails.


## 9. Current Issues (Manually Wrote)

1. Click to move should be a right click not a left click.
2. Auto-attacks are literally auto-attacks, but should add an A click feature
 - An A click is when the user presses A and can see the radius of the range of the character's "auto-attacks"
