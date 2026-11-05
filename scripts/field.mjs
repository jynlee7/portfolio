/**
 * Static wallpaper generator.
 *
 * Renders the shared field (src/field/core.ts) twice: as the desktop's gel
 * wallpapers, and as the SVG contour maps the preserved wall still names. Every
 * consumer reads the same module, so the two cannot drift.
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
  FLAVOURS,
  LEVELS,
  THEMES,
  depthOf,
  gelAt,
  levelAt,
  marchingSquares,
  sampleGrid,
  strokeFor,
  surface,
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

/* ------------------------------------------------------------------------
   The gel wallpapers: public/desk-<flavour>.webp, one per flavour. WebP is the
   one encoder here that needs a browser, so Playwright (a devDependency) does
   that part; the pixels themselves come from src/field/core.ts. Seeded dither,
   so the same surface gives the same bytes on the same Chromium.
   ------------------------------------------------------------------------ */

const GEL_W = 2240;
const GEL_H = 1400;

async function writeGel() {
  const { chromium } = await import("playwright");
  const toField = (px, py) => [(px / GEL_W) * 2 * ASPECT - ASPECT, (py / GEL_H) * 2 - 1];
  let min = Infinity;
  let max = -Infinity;
  for (let r = 0; r <= 400; r += 1) {
    for (let c = 0; c <= 640; c += 1) {
      const v = surface((c / 640) * 2 * ASPECT - ASPECT, (r / 400) * 2 - 1);
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  const e = (2 * ASPECT) / GEL_W;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [name, flavour] of Object.entries(FLAVOURS)) {
    let seed = 7;
    const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32 - 0.5) * 1.5;
    const pixels = new Uint8ClampedArray(GEL_W * GEL_H * 4);
    for (let py = 0; py < GEL_H; py += 1) {
      for (let px = 0; px < GEL_W; px += 1) {
        const [x, y] = toField(px, py);
        const rgb = gelAt(flavour, x, y, min, max, e);
        const i = (py * GEL_W + px) * 4;
        const n = noise();
        pixels[i] = rgb[0] + n;
        pixels[i + 1] = rgb[1] + n;
        pixels[i + 2] = rgb[2] + n;
        pixels[i + 3] = 255;
      }
    }
    const url = await page.evaluate(
      ({ data, w, h }) => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const bytes = Uint8ClampedArray.from(atob(data), (ch) => ch.charCodeAt(0));
        canvas.getContext("2d").putImageData(new ImageData(bytes, w, h), 0, 0);
        return canvas.toDataURL("image/webp", 0.92);
      },
      { data: Buffer.from(pixels.buffer).toString("base64"), w: GEL_W, h: GEL_H },
    );
    const bytes = Buffer.from(url.split(",")[1], "base64");
    writeFileSync(resolve(OUT_DIR, `desk-${name}.webp`), bytes);
    console.log(`desk-${name}.webp  ${(bytes.length / 1024).toFixed(1)} KB`);
  }
  await browser.close();
}

await writeGel();
