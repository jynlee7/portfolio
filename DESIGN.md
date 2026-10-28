# Design

<!-- impeccable:design-schema 1 -->

This is the contract for **the wall at `/`**. The desktop at `/desktop/` is a
different design with its own contract, `docs/DESKTOP_DESIGN.md`; none of its
rules (bevels, 3–5px radii, monospace on measured values) apply here, and none
of these apply there.

On 28 Oct 2026 the user asked for the editorial portfolio that had been at
`/` since that morning to come down: "current portfolio should be under works
so remove all the slop and just say under works but you can check out my
'desktop' have the desktop be 'inside' the walls and there is a small crack
that the user can click". The portfolio is on branch
`archive/portfolio-editorial` exactly as it ran. Its direction is in the
history of this file.

## Direction contract

**THESIS.** The site is being rebuilt and says so in four words. The desktop
is still running inside the wall, and a crack in the plaster is the way in.
It refuses the "coming soon" card, the progress bar and the countdown.

**OWN-WORLD.** Freshly skimmed plaster, still drying: pale pink where it has
dried, brown-pink where it is wet, faint trowel ridges, grit. Warm graphite
ink (`#2b211e`). A pencil (`#3d3432`) for the arrow and the ring around the
crack. The only cool colour anywhere is the desktop's bone-and-indigo field,
seen through the crack.

**STORY.** A visitor reads that the site is under works, sees that the
desktop can still be reached, and goes through the crack. Someone who only
wants the résumé finds it on the sign at the foot of the wall.

**FIRST VIEWPORT.** "Under works." in Tanker at the upper left, the aside
under it, a pencil arrow down to a small crack right of centre, and the sign
(name, résumé, email) along the foot. The crack is the primary action.

**FORM.** A wall. Pinned by the user; not rolled.

## Materials

- **Plaster** (`scripts/wall.mjs`, `#plaster`). One SVG filter over a
  `#e8ccbf` ground: fractal noise thresholded into wet patches of `#c99482`
  behind a crinkled drying front; a stretched noise for burnish; fine grit.
  Over it, a 1400 × 900 tile of trowel ridges (thin arcs lit on top, a pixel
  of shadow under each), and a light gradient falling from the upper left.
  All of it is in CSS pixels, so the texture is the same scale on every
  screen and the wall grows rather than stretches. It scrolls with what is
  written on it.
- **Type.** Tanker (Fontshare) for the notice, at most 6rem, `multiply`, so
  the patches show through the paint. Switzer for the aside and the sign.
  No other faces.
- **The crack** (`scripts/wall.mjs`, `crack()`). Drawn at build time from a
  seeded centreline into a 300 × 130 box: hairline at both ends, open only
  through the middle, and spalled at one point, where a flake has come away.
  Hairlines are filled tapers, not strokes, so they thin to nothing. The upper
  lip shadows the opening; the lower lip catches the light. It scales with
  `--k` (1, 0.8 under 600px, 0.72 under 360px), and the arrow scales with it,
  so the arrow's tip always lands just short of the spall.
- **The pencil ring.** A loop drawn the way a hand closes one, overshooting
  where it started, the way a surveyor rings a crack. It draws on hover and on
  keyboard focus, and it is the crack's focus indicator.

## The desktop behind the wall

The field inside the crack is the desktop's own wallpaper (`/field-lab.svg`,
or whichever the visitor chose there, from `jl.desk`), placed where the lock
screen paints it: `center / cover` of the viewport. Without JavaScript it is
framed on its deepest well instead, so the rings show.

**Going in** (`src/wall/main.ts`). Clicking the crack sets `jl.through`,
then:

1. 0–150 ms: cracks run out from the spall to past the edges of the screen.
2. Three bursts open the hole from the spall, stretched along the crack at
   first: a chip at 80 ms, a hand-sized hole at 230 ms, and from 380 ms the
   wall giving way, accelerating, until the hole is bigger than the screen
   (680 ms). Each burst throws off flat plaster flakes that fall under
   gravity. The hole's edge is faceted, with a rim of gypsum and the wall's
   thickness shadowing the field along it.
3. At 850 ms the page navigates. The lock screen reads `jl.through` and keeps
   its field at rest, so it arrives as the thing already showing.

Back from the desktop restores this page from the bfcache with the wall
mended.

## Rules

- **Every fact comes from `content/portfolio.mjs`.** The sign's name, email
  and résumé path are rendered from it at build time; never type them.
- **Readable with JavaScript off.** The crack is a real link to `/desktop/`,
  the résumé a plain link to the PDF. The script only adds the break, the
  live wallpaper choice, and prefetching `/desktop/` on intent (pointer
  enter, focus, touch).
- **Nothing moves at rest.** No frame is requested until the crack is
  clicked. Under reduced motion the crack is an ordinary link and the ring
  draws without transition.
- **The wall never loads desktop code.** Two Vite entries; the field
  constants it needs are copied, not imported, and
  `scripts/test-portfolio.mjs` asserts no `/src/os/` request on `/`.
- **One way in.** The crack is the only link to `/desktop/` on the page.
- **Touch targets ≥44px.** The crack's link is its whole box (at least
  216 × 94); the sign's links are 44px tall.

## Measured contrast

Measured 28 Oct 2026 against screenshots of the wall with its text hidden, at
1440 × 900, 1920 × 1080 and 390 × 844, on the plaster's darkest 0.1% of
pixels (`rgb(179 133 119)` at worst). WCAG 2.x.

| Pair | Darkest 0.1% | Median |
| --- | --- | --- |
| Ink `#2b211e` (all text) | 4.88:1 | 7.04–7.90:1 |
| Pencil `#3d3432` (focus ring, non-text) | 3.77:1 | 5.43–6.09:1 |

Change a colour or the plaster filter, re-measure, update this table.
