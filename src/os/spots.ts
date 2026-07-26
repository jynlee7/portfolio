/**
 * spots.map — the walk-around game.
 *
 * Read GAME.md before changing anything here. The short version, because it is
 * the thing most likely to be undone by accident:
 *
 * There is no requestAnimationFrame loop in this file, and there must never be
 * one. DESIGN.md spends the whole motion budget on the pointer deforming the
 * wallpaper field. Walking is a discrete grid step; the walker is a DOM element
 * moved by writing --cx/--cy, which a CSS transform transition animates on the
 * compositor; the canvas repaints once per step and only when something was
 * actually discovered. An idle open window requests zero frames.
 *
 * The places are not in here either. They are compiled out of content/spots.md
 * into an <ol class="spots"> inside the article, and this file *moves* the
 * matching <li> into the detail card and back out again — the same move
 * openDoc/closeDoc make with articles and window frames. One copy of every
 * fact, so the windowed view and the no-JS page cannot disagree.
 */

import {
  BLOCKS,
  GRID,
  SLOTS,
  START,
  frontOf,
  pathTo,
  slotAt,
  step,
  walkable,
  type Cell,
} from "../game/neighborhood";
import { isOpen, onWindowsChange, openDoc } from "./windows";

const KEY = "jl.spots";
const DOC = "spots";

type Saved = { found: string[]; at: [number, number] };

/** Slot id → the list item holding that place, for the ones that have content. */
const written = new Map<string, HTMLElement>();
const found = new Set<string>();

let at: Cell = START;
let mount: HTMLElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let layer: HTMLElement | null = null;
let walker: HTMLElement | null = null;
let card: HTMLElement | null = null;
let prompt: HTMLElement | null = null;
let tally: HTMLElement | null = null;
let say: HTMLElement | null = null;
const doors = new Map<string, HTMLButtonElement>();

/** Where the held <li> came from, so walking away puts it back in order. */
let held: { li: HTMLElement; parent: Node; next: Node | null } | null = null;

export function initSpots(): void {
  mount = document.querySelector<HTMLElement>(".plan");
  if (!mount) return;

  collect();
  build(mount);
  restore();
  render();

  // Closing a window moves the article back to the shelf rather than removing
  // it, so isConnected stays true and cannot be the signal. Window state is.
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

  document.querySelector('[data-action="spots-reset"]')?.addEventListener("click", () => {
    openDoc(DOC);
    found.clear();
    at = START;
    save();
    render();
    paint();
  });
}

/** The places that actually got written up, keyed by the storefront they claim. */
function collect(): void {
  for (const li of document.querySelectorAll<HTMLElement>(".spots .place")) {
    const slot = li.dataset.slot;
    if (slot) written.set(slot, li);
  }
}

function build(root: HTMLElement): void {
  root.innerHTML = `
    <div class="plan__paper">
      <canvas class="plan__ink" aria-hidden="true"></canvas>
      <div class="plan__layer" role="application" tabindex="0"
           aria-label="Neighborhood map. Arrow keys or W A S D to walk. Storefronts open when you reach them."
           aria-describedby="plan-say">
        <span class="plan__walker" aria-hidden="true"></span>
      </div>
    </div>
    <div class="plan__pad">
      <button class="plan__step" type="button" data-step="0,-1" aria-label="Walk north"></button>
      <button class="plan__step" type="button" data-step="-1,0" aria-label="Walk west"></button>
      <button class="plan__step" type="button" data-step="1,0" aria-label="Walk east"></button>
      <button class="plan__step" type="button" data-step="0,1" aria-label="Walk south"></button>
    </div>
    <p class="plan__hud">
      <span class="plan__k">Found</span>
      <span class="num" data-tally>0 / 0</span>
    </p>
    <p class="plan__say" id="plan-say" role="status" data-say></p>
    <aside class="plan__card" data-card>
      <p class="plan__prompt" data-prompt>Walk onto a storefront to read it.</p>
    </aside>
  `;

  canvas = root.querySelector<HTMLCanvasElement>(".plan__ink");
  ctx = canvas?.getContext("2d") ?? null;
  layer = root.querySelector<HTMLElement>(".plan__layer");
  walker = root.querySelector<HTMLElement>(".plan__walker");
  card = root.querySelector<HTMLElement>("[data-card]");
  prompt = root.querySelector<HTMLElement>("[data-prompt]");
  tally = root.querySelector<HTMLElement>("[data-tally]");
  say = root.querySelector<HTMLElement>("[data-say]");
  if (!layer) return;

  // The plan's dimensions drive every position in CSS, so the grid can change
  // in one file without the stylesheet knowing the numbers.
  root.style.setProperty("--cols", String(GRID.cols));
  root.style.setProperty("--rows", String(GRID.rows));

  for (const slot of SLOTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "plan__door";
    // Not a tab stop: the whole map is one, and fourteen more would bury the
    // rest of the document. Pointers and taps still reach it.
    button.tabIndex = -1;
    button.dataset.slot = slot.id;
    button.style.setProperty("--cx", String(slot.door.x));
    button.style.setProperty("--cy", String(slot.door.y));
    button.addEventListener("click", () => walkTo(slot.door));
    doors.set(slot.id, button);
    layer.append(button);
  }

  layer.addEventListener("keydown", onKey);

  // Walking by thumb. A door cell is about twelve pixels across on a phone,
  // which is not a tap target, so touch gets the same one-step-at-a-time
  // interface as the keyboard rather than a worse version of the pointer one.
  for (const button of root.querySelectorAll<HTMLButtonElement>(".plan__step")) {
    const [dx, dy] = (button.dataset.step ?? "0,0").split(",").map(Number);
    button.addEventListener("click", () => {
      const next = step(at, dx, dy);
      if (next !== at) goTo(next);
    });
  }
}

const MOVES: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  a: [-1, 0],
  d: [1, 0],
  w: [0, -1],
  s: [0, 1],
};

/**
 * Scoped to the map, never to the document: initWindowKeys owns Escape
 * globally, and a document-level arrow handler would fight the desktop and
 * scroll the window body out from under the player.
 */
function onKey(event: KeyboardEvent): void {
  const move = MOVES[event.key] ?? MOVES[event.key.toLowerCase()];
  if (!move) return;

  event.preventDefault();
  const next = step(at, move[0], move[1]);
  // step() hands back the same object when the move was into a wall, so
  // walking into a building costs nothing at all.
  if (next === at) return;
  goTo(next);
}

/** Walk a whole route, for taps. Lands on the destination; no tween between. */
function walkTo(target: Cell): void {
  const path = pathTo(at, target);
  if (!path || path.length === 0) return;
  goTo(path[path.length - 1]);
}

function goTo(next: Cell): void {
  at = next;

  const slot = slotAt(at);
  const discovered = slot && !found.has(slot.id) && written.has(slot.id);
  if (slot && written.has(slot.id)) found.add(slot.id);

  place();
  reveal(slot ? slot.id : null);
  if (discovered) paint();
  save();
}

/** The walker's cell, as two custom properties. CSS does the rest. */
function place(): void {
  if (!walker) return;
  walker.style.setProperty("--cx", String(at.x));
  walker.style.setProperty("--cy", String(at.y));
}

/**
 * Move the matching <li> into the card, and whatever was there back to the
 * list. Never clone: there is one copy of every fact in this document.
 */
function reveal(slotId: string | null): void {
  if (!card) return;

  const li = slotId ? written.get(slotId) : undefined;
  if (held && held.li !== li) {
    held.parent.insertBefore(held.li, held.next);
    held = null;
  }

  // The card keeps its place in the layout whether or not it holds anything.
  // Collapsing it would shift the map sideways on every step onto a door.
  if (prompt) prompt.hidden = Boolean(li);

  if (!li) {
    if (slotId) note("An empty storefront. Nothing written up here yet.");
    else note("");
    return;
  }

  if (!held) {
    held = { li, parent: li.parentNode as Node, next: li.nextSibling };
    card.append(li);
  }
  note("");
  count();
}

function note(text: string): void {
  if (say) say.textContent = text;
}

function count(): void {
  if (tally) tally.textContent = `${found.size} / ${written.size}`;
  for (const [slot, button] of doors) {
    const has = written.has(slot);
    const open = found.has(slot);
    button.classList.toggle("is-found", open);
    button.classList.toggle("is-vacant", !has);
    const name = open ? written.get(slot)?.querySelector(".place__name")?.textContent : null;
    button.setAttribute(
      "aria-label",
      name ? `${name.trim()} — found` : has ? "A storefront, not visited yet" : "An empty storefront",
    );
  }
  // The rail tile carries the same two numbers, and is the only part of this
  // visible before the window is opened.
  const railFound = document.getElementById("spots-found");
  const railTotal = document.getElementById("spots-total");
  if (railFound) railFound.textContent = String(found.size);
  if (railTotal) railTotal.textContent = String(written.size);
}

/** Size the canvas to the plan. Deferred: the doc shelf measures zero. */
function measure(): void {
  if (!canvas || !ctx) return;
  const box = canvas.getBoundingClientRect();
  if (box.width < 2 || box.height < 2) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(box.width * dpr);
  canvas.height = Math.round(box.height * dpr);
  paint();
}

function ink(): Record<string, string> {
  const s = getComputedStyle(mount ?? document.documentElement);
  const get = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback;
  return {
    block: get("--chrome-dim", "#dedbd3"),
    edge: get("--bevel-dark", "#b6b2a7"),
    hair: get("--hairline", "#c8c4b9"),
    accent: get("--accent", "#4338f5"),
    muted: get("--ink-muted", "#55525f"),
    faint: get("--ink-faint", "#6a6775"),
  };
}

/**
 * The plan. Called once per discovery and once per resize — never in a loop.
 *
 * A survey sheet, not a game board: a faint cell grid, flat building
 * footprints with a single-pixel edge, and storefronts that are outlines until
 * they are found and solid accent after.
 */
function paint(): void {
  if (!canvas || !ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  const cw = w / GRID.cols;
  const ch = h / GRID.rows;
  const c = ink();

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // The survey grid. Half-pixel offsets so a 1px line lands on one pixel.
  ctx.strokeStyle = c.hair;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < GRID.cols; x++) {
    const px = Math.round(x * cw) + 0.5;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
  }
  for (let y = 1; y < GRID.rows; y++) {
    const py = Math.round(y * ch) + 0.5;
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Buildings.
  for (const b of BLOCKS) {
    const x = Math.round(b.x * cw) + 0.5;
    const y = Math.round(b.y * ch) + 0.5;
    const bw = Math.round(b.w * cw) - 1;
    const bh = Math.round(b.h * ch) - 1;
    ctx.fillStyle = c.block;
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = c.edge;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, bw, bh);
  }

  // Storefronts, drawn on the building side of each door.
  for (const slot of SLOTS) {
    const f = frontOf(slot);
    const x = Math.round(f.x * cw) + 0.5;
    const y = Math.round(f.y * ch) + 0.5;
    const sw = Math.round(cw) - 1;
    const sh = Math.round(ch) - 1;

    // The three states are told apart by form, not by two greys a hair apart:
    // solid accent when found (#4338f5 on #dedbd3 is 4.86:1), a solid outline
    // when there is something to find (#55525f on #dedbd3 is 5.5:1), and a
    // dashed one when the storefront is empty (#6a6775 on #dedbd3 is 3.98:1).
    if (found.has(slot.id)) {
      ctx.fillStyle = c.accent;
      ctx.fillRect(x, y, sw, sh);
    } else if (written.has(slot.id)) {
      ctx.setLineDash([]);
      ctx.strokeStyle = c.muted;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, sw, sh);
    } else {
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = c.faint;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, sw, sh);
      ctx.setLineDash([]);
    }
  }
}

function render(): void {
  place();
  count();
  reveal(slotAt(at)?.id ?? null);
}

function restore(): void {
  const saved = load();
  if (!saved) return;

  // A slot that no longer exists is dropped rather than carried around: the
  // content is Jayden's and it will be reordered.
  for (const id of saved.found) {
    if (written.has(id)) found.add(id);
  }

  const cell = { x: saved.at[0], y: saved.at[1] };
  if (walkable(cell)) at = cell;
}

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    /* Private mode. A walk that cannot be saved still walks. */
    return null;
  }
}

function save(): void {
  try {
    const out: Saved = { found: [...found], at: [at.x, at.y] };
    localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    /* ignore */
  }
}
