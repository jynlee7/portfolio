# TODO

## Needs Jayden

Cannot be done without him. Do not invent substitutes.

### 1. Two project screenshots — the most visible gap

Both projects render a striped placeholder well instead of an image. Each one
now has its own document — `doc-clinical-shot` and `doc-chessblitz-shot`, the
`screenshot.png` listed in each folder — so the well is a file that reads "not
yet" in its folder rather than a gap inside the writeup.

- **Clinical Intervention Simulator** — 21:9. The Streamlit dashboard, or the
  Tableau view.
- **ChessBlitz** — 16:10. The teacher classroom dashboard.

Drop the file in `public/`, then in `index.html` replace:

```html
<div class="shot shot--wide" data-slot="screenshot">
  <span class="shot__label">Screenshot · 16:10</span>
</div>
```

with:

```html
<img class="shot shot--wide" src="/chessblitz.png"
     alt="ChessBlitz teacher dashboard showing a classroom roster" />
```

The featured project uses `class="shot"` (21:9); the second uses
`class="shot shot--wide"` (16:10). Crop to the stated ratio or it letterboxes.

### 2. Per-repo Source URLs

All four `data-slot="project-repo"` links point at `github.com/jynlee7`, the
profile, because the individual repo URLs are unknown. Someone clicking
"Source" expects to land on code.

Four occurrences in `index.html`, in two pairs — each project carries the URL
twice, once as the `source` alias row in its folder listing and once as the
`Source` row in its `readme.md`. That is the one place on this site where a
fact is written twice: a readme without a link to its code is a worse readme,
and a folder whose listing omits the source is a worse folder. Change them
together, per project.

### 3. A third project

The user said "three projects not yet." Two are in. A third would need a
`doc--folder` article with its `.filelist`, the `doc-*-readme` and
`doc-*-shot` articles ordered directly beneath it, a desktop icon, a dock
item, and a `Work` menu entry.

### 4. The places in `spots.map` — blocking

**This is the one that stops the game shipping.** `content/spots.md` is in the
repo with a heading, a draft band, and zero entries, because every place in it
is a fact about Jayden and nothing on this site invents those. Until he writes
it, the map draws vacant storefronts and says so.

The format is in `GAME.md` §3. Per place: a `##` line with the name, one short
line naming the dish, then a sentence or two about it. No coordinates — entries
fill the storefronts in the order they are written. Twelve or so is the size the
map is drawn for; fewer is fine.

**Do not write this list for him.**

### 5. Any more tools for the list in `about.txt`

The tools ship as one `Tools` row in `about.txt`'s spec table: Claude, Stitch,
Gemini, VS Code, Git — the five Jayden named. If there are others he works in
daily, they go in that row and nowhere else.

They previously had their own floating tray above the dock, with an engraved
mark per tool. It was removed: a tool list is the most category-generic thing
a portfolio can show, it cannot be guessed which of Git or VS Code
differentiates anyone, and as chrome it ended up louder than the dock while
being the one thing on the desk that could not be clicked. The engraved marks
are in git history if the tray is ever wanted back.

### 6. Phone number

On the résumé, deliberately not on the page. Add it only if he wants recruiters
calling directly.

---

## Can be done without him

### Open Graph image

No unfurl card, so pasting the link into Slack or LinkedIn shows plain text.
Needs a 1200×630 image plus `og:` / `twitter:` meta tags. The wallpaper field
with the JL mark would be the obvious composition.

### Verify the two paths headless cannot reach

Both are implemented and code-reviewed but never actually triggered, because
headless Chromium reports `pointer: fine` and no motion preference:

- `prefers-reduced-motion: reduce` — the live field should never start, the
  dot's emitted rings should vanish, and the lock field should appear fully
  resolved rather than animating in.
- Touch / coarse pointer — the live field is off, dock magnification is off,
  and icons stay in the fixed grid rather than becoming draggable.

Worth ten minutes on a real phone and with the OS setting toggled. This now also
covers `spots.map`, where the walker should jump between cells rather than
sliding, and every storefront must stay tappable at 44px in the mobile sheet.

### Confirm the résumé window previews inline

`<object data="/resume.pdf">` is only ever exercised as its fallback in
headless. Open `resume.pdf` from the dock in a real browser and confirm the PDF
renders in the window rather than showing "Your browser won't preview PDFs
inline."

---

## Housekeeping

- **`public/resume.pdf` is a manual copy** of `~/berk/jl26__ML_.pdf`, taken
  24 Jul 2026. It does not sync. Re-copy whenever the original changes, and
  update the `181 KB` figure in the résumé document's `data-meta` and
  `.pdf__meta` if the size moves.
- **`CHANGELOG.md` and `README.md`** were not reviewed this session and may
  still describe the old scroll-stack design.

---

## Deliberately not done

**Deployment.** No Vercel config, no domain, no analytics. The user asked to
stay local. Do not add it unprompted.

**A leaderboard or a share string for `spots.map`.** It is a toy on a
portfolio, not a product. Nothing about it should ask for a second visit it
has not earned.

**Icon dragging on mobile.** The home-screen grid is fixed on purpose: a layout
a stray thumb can smear out of alignment is worse than one that cannot move.
Revisit only if asked.
