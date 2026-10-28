# TODO

## Read first — 28 Oct 2026

The homepage is now the portfolio (`/`), and the desktop moved to `/desktop/`.
Much of this file was written when `index.html` *was* the desktop:

- Anything below that says "in `index.html`" about the lock, menubar, dock,
  folders, windows or games now means **`desktop/index.html`**.
- **Item 1 (screenshots) has changed shape.** The striped screenshot wells are
  gone: the desktop's project documents are generated from
  `content/portfolio.mjs` by `scripts/desktop-docs.mjs`, and the portfolio
  uses labelled illustrations. Real screenshots would still beat both. They
  would go into `content/portfolio.mjs` as a field, rendered by both scripts.
- **The résumé note under Housekeeping is superseded.** `public/resume.pdf` is
  now a copy of `~/Downloads/resumes/Lee_Jayden_Resume_10202026.pdf`. Its size
  is read at build time, and every fact on both surfaces, graduation date
  included, lives once in `content/portfolio.mjs`.

### Open on the portfolio

- [ ] **Ship it.** Production still serves the desktop at `/` until this is
      deployed. Deploys run `vercel --prod` from the working tree (see Live),
      so deploy from a clean checkout of the merged `main`, not from a dirty
      tree.
- [ ] **Three.js weight.** 737 kB raw / 187 kB gzip, fetched as soon as the
      hero scene is on screen (never under reduced motion, never on `/desktop/`).
      Measured, not optimised. If load time matters more than the hero spin,
      defer the import to first interaction or `requestIdleCallback`.
- [ ] **Real-device pass on a phone.** Scenes take `touch-action: pan-y` and
      capture only horizontal drags, so vertical scroll should never stick on a
      scene. `scripts/test-portfolio.mjs` emulates touch and reduced motion; a
      thumb has not tried it.
- [ ] **Open Graph image** (below) should now be a portfolio composition, not
      the desktop's field.
- [ ] **Tune the peek's 20 seconds with Jayden.** `DWELL` in
      `src/portfolio/peek.ts`. It is the only way into the desktop from `/`
      now — the Playground section and the "Explore the desktop" link came
      out on 28 Oct 2026 so the desktop is found, not advertised. If he wants
      an always-there door back, the old section is in git history
      (`4f8c1f2`, `scripts/portfolio.mjs`).
- [ ] **Watch the peek on a real phone.** The strip sits at the bottom of the
      screen; check it never covers the résumé button on a short phone held
      at the top of the page, and that the bits turn over smoothly.
- [ ] **The menubar's way home on phones.** Below 400px the brand menu shows
      only its JL mark so that "Portfolio" and the clock fit. Revisit if the
      bar gains another item.


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

### 2. Per-project URLs — done for two of three, 12 Aug 2026

The Aug 2026 ML résumé publishes real links for two of the three projects, so
they replaced the `github.com/jynlee7` profile placeholders and the
`data-slot="project-repo"` markers came off with them:

- **clinical-sim** — the Deepnote Streamlit app. Its row is labelled `App`, not
  `Source`, because it is the running thing and not the code. The URL keeps the
  `utm_content` param it was published with; it is untested without it.
- **chessblitz** — `gitlab.com/devahschaefers/chessblitz`. Note the namespace
  is a collaborator's, not Jayden's, which is correct and worth not "fixing".

If the clinical-sim code ever goes public it earns a second row; one is not
missing today.

### 3. A repo URL for `this-site` — still open

The last placeholder. `doc-site`'s `Source` row still points at
`github.com/jynlee7`, the profile, and it is the most conspicuous of the three:
the writeup describes a repository the reader is invited to audit, and the link
does not go to it. The résumé does not help here — it lists the site
(`jaydenelee.com`), not its source.

If the repo is private, say so in that row instead of linking the profile.

### 4. principles.txt is hidden until you write it — blocking that document

**Removed from production on 25 Aug 2026**, because `content/principles.md` is
still the scaffold it shipped as. What was live on `jaydenelee.com` for
nineteen days, under Jayden's name, was:

> Replace this lede with two or three sentences on what you actually believe
> about building software.

…plus two `## Replace this with a principle` headings and a WORKFLOW section
explaining to Jayden how to edit the file. A document that tells a hiring
manager how to write itself is worse than no document, so the page no longer
has one.

Nothing was deleted. The prose file, the `@doc principles` marker in
`index.html`, and the window width in `src/os/windows.ts` are all untouched.
Three commented-out lines hold the door open, each marked with this date:

- `vite.config.mjs` — the `principles` entry in `WRITTEN`
- `index.html` — the desktop icon
- `index.html` — the `Principles…` item in the Jayden Lee menu

Uncomment all three and it is back, in the palette too, since that index is
read from the DOM. **Do not write his principles for him** — the format guide
is in the scaffold, and it is a good one.

### 5. The places in `spots.map` — blocking

**This is the one that stops the game shipping.** `content/spots.md` is in the
repo with a heading, a draft band, and zero entries, because every place in it
is a fact about Jayden and nothing on this site invents those. Until he writes
it, the map draws vacant storefronts and says so.

The format is in `GAME.md` §3. Per place: a `##` line with the name, one short
line naming the dish, then a sentence or two about it. No coordinates — entries
fill the storefronts in the order they are written. Twelve or so is the size the
map is drawn for; fewer is fine.

**Do not write this list for him.**

### 6. Any more tools for the list in `about.txt`

`about.txt` now carries the résumé's Skills section as four spec rows —
`Languages`, `Modeling`, `Toolchain`, `Speaks`. What it does *not* carry is the
list of tools Jayden works **in**: Claude, Stitch, Gemini, VS Code, Git, named
on 26 Jul 2026. That is a `Tools` row and a different list; see PRODUCT.md. If
he wants it back, and if there are others he uses daily, they go in that one
row and nowhere else.

They previously had their own floating tray above the dock, with an engraved
mark per tool. It was removed: a tool list is the most category-generic thing
a portfolio can show, it cannot be guessed which of Git or VS Code
differentiates anyone, and as chrome it ended up louder than the dock while
being the one thing on the desk that could not be clicked. The engraved marks
are in git history if the tray is ever wanted back.

### 7. Phone number

On the résumé, deliberately not on the page. Add it only if he wants recruiters
calling directly. Note that the résumé is now crawlable at
`jaydenelee.com/resume.pdf`, so the number is public either way — see "Live".

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

### `rift.exe` — touch controls and a real-device pass

Added this session at the user's request: a fullscreen skirmish, full contract
in `RIFT.md`. Playable end to end on keyboard + mouse (both control schemes),
but two things are intentionally short of shippable:

- **Touch controls (M4 in `RIFT.md` §7).** `(pointer: coarse)` currently shows
  an honest notice instead of a keyboard, and click-to-move degrades to
  something playable via tap, but `Q`/`W`/`E`/`R` have no on-screen buttons.
  Needs an ability D-pad sized like `spots.map`'s, `≥44px`, coarse-pointer only.
- **A real-device pass.** Same standing limitation as everywhere else on this
  page: headless Chromium reports `pointer: fine` and cannot force
  `prefers-reduced-motion`, so calm mode (telegraph opacity held flat instead
  of ramping) has only been verified by reading the code, not by toggling the
  OS setting on a real device.

Also worth Jayden's own hands-on pass rather than more scripted testing:
**balance.** A player who never dodges and never fights back dies to wave 1's
three rushers in a few seconds — expected, since standing still is not how
the game is meant to be played — but nobody has played it end to end the way
a real visitor would (moving, dodging telegraphs, actually casting). The wave
table, enemy stats, and augment multipliers in `src/game/rift/units.ts`,
`waves.ts`, and `sim.ts`'s `applyAugment` are a first pass, not a tuned one.

### Confirm the résumé window previews inline

`<object data="/resume.pdf">` is only ever exercised as its fallback in
headless. Open `resume.pdf` from the dock in a real browser and confirm the PDF
renders in the window rather than showing "Your browser won't preview PDFs
inline."

---

## Housekeeping

- **`public/resume.pdf` is a manual copy** of a PDF at the repo root — as of
  19 Aug 2026, `jl27.pdf`. It does not sync. Re-copy whenever the original
  changes, and update the `185 KB` figure in the résumé document's `data-meta`
  and `.pdf__meta` if the size moves. (`jl27.pdf` is 189,455 bytes and one
  page, so both figures carried over from `jl26.pdf` unchanged.) The expected
  graduation date is written in two places in `index.html` (`about.txt`'s spec
  table and `experience.log`'s education block) and both must move together; it
  came out of the `Now` widget on 19 Aug 2026.

### The shipped PDF and the page disagree about the graduation year

**Open, and deliberate.** Extracting the text of both PDFs on 19 Aug 2026:

- `jl26.pdf` (12 Aug) — graduation **May 2029**, LinkedIn href
  `linkedin.com/in/jynlee7/`, which is dead.
- `jl27.pdf` (19 Aug, now shipping as `public/resume.pdf`) — LinkedIn href
  fixed to `linkedin.com/in/jaydenelee/`, graduation **May 2028**.
- The LaTeX Jayden supplied on 19 Aug has **May 2029 *and* the fixed href**, so
  it matches neither compiled PDF.

Jayden chose `jl27.pdf` for the live link and **May 2029 for the page**, so the
site currently says a reader can download a résumé that contradicts it: the
`about.txt` spec table and `experience.log` both read May 2029, and the PDF one
click away reads May 2028. This is the one inconsistency on the page a hiring
manager can find without leaving it.

The fix is one recompile, not a site edit: build the current `.tex` (2029 +
fixed href), copy it over `public/resume.pdf`, and this entry goes away. Do not
"resolve" it by moving the page to 2028 — 2029 is what Jayden's own source
says.
- **The résumé LaTeX still *prints* a stale LinkedIn handle.** The link target
  is now correct — `\href{https://linkedin.com/in/jaydenelee/}` — but the
  underlined text a reader sees, and retypes, is still
  `linkedin.com/in/jynlee7/`. Half-fixed is worse than either state: the PDF
  clicks through fine and the printed copy does not. Change the display text in
  the `.tex` header to match the href.
- **`jl26.pdf` sits untracked at the repo root** and is the source of record.
  Either commit it or move it out; a résumé that only exists in one working
  copy is one `git clean` from gone.
- **The status line no longer names a year.** It reads "Open to internships",
  because "2026" went stale in the middle of 2026. If Jayden wants the cycle
  named, it is one word in `.nameplate__status` — and a date to re-check.
- **`CHANGELOG.md` and `README.md`** were not reviewed this session and may
  still describe the old scroll-stack design.

---

## Live

**Shipped to production 25 Aug 2026.** `https://jaydenelee.com` serves the
site, and the canonical URL is the apex with no redirect hop.

- [x] **Deployed to Vercel**, project `pw` under `jynlee7s-projects`. Deploys
      run from the working tree with `vercel --prod`, not from a git push, so
      **what is live is whatever was on disk at deploy time** — not necessarily
      what is committed. Check `git status` before shipping.
- [x] **DNS is answering.** Apex `A` → `216.198.79.1`, `www` → Vercel's
      `vercel-dns-017` CNAME, on Squarespace nameservers. The parked
      `TXT "v=spf1 -all"` was left alone.
- [x] **Apex is canonical, 25 Aug 2026.** It was the wrong way round until
      then: `jaydenelee.com` 308'd to `www`, while the résumé prints the apex.
      Now `www.jaydenelee.com` 308s to `jaydenelee.com` and the apex answers
      200 directly. Set through the project-domains API, since
      `vercel domains` has no redirect flag. If it ever needs flipping again,
      **clear the existing redirect before adding the new one** or the two
      hostnames point at each other and the domain goes down.
- [x] **The principles.txt scaffold is off production** — see the entry under
      "Needs Jayden". It was live for nineteen days.
- [ ] **Decide what is in `public/resume.pdf`.** A real domain makes it
      crawlable. If it carries a phone number or home address, ship a scrubbed
      public copy and keep the full one for direct sends. It currently carries
      the phone number.
- [ ] **`spots.map` still ships its draft band**, by decision on 25 Aug 2026: an
      empty map with vacant storefronts is a working feature that says so,
      which is not the same failure as template text. It goes away when
      `content/spots.md` is written.

---

## Deliberately not done

**Analytics.** Still not wanted. Deployment is no longer in this list — see
"Going live" above.

**A leaderboard or a share string for `spots.map` — or for `rift.exe`.** Same
reasoning both times: these are toys on a portfolio, not a product, and
`rift.exe`'s "best" is a personal best saved locally, never submitted or
compared to anyone else's. Nothing about either game should ask for a second
visit it has not earned.

**Icon dragging on mobile.** The home-screen grid is fixed on purpose: a layout
a stray thumb can smear out of alignment is worse than one that cannot move.
Revisit only if asked.

<!-- handoff:start:state -->
## Handoff state — 28 Oct 2026

Committed on `feature/portfolio-homepage` and opened as a PR against `main`:
rift.exe and the palette/status modules (previously uncommitted on
`feature/rift-exe`), the portfolio homepage with the desktop moved to
`/desktop/`, and the docs for the split. `npm run build` passes, the
Impeccable detector is clean, and `scripts/test-portfolio.mjs` passes 18/18
against `vite preview`.

Left **uncommitted on purpose**: `content/principles.md`, which carries
Jayden's own unfinished edit ("I like") to a document that is off the page.
<!-- handoff:end:state -->

<!-- handoff:start:next-actions -->
## Handoff next actions — 28 Oct 2026

1. **Wire or disclaim `palette.ts`/`status.ts`.** Still true: finished,
   committed, and not called from `src/main.ts`; `desktop/index.html` has no
   `#os-say` element or palette menu item. See the note in `CLAUDE.md`.
2. **Deploy after merge**, from a clean checkout. See "Open on the portfolio".
<!-- handoff:end:next-actions -->

<!-- handoff:start:not-done -->
## Handoff — deliberately left undone, 28 Oct 2026

The portfolio's copy and illustrations were approved on 2 Oct 2026 and are
shipped as approved; this pass fixed defects (rotate controls that never
appeared, the desktop's missing way home on phones, deep links that landed
behind the lock, copy citing a role no longer on the résumé) rather than
redesigning. The palette wiring above is still unexplained rather than
scoped out.
<!-- handoff:end:not-done -->
