# TODO

## Needs Jayden

Cannot be done without him. Do not invent substitutes.

### 1. Two project screenshots — the most visible gap

Both projects render a striped placeholder well instead of an image.

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

Both `data-slot="project-repo"` links point at `github.com/jynlee7`, the
profile, because the individual repo URLs are unknown. Someone clicking
"Source" expects to land on code. Two occurrences in `index.html`.

### 3. A third project

The user said "three projects not yet." Two are in. A third would need a
`doc-*` article, a desktop icon, a dock item, and a `Work` menu entry.

### 4. Real places for `dinner.run` — optional

The game is finished and complete without this. Blocks are grid references
(`A1`–`H6`) because nothing on this site invents facts about Jayden, and a
board full of made-up restaurant names would be exactly that.

If he wants to name them, a list of real places he has actually eaten — one per
line, best to worst is not needed, just the names — can be dropped into
`content/spots.md` and wired through the `WRITTEN` map in `vite.config.mjs` the
way `content/principles.md` already is. The reveal would then name the block
instead of only numbering it. **Do not write this list for him.**

### 5. Phone number

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
covers `dinner.run`'s reveal, which should skip the crossfade and show the true
map immediately under reduced motion.

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
- **Delete `REPLACE.md`.** Superseded by this file and actively misleading: it
  documents `.project__well` and a `.pair` grid that no longer exist.
- **`CHANGELOG.md` and `README.md`** were not reviewed this session and may
  still describe the old scroll-stack design.

---

## Deliberately not done

**Deployment.** No Vercel config, no domain, no analytics. The user asked to
stay local. Do not add it unprompted.

**A leaderboard or a share string for `dinner.run`.** It is a toy on a
portfolio, not a product. Nothing about it should ask for a second visit it
has not earned.

**Icon dragging on mobile.** The home-screen grid is fixed on purpose: a layout
a stray thumb can smear out of alignment is worse than one that cannot move.
Revisit only if asked.
