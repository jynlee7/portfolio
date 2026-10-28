import { profile } from "../content/portfolio.mjs";

/**
 * The wall at `/`, rendered into index.html at its `<!-- @wall -->` marker.
 *
 * Everything static is decided here, at build time, so the page reads the
 * same with JavaScript off: the plaster, the notice, the crack and the field
 * showing through it, and the sign. src/wall/main.ts only adds the break:
 * it reads the crack's origin and axis and the field's placement back out of
 * this markup, so the geometry lives in exactly one place.
 */

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

/** Seeded, so every build draws the same wall. */
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r = (n) => Math.round(n * 10) / 10;
const line = (points) => `M${points.map(([x, y]) => `${r(x)} ${r(y)}`).join("L")}`;
const ring = (points) => `${line(points)}Z`;

/**
 * The crack, in the CSS pixels of a 300 × 130 box. It runs up and to the
 * right: hairline at both ends, open only through the middle, where it is
 * wide enough to see through, and spalled at one point, where a flake of
 * plaster has come away and left the widest window.
 */
const BOX = { w: 300, h: 130 };
const HAIR_LEFT = [[6, 114], [19, 106], [29, 108], [42, 98], [55, 94], [64, 85], [78, 81]];
const OPEN = [[78, 81], [90, 75], [102, 72], [112, 65], [126, 63], [139, 58], [151, 59], [163, 51], [177, 48], [190, 41], [204, 39]];
/** Half-widths along OPEN, px. Widest just past the spall, as a crack is. */
const HALF = [0.6, 1.6, 2.9, 4.3, 5.2, 4.8, 4, 3.1, 2.2, 1.2, 0.5];
const HAIR_RIGHT = [[204, 39], [216, 33], [229, 35], [241, 27], [257, 23], [269, 16], [294, 9]];
const BRANCHES = [
  [[151, 59], [157, 67], [166, 70], [170, 80], [183, 85], [190, 94]],
  [[102, 72], [99, 81], [106, 89]],
];
/** Where the flake came away, and where the hole opens from going in. */
const SPALL = { x: 119, y: 66 };

/** A ribbon along `points`, `from` px wide at its start and `to` at its end,
 *  each lip jittered on its own so the two edges never run parallel. */
function ribbon(points, widths, rand, wander = 0) {
  const path = [];
  for (let i = 0; i < points.length; i++) {
    path.push(points[i]);
    // Hairlines get a midpoint knocked off the straight, so a 12px segment
    // does not read as ruled.
    if (wander && i < points.length - 1) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const k = (rand() - 0.5) * wander;
      path.push([(x0 + x1) / 2 - ((y1 - y0) / len) * k, (y0 + y1) / 2 + ((x1 - x0) / len) * k]);
    }
  }
  const upper = [];
  const lower = [];
  path.forEach(([x, y], i) => {
    const [px, py] = path[Math.max(0, i - 1)];
    const [nx, ny] = path[Math.min(path.length - 1, i + 1)];
    const len = Math.hypot(nx - px, ny - py);
    const ux = -(ny - py) / len;
    const uy = (nx - px) / len;
    const half = widths(i / (path.length - 1));
    const a = half * (0.7 + rand() * 0.6);
    const b = half * (0.7 + rand() * 0.6);
    upper.push([x + ux * a, y + uy * a]);
    lower.push([x - ux * b, y - uy * b]);
  });
  return { outline: [...upper, ...lower.slice().reverse()], lower };
}

function crack() {
  const rand = random(28102026);
  const slit = ribbon(OPEN, (t) => HALF[Math.round(t * (HALF.length - 1))], rand);

  const spall = [];
  for (let i = 0; i < 11; i++) {
    const angle = (i / 11) * Math.PI * 2 + rand() * 0.35;
    const radius = 10 + rand() * 5;
    spall.push([SPALL.x + Math.cos(angle) * radius * 1.4, SPALL.y + Math.sin(angle) * radius * 0.78]);
  }

  // Hairlines are drawn, not stroked: a sliver that tapers to nothing at its
  // far end, which a stroke of any width cannot do.
  const hairs = [
    ribbon(HAIR_LEFT, (t) => 0.12 + t * 0.55, rand, 2.4),
    ribbon(HAIR_RIGHT, (t) => 0.67 - t * 0.55, rand, 2.4),
    ...BRANCHES.map((branch) => ribbon(branch, (t) => 0.5 - t * 0.42, rand, 2)),
  ].map(({ outline }) => ring(outline)).join("");

  // The lit lip is the lower edge (light from above), drawn a hair below it.
  const lip = slit.lower.map(([x, y]) => [x, y + 0.7]);
  return { hole: `${ring(slit.outline)}${ring(spall)}`, lip: line(lip), hairs };
}

/** A pencil loop around the crack, drawn the way a hand closes one: it
 *  overshoots where it started. Shown on hover and keyboard focus. */
function loop() {
  const rand = random(4);
  const points = [];
  const steps = 40;
  const tilt = -0.32;
  for (let i = 0; i <= steps; i++) {
    const t = -0.9 + (i / steps) * (Math.PI * 2 + 0.55);
    const wobble = 1 + (rand() - 0.5) * 0.05 + (i / steps) * 0.07;
    const ex = Math.cos(t) * 112 * wobble;
    const ey = Math.sin(t) * 34 * wobble;
    points.push([150 + ex * Math.cos(tilt) - ey * Math.sin(tilt), 60 + ex * Math.sin(tilt) + ey * Math.cos(tilt)]);
  }
  return line(points);
}

/**
 * Trowel marks: the ridges a steel float leaves where one sweep overlaps the
 * last, as thin arcs. Drawn into one TILE, with any arc that crosses its
 * edge drawn again on the far side so the tile repeats without a seam. Each
 * ridge is lit on top; the pattern reuses the same arcs, a pixel lower and
 * dark, for the shadow under it.
 */
const TILE = { w: 1400, h: 900 };
function trowel() {
  const rand = random(1907);
  let ridges = "";
  for (let i = 0; i < 64; i++) {
    const cx = rand() * TILE.w;
    const cy = rand() * TILE.h;
    const radius = 260 + rand() * 520;
    const start = rand() * Math.PI * 2;
    const span = 0.2 + rand() * 0.38;
    const x0 = cx + Math.cos(start) * radius;
    const y0 = cy + Math.sin(start) * radius;
    const x1 = cx + Math.cos(start + span) * radius;
    const y1 = cy + Math.sin(start + span) * radius;
    // How far a short arc bows away from its chord, plus a stroke's width.
    const bow = radius * (1 - Math.cos(span / 2)) + 4;
    const style = `stroke-opacity="${r(0.1 + rand() * 0.16)}" stroke-width="${r(0.8 + rand() * 1.2)}"`;
    for (const dx of [-TILE.w, 0, TILE.w]) {
      for (const dy of [-TILE.h, 0, TILE.h]) {
        if (Math.max(x0, x1) + dx < -bow || Math.min(x0, x1) + dx > TILE.w + bow) continue;
        if (Math.max(y0, y1) + dy < -bow || Math.min(y0, y1) + dy > TILE.h + bow) continue;
        ridges += `<path d="M${r(x0 + dx)} ${r(y0 + dy)}A${r(radius)} ${r(radius)} 0 0 1 ${r(x1 + dx)} ${r(y1 + dy)}" ${style}/>`;
      }
    }
  }
  return ridges;
}

/** The field through the crack: its deepest well — (670, 600) of the
 *  1600 × 1000 frame — sits just below and left of the spall at FIELD_SCALE,
 *  so its innermost rings arc across the window. Going in, src/wall/main.ts
 *  eases it from here to where the lock screen paints it (`center / cover`
 *  of the viewport). */
const FIELD_SCALE = 1.15;
const WELL = { x: 670, y: 600 };
const WELL_AT = { x: SPALL.x - 19, y: SPALL.y + 15 };

export function renderWall() {
  const { hole, lip, hairs } = crack();
  const fx = r(WELL_AT.x - WELL.x * FIELD_SCALE);
  const fy = r(WELL_AT.y - WELL.y * FIELD_SCALE);
  const mail = esc(profile.email);
  // The way the crack runs, end to end, for the hole to open along.
  const [x0, y0] = OPEN[0];
  const [x1, y1] = OPEN[OPEN.length - 1];
  const axis = Math.atan2(y1 - y0, x1 - x0).toFixed(3);

  return `<svg class="plaster" aria-hidden="true" focusable="false">
      <defs>
        <filter id="plaster" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
          <!-- Drying: what is still wet is darker, behind a crinkled front. -->
          <feTurbulence type="fractalNoise" baseFrequency="0.0016 0.0022" numOctaves="5" seed="11" result="drying"/>
          <feColorMatrix in="drying" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  5.2 0 0 0 -2.36" result="drying-a"/>
          <feComponentTransfer in="drying-a" result="wet-mask"><feFuncA type="table" tableValues="0 0.66 0.8 0.86"/></feComponentTransfer>
          <feFlood flood-color="#c99482" result="wet-tone"/>
          <feComposite in="wet-tone" in2="wet-mask" operator="in" result="wet"/>
          <!-- Burnish: the float polishes some passes more than others. -->
          <feTurbulence type="fractalNoise" baseFrequency="0.004 0.011" numOctaves="2" seed="5" result="burnish"/>
          <feColorMatrix in="burnish" type="matrix" values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.95  0 0 0 1.1 -0.5" result="sheen"/>
          <!-- Grit: barely there; this is a skim coat, not render. -->
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="3" result="grit"/>
          <feColorMatrix in="grit" type="matrix" values="0 0 0 0 0.4  0 0 0 0 0.24  0 0 0 0 0.2  0 0 0 -0.7 0.4" result="specks"/>
          <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="wet"/><feMergeNode in="sheen"/><feMergeNode in="specks"/></feMerge>
        </filter>
        <pattern id="trowel" width="${TILE.w}" height="${TILE.h}" patternUnits="userSpaceOnUse">
          <g fill="none" stroke-linecap="round">
            <g stroke="#fff7f2"><g id="ridges">${trowel()}</g></g>
            <use href="#ridges" stroke="#5c2c20" opacity="0.22" transform="translate(0 1.1)"/>
          </g>
        </pattern>
        <linearGradient id="plaster-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff6f1" stop-opacity="0.24"/>
          <stop offset="0.55" stop-color="#fff6f1" stop-opacity="0"/>
          <stop offset="1" stop-color="#4a2219" stop-opacity="0.12"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="#e8ccbf" filter="url(#plaster)"/>
      <rect width="100%" height="100%" fill="url(#trowel)"/>
      <rect width="100%" height="100%" fill="url(#plaster-light)"/>
    </svg>

    <main class="wall" id="main">
      <h1 class="notice">Under works.</h1>
      <p class="aside">But you can check out my desktop.</p>

      <div class="breakin">
        <svg class="arrow" viewBox="0 0 190 160" aria-hidden="true" focusable="false">
          <path d="M15 11C16 47 34 88 71 113c27 18 59 25 97 27" />
          <path d="M157.8 131.9L168 140l-12.4 3.9" />
        </svg>
        <a class="crack" href="/desktop/" aria-label="My desktop">
          <svg viewBox="0 0 ${BOX.w} ${BOX.h}" data-origin="${SPALL.x} ${SPALL.y}" data-axis="${axis}" aria-hidden="true" focusable="false">
            <defs>
              <clipPath id="crack-hole"><path d="${hole}"/></clipPath>
              <filter id="crack-soft" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="0.7"/></filter>
              <!-- The upper lip's shadow: the hole, less itself moved down. -->
              <mask id="crack-lip" maskUnits="userSpaceOnUse" x="0" y="0" width="${BOX.w}" height="${BOX.h}">
                <rect width="${BOX.w}" height="${BOX.h}" fill="#fff"/>
                <path d="${hole}" transform="translate(0.4 2.1)" fill="#000" filter="url(#crack-soft)"/>
              </mask>
            </defs>
            <g clip-path="url(#crack-hole)">
              <rect width="${BOX.w}" height="${BOX.h}" fill="#e3e0d7"/>
              <image class="crack__field" href="/field-lab.svg" x="${fx}" y="${fy}" width="${r(1600 * FIELD_SCALE)}" height="${r(1000 * FIELD_SCALE)}" preserveAspectRatio="none"/>
              <rect class="crack__shade" width="${BOX.w}" height="${BOX.h}" mask="url(#crack-lip)"/>
            </g>
            <path class="crack__lip" d="${lip}"/>
            <path class="crack__hair crack__hair--lit" d="${hairs}" transform="translate(0 0.8)"/>
            <path class="crack__hair" d="${hairs}"/>
            <path class="crack__loop" d="${loop()}" pathLength="1"/>
          </svg>
        </a>
      </div>
    </main>

    <footer class="sign">
      <p>${esc(profile.name)}</p>
      <p><a href="${esc(profile.resume)}">Résumé</a> <span class="sign__kind">PDF</span></p>
      <p><a href="mailto:${mail}">${mail}</a></p>
    </footer>`;
}
