# Changelog

All notable changes to this site are recorded here.

The format follows [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions stay in the `0.x` range until the site is deployed publicly; the first
live deploy is `1.0.0`.

`0.1.0` and `0.2.0` predate version control and are reconstructed from file
timestamps, so they carry no compare links. Tagged history starts at `0.3.0`.

## [Unreleased]

Everything here is tracked in `REPLACE.md` and blocked on assets or decisions
rather than on code.

### Added

- Screenshots for the Clinical Intervention Simulator (21:9) and ChessBlitz
  (16:10) project documents, replacing the striped placeholder wells.
- An Open Graph image, so pasting the link into Slack or LinkedIn unfurls to a
  card instead of plain text.
- A third project document. The layout already supports it.

### Changed

- Narrow both **Source** links from the `github.com/jynlee7` profile to the
  individual repositories, so a visitor who clicks lands on the code.

## [0.3.0] - 2026-07-25

The wallpaper became generated art rather than a shipped image, and the window
manager learned to behave like one.

### Added

- A contour-map wallpaper generated from a single shared field module
  (`src/field/core.ts`), in three themes — lab, slate, and blueprint.
- Deep links. `/#resume` opens the résumé window on load, so the PDF can be
  linked straight from an email signature or an application form.
- Running-application indicators in the dock, driven by open window state.
- The contour field now deforms under the pointer on the lock screen as well as
  the desktop, so the effect is visible in the first viewport.

### Changed

- The wallpaper now paints as static SVG before JavaScript runs, and stays
  static under `prefers-reduced-motion`. The live canvas draws the same field
  from the same module, so the two cannot drift apart.
- Opening a document moves its `<article>` into the window instead of cloning
  it, so every fact exists exactly once in the page.

## 0.2.0 - 2026-07-24

Replaced the scrolling page with a desktop the visitor operates.

### Added

- A desktop metaphor: lock screen, menu bar with a live clock, dock, and
  double-clickable desktop icons that open documents as draggable windows.
- Keyboard control for windows, and a visible skip link to the document shelf.
- A hand-drawn icon sprite — 2px strokes on a 32-unit grid, indigo reserved for
  the one part of each object that identifies it — so the folder, the page, and
  the plot read as the same machine.
- A weather widget on the desktop.

### Changed

- The desktop is now a progressive enhancement. The stylesheet renders every
  document as a plain vertical page unless a script adds the `js` class, so a
  script failure costs the visitor the metaphor, never the content.

## 0.1.0 - 2026-07-24

First working portfolio, built from the résumé of record.

### Added

- The site itself: name, what he builds, and two controls — a filled indigo
  résumé button and a quiet email link — inside the first viewport.
- Five roles and two projects, every one real and drawn from `jl26__ML_.pdf`.
- The résumé PDF as a first-class destination at `/resume.pdf`.
- A Vite + TypeScript build, a design token layer, and a favicon.
- `DESIGN.md`, `PRODUCT.md`, and `REPLACE.md` as the written record of the
  direction, the audience, and what is still missing.

[Unreleased]: https://github.com/jynlee7/portfolio/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/jynlee7/portfolio/releases/tag/v0.3.0
