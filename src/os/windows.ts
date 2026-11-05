/**
 * Window manager.
 *
 * A window is a frame wrapped around one of the <article class="doc"> elements
 * already in the document. The article is MOVED, not cloned, so there is
 * exactly one copy of every fact in the DOM and no chance of the window and
 * the fallback page drifting apart. Closing puts it back.
 */

import { attachFlip, weighWheel } from "./flip";

const desk = () => document.getElementById("desk") as HTMLElement;
const docShelf = () => document.getElementById("docs") as HTMLElement;

const open = new Map<string, HTMLElement>();
/** What each window's flip needs undone when it closes. */
const undo = new Map<string, () => void>();
let frontmost: HTMLElement | null = null;
let cascade = 0;

/** Listeners for open/close, so Mpa's tour can follow what the visitor does. */
const listeners = new Set<(ids: string[]) => void>();

export function onWindowsChange(fn: (ids: string[]) => void): void {
  listeners.add(fn);
  fn([...open.keys()]);
}

function announce(): void {
  const ids = [...open.keys()];
  for (const fn of listeners) fn(ids);
}

export function isOpen(id: string): boolean {
  return open.has(id);
}

function bringToFront(win: HTMLElement): void {
  if (frontmost === win) return;
  frontmost?.classList.remove("is-front");
  win.classList.add("is-front");
  frontmost = win;
}

/**
 * Below this width a window is a bottom sheet pinned to the viewport edges by
 * the stylesheet rather than a free-floating panel. It neither cascades nor
 * drags, and nothing here may write inline geometry onto it.
 */
const sheet = () => window.matchMedia("(max-width: 780px)").matches;

/**
 * Initial placement. Windows cascade down-right from a fixed origin so a stack
 * of them stays individually clickable, then wrap back to the top once they
 * would run off the desk.
 */
function place(width: number): { x: number; y: number } {
  const bounds = desk().getBoundingClientRect();
  const step = 30;
  const maxSteps = Math.max(
    1,
    Math.floor((bounds.height - 260) / step),
  );

  const slot = cascade % maxSteps;
  cascade += 1;

  // Origin sits clear of the rail on the left and the icons on the right.
  const originX = Math.max(24, bounds.width * 0.2);
  const originY = 40;

  const x = Math.min(originX + slot * step, Math.max(16, bounds.width - width - 24));
  const y = originY + slot * step;
  return { x, y };
}

/** Per-document window sizing. Everything else takes the default. */
const WIDTH: Record<string, string> = {
  resume: "42rem",
  about: "38rem",
  principles: "40rem",
  experience: "44rem",
  lea: "46rem",
  clinical: "46rem",
  chessblitz: "46rem",
};

export function openDoc(id: string): void {
  const existing = open.get(id);
  if (existing) {
    bringToFront(existing);
    existing.focus();
    return;
  }

  const article = document.getElementById(`doc-${id}`);
  if (!article) return;

  const title = article.dataset.title ?? id;
  const meta = article.dataset.meta ?? "";
  const titleId = `win-${id}-title`;

  const win = document.createElement("section");
  win.className = "win";
  win.dataset.win = id;
  win.setAttribute("role", "dialog");
  win.setAttribute("aria-labelledby", titleId);
  // Non-modal on purpose: these behave like real windows, so the rest of the
  // desktop stays reachable and no focus trap is warranted.
  win.tabIndex = -1;
  win.style.setProperty("--w", WIDTH[id] ?? "44rem");

  const bar = document.createElement("header");
  bar.className = "win__bar";
  // All three lights do what they say. A control that lit up and did nothing
  // would be a promise this machine cannot honour.
  bar.innerHTML =
    `<div class="win__lights">` +
    `<button class="win__close" type="button" aria-label="Close ${title}"><span aria-hidden="true">×</span></button>` +
    `<button class="win__shade" type="button" aria-label="Roll up ${title}" aria-pressed="false"><span aria-hidden="true">−</span></button>` +
    `<button class="win__zoom" type="button" aria-label="Zoom ${title}" aria-pressed="false"><span aria-hidden="true">+</span></button>` +
    `</div>` +
    `<h2 class="win__title" id="${titleId}">${title}</h2>` +
    (meta ? `<span class="win__meta">${meta}</span>` : "");

  const body = document.createElement("div");
  body.className = "win__body";

  const reading = !article.classList.contains("doc--pdf");
  if (!reading) win.classList.add("win--pdf");

  win.append(bar, body);
  body.append(article);
  desk().append(win);

  // Below 780px a window is a bottom sheet pinned to all four edges by the
  // stylesheet, and there is no cascade to place it in. Writing inline left/top
  // here would beat that rule — the sheet would start at the cascade origin,
  // keep its full width, and hang off the right of the screen.
  if (!sheet()) {
    const width = win.getBoundingClientRect().width;
    const { x, y } = place(width);
    win.style.left = `${x}px`;
    win.style.top = `${y}px`;
    // A cascaded window starts lower down, so its ceiling has to account for
    // the offset or the last one in the stack runs off the bottom of the desk.
    const room = desk().getBoundingClientRect().height - y - 16;
    win.style.maxHeight = `${room}px`;
    // A reading window has a height of its own, because its flip is measured
    // against it and its cover is sized from it.
    if (reading) win.style.height = `${Math.min(room, 640)}px`;
  }
  if (reading) {
    undo.set(id, attachFlip(win, body));
    weighWheel(body);
  }

  zoomRects(id, win);

  open.set(id, win);
  bringToFront(win);
  win.focus();
  announce();

  bar.querySelector(".win__close")?.addEventListener("click", () => closeDoc(id));
  bar.querySelector(".win__shade")?.addEventListener("click", () => shade(win));
  bar.querySelector(".win__zoom")?.addEventListener("click", () => zoom(win));
  bar.addEventListener("dblclick", (event) => {
    if (!(event.target as HTMLElement).closest(".win__lights") && !sheet()) shade(win);
  });
  win.addEventListener("pointerdown", () => bringToFront(win));
  makeDraggable(win, bar);
}

/**
 * The window rolls up into its title bar, the old Mac's windowshade. It is what
 * the yellow light does on a desk with no dock to minimise into.
 */
function shade(win: HTMLElement): void {
  const rolled = win.classList.toggle("is-shaded");
  win.querySelector(".win__shade")?.setAttribute("aria-pressed", String(rolled));
}

/** The green light: as large as the desk, and back. Geometry written once. */
const zoomed = new WeakMap<HTMLElement, string>();
function zoom(win: HTMLElement): void {
  const from = zoomed.get(win);
  const button = win.querySelector(".win__zoom");
  if (from !== undefined) {
    win.style.cssText = from;
    zoomed.delete(win);
    button?.setAttribute("aria-pressed", "false");
    return;
  }
  zoomed.set(win, win.style.cssText);
  const bounds = desk().getBoundingClientRect();
  win.style.left = "12px";
  win.style.top = "12px";
  win.style.width = `${bounds.width - 24}px`;
  win.style.maxWidth = "none";
  win.style.height = `${bounds.height - 24}px`;
  win.style.maxHeight = "none";
  button?.setAttribute("aria-pressed", "true");
}

/**
 * The old Finder's zoom rectangles: four outlines thrown from the icon to where
 * the window lands, so a window comes from somewhere. 220ms, a window's open,
 * and only from a launcher that is on the desk to be thrown from.
 */
function zoomRects(id: string, win: HTMLElement): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const icon = document.querySelector<HTMLElement>(`.icon[data-open="${id}"]`);
  const from = icon?.getBoundingClientRect();
  if (!from || from.width === 0) return;
  const to = win.getBoundingClientRect();
  for (let i = 0; i < 4; i += 1) {
    const rect = document.createElement("div");
    rect.className = "zoomrect";
    rect.style.cssText = `left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px`;
    document.body.append(rect);
    const scale = `${from.width / to.width}, ${from.height / to.height}`;
    const shift = `${from.left - to.left}px, ${from.top - to.top}px`;
    rect.animate(
      [
        { transform: `translate(${shift}) scale(${scale})`, opacity: 0.9 },
        { transform: "none", opacity: 0.25 },
      ],
      { duration: 180, delay: i * 14, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" },
    ).onfinish = () => rect.remove();
  }
}

export function closeDoc(id: string): void {
  const win = open.get(id);
  if (!win) return;

  // Put the article back on the shelf so the document stays complete.
  const article = win.querySelector(".doc");
  if (article) docShelf().append(article);

  undo.get(id)?.();
  undo.delete(id);
  win.remove();
  open.delete(id);
  if (frontmost === win) frontmost = null;

  // Hand focus to whatever window is now on top, or back to the desktop.
  const last = [...open.values()].pop();
  if (last) {
    bringToFront(last);
    last.focus();
  } else {
    cascade = 0;
    document.querySelector<HTMLElement>(`[data-open="${id}"]`)?.focus();
  }

  announce();
}

export function closeAll(): void {
  for (const id of [...open.keys()]) closeDoc(id);
}

/**
 * Drag by the title bar. Pointer capture keeps the drag alive when the cursor
 * outruns the bar, and the result is clamped so a window can never be thrown
 * somewhere it cannot be grabbed again.
 */
function makeDraggable(win: HTMLElement, handle: HTMLElement): void {
  handle.addEventListener("pointerdown", (event) => {
    // Let the lights do their own jobs.
    if ((event.target as HTMLElement).closest(".win__lights")) return;
    if (event.button !== 0) return;
    if (sheet()) return;

    const bounds = desk().getBoundingClientRect();
    const rect = win.getBoundingClientRect();
    const grabX = event.clientX - rect.left;
    const grabY = event.clientY - rect.top;

    handle.setPointerCapture(event.pointerId);
    bringToFront(win);

    const move = (e: PointerEvent) => {
      const x = e.clientX - bounds.left - grabX;
      const y = e.clientY - bounds.top - grabY;
      // Keep at least the title bar reachable on every edge.
      win.style.left = `${Math.min(Math.max(x, -rect.width + 80), bounds.width - 80)}px`;
      win.style.top = `${Math.min(Math.max(y, 0), bounds.height - 34)}px`;
    };

    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  });
}

/** Escape closes the frontmost window — the OS convention. */
export function initWindowKeys(): void {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const front = frontmost ?? [...open.values()].pop();
    if (!front) return;
    const id = front.dataset.win;
    if (id) {
      event.preventDefault();
      closeDoc(id);
    }
  });
}
