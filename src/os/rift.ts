/**
 * rift.exe — the DOM half of the game.
 *
 * Everything under src/game/rift/ is pure; this file is the only place that
 * touches the canvas, the keyboard, or the clock. Read RIFT.md before
 * changing the loop lifecycle below — it is the one part of this desktop
 * that is allowed a requestAnimationFrame loop, and the whole point of the
 * amendment that permits it is that the loop costs nothing when a run is not
 * actively being played:
 *
 *   - starts ONLY on an explicit "Begin run" press, never on window open
 *   - stops hard on: run end, pause (Escape), the window losing focus to
 *     something else, the tab going hidden, or the window closing
 *   - an idle or paused window requests zero frames, exactly like every
 *     other surface on this desktop
 */

import {
  ARENA,
  type Enemy,
  type Intent,
  type Projectile,
  type RiftState,
  type Telegraph,
  type Vec,
} from "../game/rift/types.ts";
import { applyAugment, createRun, offerAugments, step } from "../game/rift/sim.ts";
import type { AugmentDef, AugmentId } from "../game/rift/augments.ts";
import { WAVES } from "../game/rift/waves.ts";
import {
  ASPECT,
  FRAME,
  LEVELS,
  THEMES,
  type Theme,
  depthOf,
  levelAt,
  marchingSquares,
  sampleGrid,
  strokeFor,
} from "../field/core.ts";
import { isOpen, onWindowsChange, openDoc } from "./windows";

const DOC = "rift";
const KEY = "jl.rift";
const STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;

type Scheme = "wasd" | "click";
type Slot = "q" | "w" | "e" | "r";

const SLOTS: readonly Slot[] = ["q", "w", "e", "r"];

/** The key that casts each ability slot. Under WASD, W already means "up",
 *  so the W slot (Barrier Mine) moves to F; click-to-move leaves W free. */
const CAST_KEYS: Record<Scheme, Record<Slot, string>> = {
  wasd: { q: "q", w: "f", e: "e", r: "r" },
  click: { q: "q", w: "w", e: "e", r: "r" },
};

const castKeys = (s: Scheme): string => SLOTS.map((slot) => CAST_KEYS[s][slot].toUpperCase()).join(" ");

const CONTROLS: Record<Scheme, string> = {
  wasd: `W A S D to move, hold the mouse to attack, ${castKeys("wasd")} to cast.`,
  click: `Click to walk, S to stop. Attacks are automatic; ${castKeys("click")} to cast.`,
};

type Saved = { bestWave: number; bestMs: number; scheme: Scheme; calm: boolean };

let mount: HTMLElement | null = null;
let frame: HTMLElement | null = null;
let bg: HTMLCanvasElement | null = null;
let fx: HTMLCanvasElement | null = null;
let bgCtx: CanvasRenderingContext2D | null = null;
let fxCtx: CanvasRenderingContext2D | null = null;

let panelStart: HTMLElement | null = null;
let panelPick: HTMLElement | null = null;
let panelPause: HTMLElement | null = null;
let panelEnd: HTMLElement | null = null;
let offersBox: HTMLElement | null = null;
let keysLine: HTMLElement | null = null;
let hud: HTMLElement | null = null;
let hpFill: HTMLElement | null = null;
let bossBar: HTMLElement | null = null;
let bossFill: HTMLElement | null = null;
let say: HTMLElement | null = null;

let state: RiftState | null = null;
let raf = 0;
let lastFrame = 0;
let accMs = 0;
let paused = false;
let scheme: Scheme = "wasd";
let calm = false;
let best: { wave: number; ms: number } | null = null;
let runStartMs = 0;

/* --- Geometry: arena <-> pixel ---------------------------------------------
   flow.ts can "cover" its window and crop the field, because the wallpaper is
   only looked at. The arena is played in: the player walks to its edges and
   enemies spawn on them, so the whole of it is always fitted inside the
   window ("contain"), and a window of another shape gets margins instead of
   hiding part of the fight. */

let dpr = 1;
let fit = 1;
let offX = 0;
let offY = 0;

function measure(): void {
  if (!mount || !bg || !fx) return;
  const rect = mount.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;

  dpr = Math.min(window.devicePixelRatio || 1, 2);
  for (const c of [bg, fx]) {
    c.width = Math.max(1, Math.round(rect.width * dpr));
    c.height = Math.max(1, Math.round(rect.height * dpr));
    c.style.width = `${rect.width}px`;
    c.style.height = `${rect.height}px`;
  }

  fit = Math.min(rect.width / ARENA.w, rect.height / ARENA.h);
  offX = (rect.width - ARENA.w * fit) / 2;
  offY = (rect.height - ARENA.h * fit) / 2;

  paintArena();
  if (state) renderFrame(state);
}

function toArena(clientX: number, clientY: number): Vec {
  if (!mount) return { x: ARENA.w / 2, y: ARENA.h / 2 };
  const rect = mount.getBoundingClientRect();
  return {
    x: (clientX - rect.left - offX) / fit,
    y: (clientY - rect.top - offY) / fit,
  };
}

/* --- The arena floor: the field, sampled at rest, painted once ----------- */

const BG_COLS = 120;
const BG_ROWS = 76;

function theme(): Theme {
  return THEMES[document.documentElement.dataset.desk ?? "lab"] ?? THEMES.lab;
}

/**
 * The arena is the same loss surface the wallpaper draws — literally: this
 * reuses `sampleGrid`/`marchingSquares` from `src/field/core.ts` with no
 * pointer bump, painted once per run start and resize, never per frame. See
 * RIFT.md's note on why the boss is named for the saddle between the two
 * minima this field describes.
 */
function paintArena(): void {
  if (!bgCtx || !bg) return;
  const t = theme();
  const w = bg.width / dpr;
  const h = bg.height / dpr;

  bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bgCtx.clearRect(0, 0, w, h);
  bgCtx.setTransform(fit * dpr, 0, 0, fit * dpr, offX * dpr, offY * dpr);

  // The backdrop runs edge to edge, so the margins a fitted arena leaves read
  // as paper around the plot rather than as a hole in the window.
  const backdrop = bgCtx.createLinearGradient(0, 0, FRAME.w * 0.6, FRAME.h);
  for (const stop of t.backdrop) backdrop.addColorStop(stop.offset, stop.color);
  bgCtx.fillStyle = backdrop;
  bgCtx.fillRect(-offX / fit, -offY / fit, w / fit, h / fit);

  const project = (c: number, r: number): [number, number] => [
    (c / (BG_COLS - 1)) * 2 * ASPECT - ASPECT,
    (r / (BG_ROWS - 1)) * 2 - 1,
  ];
  const grid = sampleGrid(BG_COLS, BG_ROWS, project);
  const cellW = FRAME.w / (BG_COLS - 1);
  const cellH = FRAME.h / (BG_ROWS - 1);

  bgCtx.lineCap = "round";
  bgCtx.lineJoin = "round";
  for (let i = 0; i < LEVELS; i++) {
    const depth = depthOf(i);
    const level = levelAt(i, grid.min, grid.max);
    bgCtx.beginPath();
    marchingSquares(grid.values, BG_COLS, BG_ROWS, level, (x1, y1, x2, y2) => {
      bgCtx!.moveTo(x1 * cellW, y1 * cellH);
      bgCtx!.lineTo(x2 * cellW, y2 * cellH);
    });
    bgCtx.strokeStyle = strokeFor(t, depth);
    bgCtx.lineWidth = t.width(depth);
    bgCtx.globalAlpha = t.opacity(depth);
    bgCtx.stroke();
  }
  bgCtx.globalAlpha = 1;

  // The arena's edge is a wall, so it is drawn as the plot frame rather than
  // left to wherever the contours happen to stop. 1px of the shallow stroke,
  // measured at 3.72:1 or better against every backdrop stop of every theme
  // (slate's lightest stop is the floor).
  bgCtx.strokeStyle = t.strokeShallow;
  bgCtx.lineWidth = 1 / fit;
  bgCtx.strokeRect(0, 0, FRAME.w, FRAME.h);
}

/* --- Entity + fx layer: redrawn once per rendered frame ------------------ */

function ink(): Record<string, string> {
  const s = getComputedStyle(mount ?? document.documentElement);
  const get = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    ink: get("--ink", "#1b1a20"),
    muted: get("--ink-muted", "#55525f"),
    faint: get("--ink-faint", "#6a6775"),
    accent: get("--accent", "#4338f5"),
    accentDeep: get("--accent-deep", "#2f27ba"),
  };
}

function renderFrame(s: RiftState): void {
  if (!fxCtx || !fx) return;
  const w = fx.width / dpr;
  const h = fx.height / dpr;
  const c = ink();

  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fxCtx.clearRect(0, 0, w, h);
  fxCtx.setTransform(fit * dpr, 0, 0, fit * dpr, offX * dpr, offY * dpr);
  fxCtx.lineCap = "round";
  fxCtx.lineJoin = "round";

  for (const tg of s.telegraphs) drawTelegraph(tg, c);
  for (const e of s.enemies) drawEnemy(e, c);
  for (const p of s.projectiles) drawProjectile(p, c);
  drawPlayer(s, c);

  fxCtx.globalAlpha = 1;
  updateHud(s);
}

function drawTelegraph(tg: Telegraph, c: Record<string, string>): void {
  if (!fxCtx) return;
  const arming = tg.armMs > 0;
  // Urgency ramps toward 1 as the arm window closes, unless calm mode holds
  // it flat — a real difference, not decoration standing in for one.
  const progress = arming ? 1 - tg.armMs / Math.max(tg.armTotalMs, 1) : 1;
  const alpha = calm ? 0.85 : 0.35 + 0.5 * progress;
  fxCtx.setLineDash(arming ? [10, 8] : []);
  fxCtx.strokeStyle = tg.side === "player" ? c.accent : c.ink;
  fxCtx.globalAlpha = alpha;

  if (tg.shape.kind === "line") {
    fxCtx.lineWidth = tg.shape.width;
    fxCtx.beginPath();
    fxCtx.moveTo(tg.shape.from.x, tg.shape.from.y);
    fxCtx.lineTo(tg.shape.to.x, tg.shape.to.y);
    fxCtx.stroke();
  } else {
    fxCtx.lineWidth = 2;
    fxCtx.beginPath();
    fxCtx.arc(tg.shape.center.x, tg.shape.center.y, tg.shape.radius, 0, Math.PI * 2);
    fxCtx.stroke();
  }
  fxCtx.setLineDash([]);
  fxCtx.globalAlpha = 1;
}

/** Enemies are told apart by shape, never by a second colour next to
 *  indigo — the same rule GAME.md sets for spots.map's storefronts. Every
 *  enemy is drawn in the ink family; only the player's own things are ever
 *  indigo. */
function drawEnemy(e: Enemy, c: Record<string, string>): void {
  if (!fxCtx) return;
  fxCtx.fillStyle = c.faint;
  fxCtx.strokeStyle = c.muted;
  fxCtx.lineWidth = 2;

  const { x, y } = e.pos;
  const r = e.radius;

  if (e.kind === "rusher") {
    fxCtx.beginPath();
    fxCtx.moveTo(x, y - r);
    fxCtx.lineTo(x + r * 0.87, y + r * 0.5);
    fxCtx.lineTo(x - r * 0.87, y + r * 0.5);
    fxCtx.closePath();
    fxCtx.stroke();
  } else if (e.kind === "caster") {
    fxCtx.strokeRect(x - r, y - r, r * 2, r * 2);
    if (e.windupMs > 0) {
      fxCtx.beginPath();
      fxCtx.arc(x, y, r * 0.4, 0, Math.PI * 2);
      fxCtx.fillStyle = c.ink;
      fxCtx.fill();
    }
  } else if (e.kind === "wisp") {
    fxCtx.beginPath();
    fxCtx.arc(x, y, r, 0, Math.PI * 2);
    fxCtx.stroke();
  } else {
    // boss: a hexagon, the largest shape on the board.
    fxCtx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) fxCtx.moveTo(px, py);
      else fxCtx.lineTo(px, py);
    }
    fxCtx.closePath();
    fxCtx.lineWidth = 3;
    fxCtx.strokeStyle = c.ink;
    fxCtx.stroke();
  }
}

function drawProjectile(p: Projectile, c: Record<string, string>): void {
  if (!fxCtx) return;
  fxCtx.beginPath();
  fxCtx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
  fxCtx.fillStyle = p.side === "player" ? c.accent : c.muted;
  fxCtx.fill();
}

function drawPlayer(s: RiftState, c: Record<string, string>): void {
  if (!fxCtx) return;
  const p = s.player;
  if (!p.alive) return;
  const dir = { x: p.aim.x - p.pos.x, y: p.aim.y - p.pos.y };
  const len = Math.hypot(dir.x, dir.y) || 1;

  fxCtx.globalAlpha = p.invulnMs > 0 ? 0.5 : 1;
  fxCtx.beginPath();
  fxCtx.arc(p.pos.x, p.pos.y, 18, 0, Math.PI * 2);
  fxCtx.fillStyle = c.accentDeep;
  fxCtx.fill();

  fxCtx.beginPath();
  fxCtx.moveTo(p.pos.x, p.pos.y);
  fxCtx.lineTo(p.pos.x + (dir.x / len) * 28, p.pos.y + (dir.y / len) * 28);
  fxCtx.strokeStyle = c.accentDeep;
  fxCtx.lineWidth = 3;
  fxCtx.stroke();
  fxCtx.globalAlpha = 1;
}

/* --- HUD (plain DOM, not canvas — text belongs in the accessibility tree) - */

function updateHud(s: RiftState): void {
  if (!hud) return;
  const waveEl = hud.querySelector<HTMLElement>("[data-wave]");
  const levelEl = hud.querySelector<HTMLElement>("[data-level]");
  if (waveEl) waveEl.textContent = String(Math.min(s.wave, WAVES.length));
  if (levelEl) levelEl.textContent = String(s.player.level);
  if (hpFill) {
    const pct = Math.max(0, Math.min(1, s.player.hp / s.player.maxHp));
    // scaleX, not width: animating box size thrashes layout.
    hpFill.style.transform = `scaleX(${pct})`;
  }
  for (const slot of SLOTS) {
    const el = hud.querySelector<HTMLElement>(`[data-ab="${slot}"]`);
    if (!el) continue;
    const ready = s.player.cooldowns[slot] <= 0;
    el.classList.toggle("is-ready", ready);
  }

  const boss = s.enemies.find((e) => e.kind === "boss");
  if (bossBar) bossBar.hidden = !boss;
  if (boss && bossFill) {
    bossFill.style.transform = `scaleX(${Math.max(0, boss.hp / boss.maxHp)})`;
  }
}

/** The HUD's keycaps and the start screen's controls line follow the scheme,
 *  so neither ever names a key that does not cast. */
function labelControls(): void {
  for (const slot of SLOTS) {
    const el = hud?.querySelector<HTMLElement>(`[data-ab="${slot}"]`);
    if (el) el.textContent = CAST_KEYS[scheme][slot].toUpperCase();
  }
  if (keysLine) keysLine.textContent = CONTROLS[scheme];
}

function note(text: string): void {
  if (say) say.textContent = text;
}

/* --- Input ----------------------------------------------------------------- */

const held = new Set<string>();
const pendingCast = { q: false, w: false, e: false, r: false };
let mouseArena: Vec = { x: ARENA.w / 2 + 200, y: ARENA.h / 2 };
let mouseDown = false;
let moveTarget: Vec | null = null;

function collectIntent(): Intent {
  let move: Vec = { x: 0, y: 0 };
  let aim = mouseArena;
  let autoattack = mouseDown;

  if (scheme === "wasd") {
    const dx = (held.has("d") ? 1 : 0) - (held.has("a") ? 1 : 0);
    const dy = (held.has("s") ? 1 : 0) - (held.has("w") ? 1 : 0);
    move = { x: dx, y: dy };
  } else if (state) {
    const p = state.player;
    if (moveTarget) {
      const dx = moveTarget.x - p.pos.x;
      const dy = moveTarget.y - p.pos.y;
      const d = Math.hypot(dx, dy);
      if (d < 14) moveTarget = null;
      else move = { x: dx / d, y: dy / d };
    }
    autoattack = true;
    const nearest = nearestEnemy(state, p.pos);
    aim = nearest ? nearest.pos : moveTarget ?? p.aim;
  }

  const intent: Intent = {
    move,
    aim,
    autoattack,
    castQ: pendingCast.q,
    castW: pendingCast.w,
    castE: pendingCast.e,
    castR: pendingCast.r,
  };
  pendingCast.q = pendingCast.w = pendingCast.e = pendingCast.r = false;
  return intent;
}

/** Forget every key and button the frame thinks is down. Keyup only reaches
 *  the frame while it has focus, so a key released after a pause took focus
 *  away would otherwise stay held through the resume. */
function releaseInput(): void {
  held.clear();
  mouseDown = false;
  pendingCast.q = pendingCast.w = pendingCast.e = pendingCast.r = false;
}

function nearestEnemy(s: RiftState, from: Vec): Enemy | null {
  let nearest: Enemy | null = null;
  let nearestD = Infinity;
  for (const e of s.enemies) {
    const d = Math.hypot(e.pos.x - from.x, e.pos.y - from.y);
    if (d < nearestD) {
      nearest = e;
      nearestD = d;
    }
  }
  return nearest;
}

function bindInput(): void {
  if (!frame) return;

  frame.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state && state.status === "running" && !paused) {
        pause();
        event.preventDefault();
        event.stopPropagation();
      }
      // Already paused, or on an overlay screen: let it bubble so the window
      // manager's Escape closes the frame, same as every other window here.
      return;
    }
    if (!state || state.status !== "running" || paused) return;

    const key = event.key.toLowerCase();
    if (scheme === "wasd" && "wasd".includes(key)) {
      held.add(key);
      event.preventDefault();
      return;
    }
    if (scheme === "click" && key === "s") {
      moveTarget = null;
      event.preventDefault();
      return;
    }
    const slot = SLOTS.find((s) => CAST_KEYS[scheme][s] === key);
    if (!event.repeat && slot) {
      pendingCast[slot] = true;
      event.preventDefault();
    }
  });

  frame.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if ("wasd".includes(key)) held.delete(key);
  });

  frame.addEventListener("pointermove", (event) => {
    mouseArena = toArena(event.clientX, event.clientY);
  });

  frame.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    frame?.focus();
    if (scheme === "click" && state?.status === "running" && !paused) {
      moveTarget = toArena(event.clientX, event.clientY);
    } else {
      mouseDown = true;
    }
  });

  window.addEventListener("pointerup", () => {
    mouseDown = false;
  });

  // Losing focus to another window (or anywhere outside the frame) pauses
  // rather than lets the loop keep running behind something else — a run
  // costs frames only while it is the thing actually being played.
  frame.addEventListener("focusout", (event) => {
    const to = event.relatedTarget as Node | null;
    if (!to || !frame?.contains(to)) {
      if (state?.status === "running" && !paused) pause();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state?.status === "running" && !paused) pause();
  });
}

/* --- Loop lifecycle --------------------------------------------------------- */

function loop(now: number): void {
  if (!state || paused || state.status !== "running") {
    raf = 0;
    return;
  }
  const frameMs = Math.min(now - lastFrame, MAX_FRAME_MS);
  lastFrame = now;
  accMs += frameMs;

  while (accMs >= STEP_MS && state.status === "running") {
    step(state, collectIntent(), STEP_MS);
    accMs -= STEP_MS;
  }

  renderFrame(state);

  if (state.status !== "running") {
    onRunEnded(state);
    raf = 0;
    return;
  }
  if (state.pendingPicks > 0) {
    openPicker();
    raf = 0; // the picker itself pauses the loop; resumed on a pick
    return;
  }
  raf = requestAnimationFrame(loop);
}

function startLoop(): void {
  if (raf) return;
  lastFrame = performance.now();
  accMs = 0;
  raf = requestAnimationFrame(loop);
}

function stopLoop(): void {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
}

function pause(): void {
  if (!state || state.status !== "running") return;
  paused = true;
  stopLoop();
  releaseInput();
  showPanel(panelPause);
  note("Paused.");
}

function resume(): void {
  if (!state || state.status !== "running") return;
  paused = false;
  hidePanels();
  frame?.focus();
  startLoop();
}

/* --- Screens ---------------------------------------------------------------- */

function hidePanels(): void {
  for (const el of [panelStart, panelPick, panelPause, panelEnd]) {
    if (el) el.hidden = true;
  }
}

function showPanel(el: HTMLElement | null): void {
  hidePanels();
  if (el) el.hidden = false;
}

function openPicker(): void {
  if (!state || !offersBox) return;
  const offers = offerAugments(state);
  offersBox.innerHTML = offers
    .map(
      (o: AugmentDef) =>
        `<button class="rift__offer" type="button" data-augment="${o.id}">` +
        `<span class="rift__offer-name">${o.name}</span>` +
        `<span class="rift__offer-desc">${o.desc}</span>` +
        `</button>`,
    )
    .join("");
  for (const btn of offersBox.querySelectorAll<HTMLButtonElement>("[data-augment]")) {
    btn.addEventListener("click", () => {
      if (!state) return;
      applyAugment(state, btn.dataset.augment as AugmentId);
      hidePanels();
      startLoop();
    });
  }
  showPanel(panelPick);
}

function onRunEnded(s: RiftState): void {
  const elapsedMs = performance.now() - runStartMs;
  const waveReached = Math.min(s.wave, WAVES.length);
  const isBest = !best || waveReached > best.wave || (waveReached === best.wave && elapsedMs < best.ms);
  if (isBest) {
    best = { wave: waveReached, ms: elapsedMs };
    persist();
  }

  if (!panelEnd) return;
  const title = panelEnd.querySelector<HTMLElement>("[data-end-title]");
  const body = panelEnd.querySelector<HTMLElement>("[data-end-body]");
  if (s.status === "won") {
    if (title) title.textContent = "Rift cleared";
    if (body) body.textContent = `The Saddle is down. ${s.augmentsOwned.length} augments taken.`;
    note("You cleared the rift.");
  } else {
    if (title) title.textContent = "Run over";
    if (body) body.textContent = `Reached wave ${waveReached} of ${WAVES.length}.`;
    note(`Run over on wave ${waveReached}.`);
  }
  showPanel(panelEnd);
}

function beginRun(): void {
  state = createRun(Date.now() >>> 0);
  paused = false;
  moveTarget = null;
  releaseInput();
  runStartMs = performance.now();
  hidePanels();
  measure();
  frame?.focus();
  note("Run started.");
  startLoop();
}

/* --- Persistence ------------------------------------------------------------- */

function load(): void {
  // WASD is unreachable on a touch device, so click-to-move is the only
  // scheme that can work there — the default has to match, not just the
  // toggle's visibility (see the (pointer: coarse) block in style.css).
  if (window.matchMedia("(pointer: coarse)").matches) scheme = "click";

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      return;
    }
    const saved = JSON.parse(raw) as Saved;
    if (saved.bestWave > 0) best = { wave: saved.bestWave, ms: saved.bestMs };
    if (saved.scheme === "wasd" || saved.scheme === "click") scheme = saved.scheme;
    calm = Boolean(saved.calm);
  } catch {
    /* Private mode. A run that cannot be saved still runs. */
  }
}

function persist(): void {
  try {
    const out: Saved = {
      bestWave: best?.wave ?? 0,
      bestMs: best?.ms ?? 0,
      scheme,
      calm,
    };
    localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    /* ignore */
  }
}

/* --- Build ------------------------------------------------------------------- */

function build(root: HTMLElement): void {
  root.innerHTML = `
    <div class="rift__frame" tabindex="-1">
      <canvas class="rift__bg" aria-hidden="true"></canvas>
      <canvas class="rift__fx" aria-hidden="true"></canvas>

      <div class="rift__hud" aria-hidden="true">
        <span class="rift__wave">Wave <span class="num" data-wave>1</span> / ${WAVES.length}</span>
        <span class="rift__level">Lv <span class="num" data-level>1</span></span>
        <div class="rift__hpbar"><div class="rift__hpfill" data-hpfill></div></div>
        <div class="rift__abilities">
          <span class="rift__ab" data-ab="q">Q</span>
          <span class="rift__ab" data-ab="w">W</span>
          <span class="rift__ab" data-ab="e">E</span>
          <span class="rift__ab" data-ab="r">R</span>
        </div>
      </div>
      <div class="rift__bossbar" data-bossbar hidden aria-hidden="true">
        <div class="rift__bossfill" data-bossfill></div>
      </div>

      <p class="sr-only" role="status" data-say></p>

      <div class="rift__panel rift__panel--start" data-panel-start>
        <h3 class="rift__panel-h">rift.exe</h3>
        <p class="rift__panel-p">
          Dodge skillshots, cast your own, and clear ten waves and the boss
          waiting behind them.
        </p>
        <div class="rift__scheme" role="radiogroup" aria-label="Controls">
          <button type="button" class="rift__schemebtn" data-scheme="wasd" aria-pressed="true">WASD + mouse</button>
          <button type="button" class="rift__schemebtn" data-scheme="click" aria-pressed="false">Click to move</button>
        </div>
        <p class="rift__keys" data-keys></p>
        <p class="rift__touch-notice">
          This arena wants a keyboard and a pointer — touch controls aren't
          built yet. Tapping still walks and auto-attacks, but Q/W/E/R have
          no on-screen buttons.
        </p>
        <label class="rift__calm">
          <input type="checkbox" data-calm />
          Calm telegraphs
        </label>
        <button class="btn btn--primary" type="button" data-begin>Begin run</button>
        <p class="rift__best" data-best hidden>Best: wave <span class="num" data-best-wave></span> / ${WAVES.length}</p>
      </div>

      <div class="rift__panel rift__panel--pick" data-panel-pick hidden>
        <h3 class="rift__panel-h">Choose an augment</h3>
        <div class="rift__offers" data-offers></div>
      </div>

      <div class="rift__panel rift__panel--pause" data-panel-pause hidden>
        <h3 class="rift__panel-h">Paused</h3>
        <button class="btn btn--primary" type="button" data-resume>Resume</button>
      </div>

      <div class="rift__panel rift__panel--end" data-panel-end hidden>
        <h3 class="rift__panel-h" data-end-title></h3>
        <p class="rift__panel-p" data-end-body></p>
        <button class="btn btn--primary" type="button" data-again>Run it back</button>
      </div>
    </div>
  `;

  frame = root.querySelector<HTMLElement>(".rift__frame");
  bg = root.querySelector<HTMLCanvasElement>(".rift__bg");
  fx = root.querySelector<HTMLCanvasElement>(".rift__fx");
  bgCtx = bg?.getContext("2d") ?? null;
  fxCtx = fx?.getContext("2d") ?? null;
  hud = root.querySelector<HTMLElement>(".rift__hud");
  hpFill = root.querySelector<HTMLElement>("[data-hpfill]");
  bossBar = root.querySelector<HTMLElement>("[data-bossbar]");
  bossFill = root.querySelector<HTMLElement>("[data-bossfill]");
  say = root.querySelector<HTMLElement>("[data-say]");
  panelStart = root.querySelector<HTMLElement>("[data-panel-start]");
  panelPick = root.querySelector<HTMLElement>("[data-panel-pick]");
  panelPause = root.querySelector<HTMLElement>("[data-panel-pause]");
  panelEnd = root.querySelector<HTMLElement>("[data-panel-end]");
  offersBox = root.querySelector<HTMLElement>("[data-offers]");
  keysLine = root.querySelector<HTMLElement>("[data-keys]");

  const schemeButtons = root.querySelectorAll<HTMLButtonElement>("[data-scheme]");
  for (const btn of schemeButtons) {
    btn.addEventListener("click", () => {
      scheme = btn.dataset.scheme as Scheme;
      for (const b of schemeButtons) b.setAttribute("aria-pressed", String(b === btn));
      labelControls();
      persist();
    });
  }

  const calmBox = root.querySelector<HTMLInputElement>("[data-calm]");
  if (calmBox) {
    calmBox.checked = calm;
    calmBox.addEventListener("change", () => {
      calm = calmBox.checked;
      persist();
    });
  }

  root.querySelector("[data-begin]")?.addEventListener("click", beginRun);
  root.querySelector("[data-resume]")?.addEventListener("click", resume);
  root.querySelector("[data-again]")?.addEventListener("click", beginRun);

  for (const b of schemeButtons) b.setAttribute("aria-pressed", String(b.dataset.scheme === scheme));
  labelControls();

  const bestEl = root.querySelector<HTMLElement>("[data-best]");
  if (best && bestEl) {
    bestEl.hidden = false;
    const bestWaveEl = root.querySelector<HTMLElement>("[data-best-wave]");
    if (bestWaveEl) bestWaveEl.textContent = String(best.wave);
  }

  bindInput();
}

export function initRift(): void {
  mount = document.querySelector<HTMLElement>(".rift");
  if (!mount) return;

  load();
  build(mount);
  showPanel(panelStart);

  onWindowsChange(() => {
    if (!isOpen(DOC)) {
      // The window closed mid-run: pause rather than lose it. The article —
      // and this state — moves back to the shelf but is never destroyed.
      if (state?.status === "running" && !paused) pause();
      return;
    }
    measure();
  });

  let timer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (isOpen(DOC)) measure();
    }, 120);
  });

  document.querySelector('[data-action="rift-reset"]')?.addEventListener("click", () => {
    openDoc(DOC);
    stopLoop();
    state = null;
    paused = false;
    showPanel(panelStart);
  });
}
