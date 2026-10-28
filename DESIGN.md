# Design

<!-- impeccable:design-schema 1 -->

This is the contract for **the portfolio at `/`**. The desktop at `/desktop/`
is a different design with its own contract, `docs/DESKTOP_DESIGN.md`; none of
its rules (bevels, 3–5px radii, monospace on measured values, one authored
motion) apply here, and none of these apply there.

The split was approved on 2 Oct 2026 (`REDESIGN_PLAN.md`,
`docs/PORTFOLIO_IMPLEMENTATION.md`) and shipped on 28 Oct 2026, after the user
called the desktop-as-front-door "cool but very bland" with "a lot of
friction". The desktop is kept, unchanged in spirit, as Jayden's own machine
under the page, which shows itself to a visitor who stays (see "The computer
under the page" below).

## Direction contract

**THESIS.** Jayden's work is visible on arrival; exploration adds depth. No
entry gesture, no restored windows, no interface to learn before the résumé.

**OWN-WORLD.** Cool paper (`#f4f5f0`), ink (`#202320`), one indigo action
colour (`#4338f5`, the same indigo the desktop uses, so the two surfaces read
as one person's). Oversized Cabinet Grotesk for display, Switzer for reading.
Each role and project carries its own lit, three-dimensional illustration in
its own domain colour — tennis, a knowledge graph, a compute rack, a stadium,
a helix, a Berkeley map, branching simulation paths, the contour field.

**STORY.** A recruiter reads the name, the current role, and one sentence;
downloads the résumé or scrolls into the work. An engineer opens "Behind the
build". Somebody who stays twenty seconds finds a computer under the page.

**FIRST VIEWPORT.** Name, a one-sentence introduction, the current role, the
résumé button, and the tennis scene. The work section starts at the edge of
the first screen on a desktop, so the scroll is obvious.

**FORM.** An open editorial page: asymmetric project grid, alternating role
rows, an about block, a contact block. Ordinary scrolling, ordinary anchors.
Nothing on the page links to `/desktop/`.

## Rules

- **Every fact comes from `content/portfolio.mjs`.** The homepage
  (`scripts/portfolio.mjs`) and the desktop's documents
  (`scripts/desktop-docs.mjs`) both compile it into static HTML at build
  time. Never type a role, date, or number into markup.
- **Readable with JavaScript off.** Details are native `<details>`; navigation
  is real anchors; the résumé is a plain link. `src/portfolio/main.ts` only
  enhances: the phone menu, opening a disclosure from its hash, and Back.
- **Illustrations are labelled as illustrations.** Every scene's caption says
  so, and none of them depicts a product screenshot or a measured dataset.
  Each has a static SVG in `public/scenes/` that stays visible when WebGL,
  JavaScript, or motion is unavailable.
- **The 3D costs nothing at rest.** One shared WebGL context renders into 2D
  canvases on demand: on first view, on drag, on a rotate button. No frame is
  requested while nothing moves, offscreen, on a hidden tab, or under reduced
  motion — and under reduced motion Three.js is never downloaded.
- **The homepage never loads desktop code.** Two Vite entries
  (`index.html`, `desktop/index.html`); `scripts/test-portfolio.mjs` asserts
  no `/src/os/` request on `/`.
- **Touch targets ≥44px** for every control, including the scene buttons.

## The computer under the page

`src/portfolio/peek.ts`, `src/portfolio/peek.css`. Added 28 Oct 2026 at the
user's direction: the desktop "would later appear if the user stayed a little
bit longer and it would open up some bits on the screen and you would be able
to enter."

- **When.** After 20 s of the tab actually being visible (`DWELL`; the timer
  pauses on a hidden tab). Once seen in a visit it returns 1.2 s after a
  reload; once closed it stays closed for the visit (`jl.peek`).
- **What.** A corner of the page comes apart in 16 × 8 square bits, each
  turning over to show the desktop's contour field underneath, framed on its
  deepest well. While only bits show there is no shadow: they are holes in
  the page. Then the desktop's own window chrome closes around them — the
  near-black bar, a monospace filename (`field-lab.svg`, the wallpaper it is
  showing), the bone panel and bevel — and it gets a window's shadow. Those
  desktop materials appear nowhere else on the portfolio, so the window reads
  as a piece of the other machine.
- **Going in.** "Go in" turns the whole viewport over the same way, spreading
  from the window, onto the field exactly as the lock screen paints it
  (`center / cover`), then navigates. The lock keeps that field at rest
  instead of replaying its entrance (`jl.through`, one-shot), so there is no
  seam.
- **Phones** (≤600px). A card that tall sits on the résumé button, so it is a
  strip across the bottom: four rows of bits sized to the screen.
- **Motion budget.** This is the portfolio's one authored moment: CSS
  keyframes on transforms, run once, ~750 ms in and ~620 ms going in, zero
  frames at rest. Each bit carries its own perspective; one shared perspective
  turns the far bits into venetian-blind slats. Under reduced motion the
  window is simply there and "Go in" is an ordinary link.
- **It must never block the primary task.** Small, dismissable (✕ or Escape),
  never focus-stealing, announced once through a polite status region.

## Measured contrast

On `--paper` `#f4f5f0` (WCAG 2.x relative luminance, measured 28 Oct 2026):

| Token | Value | Ratio |
| --- | --- | --- |
| `--ink` | `#202320` | 14.49:1 |
| `--muted` | `#60655e` | 5.44:1 |
| `--accent` as text | `#4338f5` | 6.14:1 |
| White on `--accent` (primary button) | `#ffffff` | 6.72:1 |

The peek's desktop materials, measured the same day:

| Pair | Ratio |
| --- | --- |
| `#f3f1ec` on `#22212a` (title) | 14.1:1 |
| `#a5a1b0` on `#22212a` (meta) | 6.3:1 |
| `#1b1a20` on `#eceae4` (text) | 15.1:1 |
| `#ffffff` on `#4338f5` (Go in) | 6.72:1 |

Change a colour, re-measure, update this table.
