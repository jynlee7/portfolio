# Approved implementation contract — 2 October 2026

The user approved REDESIGN_PLAN.md, implementation/testing agents, Awwwards
personal-portfolio inspiration, and interactive 3D illustrations for each role.
No further design approval is required to execute this direction. Publishing is
not part of this instruction. A new résumé supplies the current source of truth.

## Ownership

Root: content/portfolio.mjs, index.html, src/portfolio/main.ts, vite.config.mjs,
scripts/desktop-docs.mjs, desktop/index.html, documentation, PDF, integration.
Layout agent: scripts/portfolio.mjs and src/portfolio/style.css only.
Scene agent: src/portfolio/scenes.ts, scenes.css, optional scene-*.ts, public/scenes/.
Test agent: scripts/test-portfolio.mjs and evidence in /tmp; read-only other files.

## Content API

Import profile, roles, projects, archiveProjects from ../content/portfolio.mjs
inside scripts/portfolio.mjs. Export renderPortfolio(): string for Vite's static
HTML transform. All text in data is plain text and must be escaped before HTML.
Root shell owns document head/body and <script src="/src/portfolio/main.ts">.
Renderer owns header, main, and footer. It must contain one h1 and skip target
id="main"; section anchors work, experience, about, playground, contact, resume.
Native details use each project id (clinical, bearings, site, chessblitz).

## Scene API

<figure class="scene scene--tennis">
  <div class="scene__mount" data-scene="tennis" role="img" aria-label="Illustrative tennis court and ball">
    <img class="scene__fallback" src="/scenes/tennis.svg" alt="" width="800" height="600" />
  </div>
  <figcaption class="scene__caption">
    <span>Interactive illustration</span>
    <span class="scene__controls">
      <button type="button" data-scene-rotate="left" aria-label="Rotate illustration left">←</button>
      <button type="button" data-scene-reset aria-label="Reset illustration">↺</button>
      <button type="button" data-scene-rotate="right" aria-label="Rotate illustration right">→</button>
    </span>
  </figcaption>
</figure>

Required scene kinds: tennis, knowledge, compute, stadium, protein, transit,
simulation, field. All are clearly labeled illustrations, never product
screenshots or measured datasets. Scene module exports initScenes(): cleanup.
Layout sets figure size/aspect, caption appearance, and --scene-bg if needed.
Scene module owns canvas positioning, input behavior, loading/fallback state,
shared WebGL renderer, disposal, and stopping when idle/offscreen/hidden.

## UI behavior contracts

- Header <button data-menu-toggle aria-controls="portfolio-nav" aria-expanded="false">.
  Nav id portfolio-nav; small screens can collapse via a class set by main.ts.
  Work and résumé stay visible. No-JS navigation remains accessible.
- Project details are native <details id="clinical" class="project-details"> etc.
  Project CTA links use #clinical. main.ts opens ancestors/details, manages focus,
  hashchange, history, and native Back. No hidden mandatory content.
- Main page uses src/portfolio/style.css only plus scenes.css; legacy src/style.css
  and src/tokens.css are desktop-only. Scene assets remain local.
- First viewport: Jayden Lee, Berkeley junior introduction, current SwingVision
  role, résumé CTA, and dimensional tennis scene. Work begins in the first screen
  or its immediate edge on desktop. Readable with JavaScript off.
- Every one of the five new résumé roles has a distinct 3D scene alongside
  organization, title, dates, and meaningful summary.
- Scene controls >=44px, all input methods; visual fallbacks persist without WebGL.
- Direction: cool near-white and dark ink, indigo action, oversized Cabinet
  Grotesk, Switzer body; independent domain colors in artwork; generous editorial
  spacing, asymmetric projects, clean reading flow, tactile lit geometry.
- No copied reference layouts, awards, photos, logos, unknown metrics or URLs.

## Baseline

Pre-existing source archived at /tmp/pw-redesign-baseline-20261002.tgz.
Built baseline at /tmp/pw-redesign-baseline-dist. Baseline build passed before edits:
homepage JS 53.34kB raw / 18.06kB gzip, CSS 30.49kB raw / 7.03kB gzip.
3D was expressly requested after the original plan; Three.js is a justified
lazy-loaded dependency, not a homepage framework migration.
