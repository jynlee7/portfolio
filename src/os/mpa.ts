/**
 * Mpa — Jayden's personal assistant.
 *
 * A short tour that meets a first-time visitor the moment they wake the
 * machine, then gets out of the way. Mpa is a program on this machine, not a
 * mascot: a small window in the same material as every other window, which
 * says one line at a time and draws a leader to the thing it is talking
 * about, the way a figure annotates a contour plot.
 *
 * It walks. Each step, Mpa moves to the nearest clear patch of desk beside
 * its subject, so the leader stays short and never cuts through a label, an
 * icon or a window's text to get there.
 *
 * Non-modal on purpose. The desk stays live the whole time and the tour
 * listens to it: opening a folder is how you get past the folder step, and
 * putting the window away is how you get past the window step.
 *
 * Shown once per browser (`jl.mpa`); "Tour with Mpa" in the JL menu replays
 * it. A deep link skips it along with the lock screen, because that visitor
 * already chose a door.
 *
 * Costs no frames at rest. Mpa is placed when a step comes up or the viewport
 * changes size, and the leader is redrawn on events — a scroll, a drag, a
 * window opening — never from a running loop.
 */

import { onWindowsChange, openDoc } from "./windows";

const SEEN = "jl.mpa";

type Step = {
  /** What Mpa is talking about. No target, no leader. */
  target: () => Element | null;
  line: () => string;
  /** The primary button's label, when "Next" would not say what it does. */
  go?: string;
  /** What the primary button does before moving on. */
  act?: () => void;
  /** The step finishes itself when the visitor does the thing it asks. */
  until?: "open" | "close";
  /** Checked as the step comes up; a step that cannot be shown is passed. */
  when?: () => boolean;
};

const coarse = () => window.matchMedia("(pointer: coarse)").matches;
// The same breakpoint at which windows.ts turns a window into a sheet.
const sheet = () => window.matchMedia("(max-width: 780px)").matches;
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function frontWindow(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(".win.is-front") ??
    [...document.querySelectorAll<HTMLElement>(".win")].pop() ??
    null
  );
}

const STEPS: Step[] = [
  {
    target: () => document.querySelector(".nameplate__name"),
    line: () =>
      "Hi, I'm Mpa, Jayden's personal assistant. This is his desktop; I'll show you around in four stops.",
    go: "Show me",
  },
  {
    target: () => document.querySelector('.icon[data-open="resume"]'),
    line: () => "If you came for the résumé, it's this one. It opens as a PDF.",
  },
  {
    target: () => document.querySelector('.icon[data-open="lea"]'),
    line: () =>
      `Each folder is one of his projects. ${coarse() ? "Double\u2011tap" : "Double\u2011click"} lea to open it.`,
    go: "Open lea",
    act: () => openDoc("lea"),
    until: "open",
  },
  {
    // A sheet fills the screen, so on a phone the red button the line names is
    // what gets ringed; nothing outside the sheet is left to draw a leader across.
    target: () => (sheet() ? frontWindow()?.querySelector(".win__close") : frontWindow()) ?? null,
    line: () =>
      sheet()
        ? "Projects open as sheets like this one. The red button puts it away."
        : "Projects open in windows. Drag one by its bar; the red button or Esc puts it away.",
    until: "close",
    when: () => frontWindow() !== null,
  },
  {
    // The menu that lists the projects, found by what it lists.
    target: () => document.querySelector('[data-menu]:has([data-open="lea"]) > .menu__trigger'),
    line: () =>
      "Every project is also listed up here, under Work. That's the tour; if you want me again, I'm in the JL menu.",
    go: "Done",
  },
];

/** The ring stands this far off its target, so it never touches a label.
 *  Inside a 30px bar it has to sit closer or it runs off the bar; the
 *  stylesheet carries the same two numbers as outline offsets. */
const RING_GAP = 5;
const RING_GAP_BAR = 2;
/** Mpa never parks closer than this to the ring, so the leader always shows. */
const CLEAR = 28;
/** Margin Mpa keeps from the edges of the screen. */
const EDGE = 16;
/** The glide between stops, in step with --dur-win. */
const GLIDE = 220;

let at = -1;
let ringed: Element | null = null;
let turn = 0;
let frame = 0;
let windows = 0;
let pos: Point | null = null;

let panel: HTMLElement;
let say: HTMLElement;
let count: HTMLElement;
let go: HTMLButtonElement;
let skip: HTMLButtonElement;
let lead: SVGSVGElement;

export function initMpa(): void {
  const root = document.getElementById("mpa");
  const svg = document.getElementById("mpa-lead");
  if (!root || !(svg instanceof SVGSVGElement)) return;

  panel = root;
  lead = svg;
  say = root.querySelector(".mpa__say") as HTMLElement;
  count = root.querySelector(".mpa__count") as HTMLElement;
  go = root.querySelector(".mpa__go") as HTMLButtonElement;
  skip = root.querySelector(".mpa__skip") as HTMLButtonElement;

  go.addEventListener("click", forward);
  skip.addEventListener("click", finish);
  root.querySelector(".win__close")?.addEventListener("click", finish);

  // Escape is layered (CLAUDE.md). Inside Mpa it ends the tour and stops
  // there, so it cannot fall through and close a window nobody was closing.
  // Anywhere else it keeps its old meaning.
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    finish();
  });

  document.querySelector('[data-action="tour"]')?.addEventListener("click", start);

  // The lock screen says when the visitor is in. Waiting a beat lets the desk
  // land before anybody talks over it.
  document.addEventListener("jl:enter", () => {
    if (!seen()) window.setTimeout(start, 360);
  });

  onWindowsChange((ids) => {
    const opened = ids.length > windows;
    windows = ids.length;
    if (at < 0) return;
    const until = STEPS[at].until;
    if ((until === "open" && opened) || (until === "close" && ids.length === 0)) {
      show(at + 1);
    } else {
      schedule();
    }
  });

  // A new viewport is a new desk: find a new spot. Anything else that can
  // move the target only redraws the leader; Mpa does not wander off while
  // somebody is working next to it.
  window.addEventListener("resize", () => {
    if (at < 0) return;
    settle(false);
  });
  window.addEventListener("scroll", schedule, { capture: true, passive: true });
  document.addEventListener("pointermove", (event) => {
    if (event.buttons) schedule();
  });
  document.addEventListener("pointerup", schedule);
  document.addEventListener("animationend", schedule);
}

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN) === "1";
  } catch {
    // Storage refused: greeting this visitor once more is the lesser harm.
    return false;
  }
}

function start(): void {
  try {
    localStorage.setItem(SEEN, "1");
  } catch {
    /* ignore */
  }
  // Arrive at the first stop rather than gliding to it from wherever the last
  // tour ended.
  pos = null;
  panel.hidden = false;
  show(0);
  go.focus();
}

function forward(): void {
  if (at < 0) return;
  const step = STEPS[at];
  const next = at + 1;
  step.act?.();
  // An action that finished the step itself (opening lea fires the window
  // listener) has already moved the tour on; do not move it twice.
  if (at === next - 1) show(next);
}

function show(index: number): void {
  let i = index;
  while (i < STEPS.length && STEPS[i].when?.() === false) i += 1;
  if (i >= STEPS.length) {
    finish();
    return;
  }

  at = i;
  const step = STEPS[i];
  say.textContent = step.line();
  count.textContent = `${i + 1} / ${STEPS.length}`;
  go.textContent = step.go ?? "Next";
  skip.hidden = i === STEPS.length - 1;
  replay(say, "is-new");

  // On a phone the desk scrolls; bring the subject into view before pointing.
  const target = step.target();
  if (target) {
    const box = target.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) {
      target.scrollIntoView({ block: "center" });
    }
  }

  settle(true);
}

function finish(): void {
  if (at < 0) return;
  const hadFocus = panel.contains(document.activeElement);
  at = -1;
  turn += 1;
  // The click that ended the tour scheduled a redraw on its way up; drop it.
  cancelAnimationFrame(frame);
  frame = 0;
  panel.hidden = true;
  lead.toggleAttribute("hidden", true);
  ring(null);
  if (hadFocus) (frontWindow() ?? document.querySelector<HTMLElement>(".icon"))?.focus();
}

/**
 * Move Mpa beside the current step's subject, then draw the leader once it
 * has arrived. A leader drawn mid-glide would point from a place Mpa is
 * leaving.
 */
function settle(fresh: boolean): void {
  const mine = ++turn;
  const box = ringOf(STEPS[at].target());
  const from = pos;
  const spot = box ? clearSpot(box) : home();
  pos = spot;

  const glides = from !== null && !still() && (from.x !== spot.x || from.y !== spot.y);
  if (!from) panel.classList.add("is-placing");
  panel.style.setProperty("--mpa-x", `${spot.x}px`);
  panel.style.setProperty("--mpa-y", `${spot.y}px`);
  if (!from) {
    void panel.getBoundingClientRect();
    panel.classList.remove("is-placing");
  }

  if (!glides) {
    draw(fresh);
    return;
  }
  lead.toggleAttribute("hidden", true);
  ring(null);
  window.setTimeout(() => {
    if (mine === turn) draw(fresh);
  }, GLIDE + 20);
}

function schedule(): void {
  if (at < 0 || frame) return;
  frame = requestAnimationFrame(() => draw(false));
}

function ringOf(target: Element | null): Box | null {
  const box = target?.getBoundingClientRect();
  if (!target || !box || box.width === 0 || box.bottom < 0 || box.top > window.innerHeight) return null;
  return grow(box, target.closest(".menubar, .win__bar") ? RING_GAP_BAR : RING_GAP);
}

/**
 * The ring is an outline on the subject itself rather than a shape on the
 * leader's layer: the leader runs under the desk's furniture, and a ring down
 * there would vanish under the menubar or a window's own shadow.
 */
function ring(subject: Element | null, fresh = false): void {
  if (subject !== ringed) {
    ringed?.classList.remove("is-mpa-subject", "is-mpa-new");
    ringed = subject;
    subject?.classList.add("is-mpa-subject");
  }
  if (subject && fresh) replay(subject, "is-mpa-new");
}

/**
 * The leader runs centre to centre, clipped to the edge of Mpa at one end and
 * the edge of the ring at the other, so it leaves Mpa on the side facing its
 * subject and lands square on the thing it names.
 */
function draw(fresh: boolean): void {
  frame = 0;
  if (at < 0) return;

  const subject = STEPS[at].target();
  const box = ringOf(subject);
  if (!box) {
    lead.toggleAttribute("hidden", true);
    ring(null);
    return;
  }
  ring(subject, fresh);

  const from = panel.getBoundingClientRect();
  const a = exit(from, centre(box));
  const b = exit(box, centre(from));

  lead.toggleAttribute("hidden", false);
  // A subject that has slid under Mpa gets its ring and no line.
  const d = a && b && Math.hypot(b.x - a.x, b.y - a.y) > 8 ? `M${a.x} ${a.y}L${b.x} ${b.y}` : "";
  for (const p of lead.querySelectorAll("path")) p.setAttribute("d", d);
  const dot = lead.querySelector("circle");
  if (dot && a) {
    dot.setAttribute("cx", `${a.x}`);
    dot.setAttribute("cy", `${a.y}`);
  }
  dot?.setAttribute("visibility", d ? "visible" : "hidden");

  if (fresh) replay(lead, "is-drawing");
}

/**
 * The nearest patch of screen beside the ring where Mpa covers nothing and
 * its leader crosses nothing. Every candidate on a coarse grid is scored:
 * area of furniture covered, plus points of the leader that land on
 * furniture, plus distance from the subject. Run once per step, so a
 * thousand candidates cost a few milliseconds where nobody is waiting.
 */
function clearSpot(ring: Box): Point {
  const w = panel.offsetWidth;
  const h = panel.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const ceiling = (document.getElementById("menubar")?.getBoundingClientRect().bottom ?? 0) + EDGE;

  const subject = STEPS[at].target();
  const furniture = [...document.querySelectorAll(".nameplate, .icon, .rail > *, .win")]
    // The subject is not in its own way, and neither is what holds it.
    .filter((el) => !subject || !(el.contains(subject) || subject.contains(el)))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.bottom > 0 && r.top < vh);

  const keepOff = grow(ring, CLEAR);
  // On a phone Mpa is as wide as the screen, so only its height is free.
  const xs = sheet() ? [EDGE * 0.75] : range(EDGE, vw - w - EDGE, 24);
  const ys = range(ceiling, vh - h - EDGE, 16);

  let best: Point | null = null;
  let bestCost = Infinity;
  for (const x of xs) {
    for (const y of ys) {
      const box = { left: x, top: y, right: x + w, bottom: y + h };
      if (overlap(box, keepOff) > 0) continue;

      let cost = 0;
      for (const f of furniture) cost += overlap(box, f);
      if (cost >= bestCost) continue;

      const a = exit(box, centre(ring));
      const b = exit(ring, centre(box));
      if (!a || !b) continue;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      cost += length * 4;
      // A leader that cuts through a label is the thing this whole function
      // exists to avoid; price every 10px of it that does.
      const samples = Math.ceil(length / 10);
      for (let s = 1; s < samples; s += 1) {
        const px = a.x + ((b.x - a.x) * s) / samples;
        const py = a.y + ((b.y - a.y) * s) / samples;
        if (furniture.some((f) => px >= f.left && px <= f.right && py >= f.top && py <= f.bottom)) {
          cost += 600;
        }
      }

      if (cost < bestCost) {
        bestCost = cost;
        best = { x, y };
      }
    }
  }
  return best ?? home();
}

/** Bottom right, the corner nothing else uses (the dock once floated here). */
function home(): Point {
  const w = panel.offsetWidth;
  const h = panel.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const x = sheet() ? EDGE * 0.75 : vw - w - EDGE * 1.5;
  return { x, y: window.innerHeight - h - EDGE * 1.5 };
}

type Box = { left: number; top: number; right: number; bottom: number };
type Point = { x: number; y: number };

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to; v += step) out.push(Math.round(v));
  return out.length ? out : [Math.round(Math.max(from, 0))];
}

function grow(box: Box, by: number): Box {
  return { left: box.left - by, top: box.top - by, right: box.right + by, bottom: box.bottom + by };
}

function overlap(a: Box, b: Box): number {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return x > 0 && y > 0 ? x * y : 0;
}

function centre(box: Box): Point {
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

/** Where a ray from the box's centre toward `toward` leaves the box. */
function exit(box: Box, toward: Point): Point | null {
  const c = centre(box);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  const halfW = (box.right - box.left) / 2;
  const halfH = (box.bottom - box.top) / 2;
  // `toward` is inside this box: there is no edge to leave by.
  if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) return null;
  const t = Math.min(dx ? halfW / Math.abs(dx) : Infinity, dy ? halfH / Math.abs(dy) : Infinity);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

/** Restart a CSS animation that is keyed to a class. */
function replay(el: Element, cls: string): void {
  el.classList.remove(cls);
  void el.getBoundingClientRect();
  el.classList.add(cls);
}
