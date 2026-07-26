/**
 * dinner.run
 *
 * Seven nights, one neighborhood, and no way to know what a block is worth
 * until you have eaten there. Your score is the average of the week, not the
 * best night in it, so trying somewhere new costs you something real and going
 * back to the usual place caps you somewhere short. That is the whole game, and
 * it is the same shape as the surface behind the desktop: two peaks, one of
 * them wrong.
 *
 * Turn-based on purpose. The motion budget on this machine is one authored
 * moment — the field answering the pointer — and a game loop would be a second
 * one. Nothing here runs between turns; the canvas redraws once when something
 * happens and then costs nothing at all. The single exception is the reveal at
 * the end, which is a bounded crossfade that does not start under reduced
 * motion.
 */

import { marchingSquares } from "../field/core";
import { isOpen, onWindowsChange, openDoc } from "./windows";
import {
  COLS,
  NIGHTS,
  ROWS,
  dayKey,
  estimate,
  label,
  makeNeighborhood,
  seedForDay,
  weekAverage,
  type Neighborhood,
  type Sample,
} from "../game/neighborhood";

const KEY = "jl.dinner";
const DOC = "dinner";

/** Resolution of the contour grid. Cheap: it is redrawn at most eight times. */
const GX = 65;
const GY = 49;
const LEVELS = 13;

type Saved = { day: string; picks: [number, number][] };

let hood: Neighborhood;
/** Every night eaten, in order. Repeats are allowed and count again. */
let picks: Sample[] = [];
/** First-visit value per block, so a block never re-rolls. */
const known = new Map<string, number>();
/** Whether this run is today's shared board, and therefore worth remembering. */
let daily = true;
let done = false;
let cursor = 0;

let mount: HTMLElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let spots: HTMLButtonElement[] = [];
let nightOut: HTMLElement | null = null;
let avgOut: HTMLElement | null = null;
let sayOut: HTMLElement | null = null;
let again: HTMLButtonElement | null = null;

const cell = (c: number, r: number) => `${c},${r}`;

/** "an 8.1", "a 7.4". Only the eights need it, but they need it every time. */
function rated(value: number): string {
  const text = value.toFixed(1);
  return `${text.startsWith("8") ? "an" : "a"} ${text}`;
}

export function initDinner(): void {
  mount = document.querySelector<HTMLElement>(".dinner");
  if (!mount) return;

  build(mount);
  startDaily();

  // There is no per-window teardown hook, and closing a window moves the
  // article back to the shelf rather than removing it — so `isConnected` stays
  // true and cannot be used as the signal. Window state is the signal.
  onWindowsChange(() => {
    if (isOpen(DOC)) measure();
  });

  let timer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (isOpen(DOC)) measure();
    }, 120);
  });

  document.querySelector('[data-action="dinner-new"]')?.addEventListener("click", () => {
    openDoc(DOC);
    startFresh();
    measure();
  });
}

/* ------------------------------------------------------------------ build */

function build(root: HTMLElement): void {
  root.innerHTML = `
    <div class="dinner__hud">
      <p class="dinner__stat"><span class="dinner__k">Night</span> <span class="num" data-night>1 / ${NIGHTS}</span></p>
      <p class="dinner__stat"><span class="dinner__k">Week</span> <span class="num" data-avg>—</span></p>
    </div>
    <div class="dinner__board">
      <canvas class="dinner__field" aria-hidden="true"></canvas>
      <div class="dinner__grid" role="grid" aria-label="Neighborhood, ${COLS} by ${ROWS} blocks"></div>
    </div>
    <p class="dinner__say" role="status" data-say></p>
    <p class="dinner__foot"><button class="btn" type="button" data-again>New neighborhood</button></p>
  `;

  canvas = root.querySelector("canvas");
  ctx = canvas?.getContext("2d") ?? null;
  nightOut = root.querySelector("[data-night]");
  avgOut = root.querySelector("[data-avg]");
  sayOut = root.querySelector("[data-say]");
  again = root.querySelector("[data-again]");
  again?.addEventListener("click", () => {
    startFresh();
    measure();
    spots[cursor]?.focus();
  });

  const grid = root.querySelector<HTMLElement>(".dinner__grid");
  if (!grid) return;

  spots = [];
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement("div");
    row.setAttribute("role", "row");
    for (let c = 0; c < COLS; c++) {
      const spot = document.createElement("button");
      spot.type = "button";
      spot.className = "spot";
      spot.setAttribute("role", "gridcell");
      spot.dataset.c = String(c);
      spot.dataset.r = String(r);
      spot.tabIndex = -1;
      spot.innerHTML = `<span class="spot__v num" aria-hidden="true"></span>`;
      spot.addEventListener("click", () => {
        moveTo(r * COLS + c);
        commit(c, r);
      });
      row.append(spot);
      spots.push(spot);
    }
    grid.append(row);
  }

  // One tab stop for the whole board, arrows inside it — 48 tab stops would
  // make the rest of the document unreachable by keyboard.
  spots[0].tabIndex = 0;
  grid.addEventListener("keydown", onKey);
}

function onKey(event: KeyboardEvent): void {
  const step: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -COLS,
    ArrowDown: COLS,
  };

  if (event.key in step) {
    const c = cursor % COLS;
    const delta = step[event.key];
    // Horizontal moves must not wrap onto the next row.
    if (Math.abs(delta) === 1 && (c + delta < 0 || c + delta >= COLS)) return;
    const next = cursor + delta;
    if (next < 0 || next >= spots.length) return;
    event.preventDefault();
    moveTo(next);
    spots[cursor].focus();
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    commit(cursor % COLS, Math.floor(cursor / COLS));
  }
}

function moveTo(index: number): void {
  spots[cursor].tabIndex = -1;
  cursor = index;
  spots[cursor].tabIndex = 0;
}

/* ------------------------------------------------------------------- play */

function startDaily(): void {
  const day = dayKey();
  hood = makeNeighborhood(seedForDay(day));
  picks = [];
  known.clear();
  done = false;
  daily = true;

  // Today's run is restored rather than replayed. A board you can reroll until
  // it flatters you is not a board.
  const saved = load();
  if (saved && saved.day === day) {
    for (const [c, r] of saved.picks) eat(c, r);
    if (picks.length >= NIGHTS) finish();
  }

  render();
}

function startFresh(): void {
  hood = makeNeighborhood((Math.random() * 0xffffffff) >>> 0);
  picks = [];
  known.clear();
  done = false;
  daily = false;
  cursor = 0;
  render();
  say("A neighborhood nobody has seen. Seven nights, starting now.");
}

function commit(c: number, r: number): void {
  if (done) return;
  const first = !known.has(cell(c, r));
  eat(c, r);

  const value = known.get(cell(c, r)) as number;
  if (picks.length >= NIGHTS) {
    finish();
  } else {
    say(
      first
        ? `${label(c, r)} was ${rated(value)}.`
        : `${label(c, r)} again. Still ${rated(value)}.`,
    );
  }

  if (daily) save();
  render();
}

/** Record a night without any of the messaging. Used by replay too. */
function eat(c: number, r: number): void {
  if (picks.length >= NIGHTS) return;
  const key = cell(c, r);
  let value = known.get(key);
  if (value === undefined) {
    value = hood.rating(c, r);
    known.set(key, value);
  }
  picks.push({ c, r, value });
}

function finish(): void {
  done = true;
  const { best } = hood;
  const avg = weekAverage(picks).toFixed(1);

  if (known.has(cell(best.c, best.r))) {
    say(
      `You averaged ${avg}. ${label(best.c, best.r)} was the best block on the map, at ${best.value.toFixed(1)}, and you found it.`,
    );
  } else {
    // Chebyshev distance: on a grid, "blocks away" is how far you'd walk.
    let nearest = 0;
    let gap = Infinity;
    picks.forEach((p, i) => {
      const d = Math.max(Math.abs(p.c - best.c), Math.abs(p.r - best.r));
      if (d < gap) {
        gap = d;
        nearest = i;
      }
    });
    say(
      `You averaged ${avg}. The best block was ${label(best.c, best.r)}, a ${best.value.toFixed(1)}. On night ${nearest + 1} you were ${gap} block${gap === 1 ? "" : "s"} away.`,
    );
  }

  reveal();
}

function say(text: string): void {
  if (sayOut) sayOut.textContent = text;
}

/* ----------------------------------------------------------------- render */

function render(): void {
  const night = Math.min(picks.length + 1, NIGHTS);
  if (nightOut) nightOut.textContent = done ? `${NIGHTS} / ${NIGHTS}` : `${night} / ${NIGHTS}`;
  if (avgOut) avgOut.textContent = picks.length ? weekAverage(picks).toFixed(1) : "—";
  mount?.classList.toggle("is-done", done);

  for (const spot of spots) {
    const c = Number(spot.dataset.c);
    const r = Number(spot.dataset.r);
    const value = known.get(cell(c, r));
    const face = spot.querySelector(".spot__v");

    // Not `disabled` once the week is over: a finished board must stay
    // focusable so the winning block can still be reached by keyboard.
    spot.classList.toggle("is-known", value !== undefined);
    spot.classList.remove("is-best");
    spot.setAttribute("aria-disabled", String(done));
    if (face) face.textContent = value === undefined ? "" : value.toFixed(1);
    spot.setAttribute(
      "aria-label",
      value === undefined
        ? `Block ${label(c, r)}, not yet tried`
        : `Block ${label(c, r)}, rated ${value.toFixed(1)}`,
    );
  }

  if (done) {
    // The block you were competing against, with its number on it. "You missed
    // a 9.4" only lands if the 9.4 is actually there to look at.
    const { best } = hood;
    const win = spots[best.r * COLS + best.c];
    if (win) {
      win.classList.add("is-best");
      const face = win.querySelector(".spot__v");
      if (face) face.textContent = best.value.toFixed(1);
      win.setAttribute(
        "aria-label",
        `Block ${label(best.c, best.r)}, rated ${best.value.toFixed(1)} — the best block in the neighborhood`,
      );
    }
  }

  if (!done) paint(1);
  if (!picks.length) say(`Seven nights. Pick a block — you find out what it is worth by eating there.`);
}

/** Size the canvas to the board. Deferred until the window is open, because
 *  the shelf is `display: none` and everything on it measures zero. */
function measure(): void {
  if (!canvas || !ctx) return;
  const box = canvas.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(box.width * dpr);
  canvas.height = Math.round(box.height * dpr);
  paint(1, done);
}

/** Colours come off the stylesheet so the board follows the desk theme. */
function ink(): { accent: string; faint: string } {
  const styles = getComputedStyle(mount ?? document.documentElement);
  return {
    accent: styles.getPropertyValue("--accent").trim() || "#4338f5",
    faint: styles.getPropertyValue("--ink-faint").trim() || "#6a6775",
  };
}

/**
 * Draw the belief, the truth, or a blend of the two.
 *
 * `truth` at 0 is what the machine has inferred from the nights eaten so far;
 * at 1 it is the neighborhood as it actually is. The reveal walks between them.
 */
function paint(alpha = 1, truth: boolean | number = false): void {
  if (!canvas || !ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);

  blocks(w, h);

  const mix = typeof truth === "number" ? truth : truth ? 1 : 0;
  const guess = estimate([...known].map(([k, v]) => {
    const [c, r] = k.split(",").map(Number);
    return { c, r, value: v } as Sample;
  }));

  if (mix < 1 && guess) contours(guess, w, h, alpha * (1 - mix));
  if (mix > 0) contours((c, r) => hood.smooth(c, r), w, h, alpha * mix);
}

/**
 * The block grid, always drawn.
 *
 * Before the first night the contour layer has nothing honest to say, and an
 * empty recessed panel does not look like forty-eight places you can click.
 * These lines are what makes it read as a neighborhood.
 */
function blocks(w: number, h: number): void {
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = ink().faint;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    const x = Math.round((c * w) / COLS) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let r = 1; r < ROWS; r++) {
    const y = Math.round((r * h) / ROWS) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
  ctx.restore();
}

function contours(
  field: (c: number, r: number) => number,
  w: number,
  h: number,
  alpha: number,
): void {
  if (!ctx || alpha <= 0.002) return;

  const values = new Float64Array(GX * GY);
  let lo = Infinity;
  let hi = -Infinity;
  for (let gy = 0; gy < GY; gy++) {
    for (let gx = 0; gx < GX; gx++) {
      const v = field((gx * (COLS - 1)) / (GX - 1), (gy * (ROWS - 1)) / (GY - 1));
      values[gy * GX + gx] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (hi - lo < 1e-6) return;

  const { accent, faint } = ink();
  const sx = w / (GX - 1);
  const sy = h / (GY - 1);

  for (let i = 0; i < LEVELS; i++) {
    // High ground is where the food is, so the accent is earned by height here
    // rather than by depth the way it is on the wallpaper.
    const t = (i + 0.5) / LEVELS;
    ctx.beginPath();
    marchingSquares(values, GX, GY, lo + (hi - lo) * t, (x1, y1, x2, y2) => {
      ctx!.moveTo(x1 * sx, y1 * sy);
      ctx!.lineTo(x2 * sx, y2 * sy);
    });
    ctx.strokeStyle = t > 0.62 ? accent : faint;
    ctx.globalAlpha = alpha * (0.2 + 0.5 * Math.pow(t, 1.7));
    ctx.lineWidth = 0.7 + 1.6 * Math.pow(t, 2.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * The one animated moment in the game: the guess resolving into the truth.
 * Bounded, self-terminating, and skipped entirely under reduced motion — where
 * the truth simply appears, which is all the reveal was ever for.
 */
function reveal(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    paint(1, true);
    return;
  }

  const started = performance.now();
  const span = 260;
  const step = (now: number) => {
    if (!isOpen(DOC)) {
      paint(1, true);
      return;
    }
    const p = Math.min(1, (now - started) / span);
    paint(1, p * p * (3 - 2 * p));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ------------------------------------------------------------ persistence */

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    /* Private mode. A run that cannot be saved still plays. */
    return null;
  }
}

function save(): void {
  try {
    const out: Saved = { day: dayKey(), picks: picks.map((p) => [p.c, p.r]) };
    localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    /* ignore */
  }
}
