/**
 * Static wallpaper generator.
 *
 * Renders the shared field (src/field/core.ts) as SVG contour maps — the
 * wallpaper that paints before JS runs, and the one that stays under reduced
 * motion. The live canvas draws the same field from the same module, so the
 * two cannot drift.
 *
 *   node scripts/field.mjs
 *
 * Deterministic: same input, same bytes. Safe to re-run and commit.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FRAME,
  ASPECT,
  LEVELS,
  THEMES,
  depthOf,
  levelAt,
  marchingSquares,
  sampleGrid,
  strokeFor,
} from "../src/field/core.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, "../public");

/* Grid resolution for the static pass. Denser than the live canvas can afford,
   because this runs once at author time. */
const COLS = 320;
const ROWS = 200;

/**
 * Stitch unordered segments into continuous polylines by matching endpoints.
 * Only the SVG needs this: without it every contour ships as thousands of
 * two-point paths. The canvas strokes segments directly and skips it.
 */
function joinSegments(segments) {
  const key = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const ends = new Map();

  for (const seg of segments) {
    for (const [i, p] of seg.entries()) {
      const k = key(p);
      if (!ends.has(k)) ends.set(k, []);
      ends.get(k).push({ seg, end: i });
    }
  }

  const used = new Set();
  const paths = [];

  for (const seg of segments) {
    if (used.has(seg)) continue;
    used.add(seg);

    const path = [seg[0], seg[1]];

    // Walk forward, then backward, consuming anything sharing an endpoint.
    for (const direction of [1, 0]) {
      for (;;) {
        const tip = direction ? path[path.length - 1] : path[0];
        const candidates = ends.get(key(tip)) || [];
        const next = candidates.find((cand) => !used.has(cand.seg));
        if (!next) break;
        used.add(next.seg);
        const other = next.seg[next.end === 0 ? 1 : 0];
        if (direction) path.push(other);
        else path.unshift(other);
      }
    }

    if (path.length > 3) paths.push(path);
  }

  return paths;
}

const toPathData = (points) =>
  points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join("");

function render(themeName) {
  const theme = THEMES[themeName];

  // The static pass uses the whole canonical frame.
  const project = (c, r) => [
    (c / (COLS - 1)) * 2 * ASPECT - ASPECT,
    (r / (ROWS - 1)) * 2 - 1,
  ];

  const grid = sampleGrid(COLS, ROWS, project);
  const cellW = FRAME.w / (COLS - 1);
  const cellH = FRAME.h / (ROWS - 1);

  const layers = [];

  for (let i = 0; i < LEVELS; i++) {
    const t = depthOf(i);
    const level = levelAt(i, grid.min, grid.max);

    const segments = [];
    marchingSquares(grid.values, COLS, ROWS, level, (x1, y1, x2, y2) => {
      segments.push([
        [x1 * cellW, y1 * cellH],
        [x2 * cellW, y2 * cellH],
      ]);
    });
    if (segments.length === 0) continue;

    const paths = joinSegments(segments);
    if (paths.length === 0) continue;

    layers.push(
      `<path d="${paths.map(toPathData).join("")}" fill="none" ` +
        `stroke="${strokeFor(theme, t)}" ` +
        `stroke-width="${theme.width(t).toFixed(2)}" ` +
        `stroke-opacity="${theme.opacity(t).toFixed(3)}" ` +
        `stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }

  const stops = theme.backdrop
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`)
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME.w} ${FRAME.h}" ` +
    `width="${FRAME.w}" height="${FRAME.h}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>` +
    `<linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">${stops}</linearGradient>` +
    `<radialGradient id="glow" cx="0.24" cy="0.46" r="0.5">` +
    `<stop offset="0" stop-color="${theme.glow}"/>` +
    `<stop offset="1" stop-color="transparent"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="${FRAME.w}" height="${FRAME.h}" fill="url(#bg)"/>` +
    `<rect width="${FRAME.w}" height="${FRAME.h}" fill="url(#glow)"/>` +
    `<g>${layers.join("")}</g>` +
    `</svg>`;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, theme.file), svg);
  return { file: theme.file, bytes: svg.length, contours: layers.length };
}

for (const name of Object.keys(THEMES)) {
  const r = render(name);
  console.log(
    `${r.file}  ${(r.bytes / 1024).toFixed(0)} kB  ${r.contours} contours`,
  );
}
