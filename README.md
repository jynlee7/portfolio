# portfolio

Personal site for Jayden Lee — a desktop the visitor operates rather than a page
they scroll. Lock screen, menu bar, dock, and documents that open as draggable
windows, over a contour field that deforms under the pointer.

Static site. Vite and TypeScript, no framework, no runtime dependencies.

## Running it

```sh
npm install
npm run dev      # vite dev server
npm run build    # tsc, then a production build into dist/
npm run preview  # serve the built output
```

Node 20 or newer.

## How it fits together

```
index.html        every document, as plain semantic HTML
src/main.ts       boots the desktop and handles /#deeplinks
src/os/           lock screen, menu bar, dock, window manager, widgets
src/field/core.ts the contour field — one module, two renderers
src/style.css     all styling; src/tokens.css holds the design tokens
scripts/field.mjs renders the field to static SVG wallpaper
public/           résumé PDF, wallpapers, favicon
```

Two decisions worth knowing before changing anything:

**The desktop is an enhancement.** Documents live in `index.html` as ordinary
articles. A script in the `<head>` adds a `js` class, and only then does the
stylesheet arrange them into a desktop. If the script fails, the visitor gets a
plain vertical page with every fact intact — they lose the metaphor, never the
content.

**Windows move the article, they don't clone it.** Opening a document relocates
its `<article>` into the window frame and closing puts it back, so each fact
exists exactly once in the DOM and the window can't drift from the fallback.

The wallpaper follows the same rule: `scripts/field.mjs` and the live canvas
both draw from `src/field/core.ts`, so the static SVG that paints before
JavaScript runs matches the animated one. Regenerate with `node scripts/field.mjs`
after changing the field — it's deterministic, so identical input gives
identical bytes.

## Project docs

- [`CHANGELOG.md`](CHANGELOG.md) — version history
- [`DESIGN.md`](DESIGN.md) — the visual direction and its constraints
- [`PRODUCT.md`](PRODUCT.md) — audience, principles, and the evidence on record
- [`REPLACE.md`](REPLACE.md) — what's still placeholder and how to swap it

## License

[Apache 2.0](LICENSE). The code is reusable; the résumé, project write-ups, and
personal details in `index.html` and `public/` are not.
