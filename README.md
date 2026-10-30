# Jayden Lee

My personal website: projects, experience, and an interactive desktop.
Built with TypeScript, CSS, and Vite, with Three.js for interactive illustrations.

[Visit the site](https://jaydenelee.com) · [Explore the desktop](https://jaydenelee.com/desktop/) · [Résumé](https://jaydenelee.com/resume.pdf)

## About

The site has two views:

- **`/`** — a portfolio of projects and experience, with interactive 3D illustrations.
- **`/desktop/`** — a desktop interface with draggable windows, a command palette, and a generated contour wallpaper. Its documents remain readable without JavaScript.

Both views draw their projects, roles, and profile from [`content/portfolio.mjs`](content/portfolio.mjs).

## Run locally

Use Node.js 24 or newer and npm. The build tools import TypeScript directly;
this repo is currently developed with Node.js 25.3.0.

```sh
git clone https://github.com/jynlee7/portfolio.git
cd portfolio
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173) for the homepage or
[localhost:5173/desktop/](http://localhost:5173/desktop/) for the desktop.

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Check TypeScript and build both views into `dist/` |
| `npm run preview` | Serve the production build locally |
| `node scripts/field.mjs` | Regenerate the static contour wallpapers |

## Project structure

```text
content/                Shared portfolio data and written documents
scripts/portfolio.mjs   Homepage markup renderer
scripts/desktop-docs.mjs Desktop document renderer
src/portfolio/          Homepage styles, interactions, and 3D scenes
src/os/                 Desktop interactions and window management
src/field/core.ts       Shared field for static and animated wallpapers
public/                 Résumé, fonts, images, and wallpapers
index.html              Homepage entry
desktop/index.html      Desktop entry
```

Desktop windows move the original articles rather than copying them, keeping
one copy of each document. The static wallpaper and live canvas share the same
field generator; regenerate the wallpapers after changing `src/field/core.ts`.

## Documentation

- [Homepage design](DESIGN.md) and [desktop design](docs/DESKTOP_DESIGN.md)
- [Product context](PRODUCT.md)
- [Planned work](TODO.md)
- [Changelog](CHANGELOG.md)

## License

Code is licensed under [Apache 2.0](LICENSE). The résumé, project write-ups,
and personal details are not covered by the code license.
