/**
 * The wall at `/`, enhanced. Without this script the crack is an ordinary
 * link and the page is complete; with it, going in breaks the wall.
 *
 * The desktop sits still behind the wall. Through the crack the field is
 * placed exactly where the desktop's lock screen paints it (`center / cover`
 * of the viewport), so what shows through is what is really there. Clicking
 * the crack opens it into a hole in three bursts, each throwing off plaster,
 * until the hole is bigger than the screen, and only then does the page
 * navigate: the lock screen arrives as the thing already showing.
 * `jl.through` tells the lock to keep its field at rest instead of raising
 * it again.
 *
 * Costs nothing at rest: no frame is requested until the crack is clicked,
 * and the loop ends when the page leaves. Under reduced motion the crack is
 * an ordinary link.
 */

import "./wall.css";

const THEMES = ["lab", "slate", "blueprint"];

/** The field's frame, from src/field/core.ts. Not imported: that module is
 *  the desktop's, and the wall loads no desktop code. */
const FRAME = { w: 1600, h: 1000 };

/** The bursts: when each starts (ms after the click), how long it takes,
 *  how far the hole reaches (fraction of what covers the screen), and how
 *  many pieces it throws off. The last is the wall giving way. */
const BURSTS = [
  { at: 80, take: 70, reach: 0.045, pieces: 7, size: [7, 20] },
  { at: 230, take: 90, reach: 0.14, pieces: 11, size: [10, 30] },
  { at: 380, take: 300, reach: 1, pieces: 18, size: [18, 46] },
];
const COVERED = BURSTS[2].at + BURSTS[2].take;
const LEAVE = COVERED + 170;
const SIDES = 34;

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const crack = document.querySelector<HTMLAnchorElement>(".crack");
const svg = crack?.querySelector<SVGSVGElement>("svg");
const view = crack?.querySelector<SVGImageElement>(".crack__field");

function read(store: () => Storage, key: string): string | null {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
}

// The wallpaper the visitor last chose on the desktop, if they have been, so
// the crack shows the desk they will land on.
const chosen = read(() => localStorage, "jl.desk");
const wallpaper = `/field-${chosen && THEMES.includes(chosen) ? chosen : "lab"}.svg`;
view?.setAttribute("href", wallpaper);

if (crack && svg && view) {
  // Without this the crack shows the field framed on its deepest well, set
  // in scripts/wall.mjs; with it, the field is where the desktop really is.
  const align = () => {
    const box = svg.getBoundingClientRect();
    const unit = box.width / svg.viewBox.baseVal.width;
    const lock = cover();
    view.setAttribute("x", ((lock.x - box.left) / unit).toFixed(2));
    view.setAttribute("y", ((lock.y - box.top) / unit).toFixed(2));
    view.setAttribute("width", (lock.w / unit).toFixed(2));
    view.setAttribute("height", (lock.h / unit).toFixed(2));
  };
  align();
  window.addEventListener("resize", align, { passive: true });

  let fetched = false;
  const prefetch = () => {
    if (fetched) return;
    fetched = true;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = crack.href;
    document.head.append(link);
  };
  for (const type of ["pointerenter", "focus", "touchstart"]) {
    crack.addEventListener(type, prefetch, { passive: true, once: true });
  }

  crack.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (reduced.matches) return;
    event.preventDefault();
    // Already going in: a second click must not cut the break short.
    if (document.querySelector(".breach")) return;
    try {
      sessionStorage.setItem("jl.through", "1");
    } catch {
      /* The lock replays its entrance. */
    }
    breakIn(crack.href, svg, view);
  });

  // Back from the desktop restores this page from the bfcache with the wall
  // still broken. Mend it.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) document.querySelector(".breach")?.remove();
  });
}

type Frame = { x: number; y: number; w: number; h: number };

/** Where the lock screen paints the field: `center / cover` of the viewport. */
function cover(): Frame {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.max(vw / FRAME.w, vh / FRAME.h);
  return { x: (vw - FRAME.w * scale) / 2, y: (vh - FRAME.h * scale) / 2, w: FRAME.w * scale, h: FRAME.h * scale };
}

function breakIn(href: string, svg: SVGSVGElement, view: SVGImageElement): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Where the crack shows the field, in viewport pixels, and where the lock
  // screen paints it. The same, unless the wall has been scrolled; then the
  // field eases into place under the hole as it opens.
  const box = svg.getBoundingClientRect();
  const unit = box.width / svg.viewBox.baseVal.width;
  const attr = (name: string) => Number(view.getAttribute(name)) * unit;
  const from: Frame = { x: box.left + attr("x"), y: box.top + attr("y"), w: attr("width"), h: attr("height") };
  const to = cover();

  // The hole opens from the spall, along the crack.
  const [ox, oy] = (svg.dataset.origin ?? "0 0").split(" ").map(Number);
  const cx = box.left + ox * unit;
  const cy = box.top + oy * unit;
  const axis = Number(svg.dataset.axis ?? 0);

  // A ragged outline that stays the same shape as it grows, stretched along
  // the crack at first, the way a crack opens before it gives.
  const phase = [Math.random() * 6.3, Math.random() * 6.3];
  const ragged = Array.from({ length: SIDES }, (_, k) => {
    const a = (k / SIDES) * Math.PI * 2;
    // Broad lobes, then a hard knock per corner: plaster breaks in facets.
    return 1 + 0.12 * Math.sin(3 * a + phase[0]) + 0.08 * Math.sin(5 * a + phase[1]) + (Math.random() - 0.5) * 0.42;
  });
  const core = ragged.map(() => 1.5 + Math.random() * 4);
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(vw - cx, cy), Math.hypot(cx, vh - cy), Math.hypot(vw - cx, vh - cy));
  const reach = (far / (Math.min(...ragged) * Math.cos(Math.PI / SIDES))) * 1.04;

  const breach = document.createElement("div");
  breach.className = "breach";
  breach.setAttribute("aria-hidden", "true");
  breach.innerHTML =
    `<svg viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="none">` +
    `<defs><clipPath id="breach-hole"><path/></clipPath></defs>` +
    `<path class="breach__run" d="${runs(cx, cy, axis, vw, vh)}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>` +
    `<path class="breach__core"/>` +
    `<g clip-path="url(#breach-hole)"><rect width="${vw}" height="${vh}" fill="#e3e0d7"/>` +
    `<image href="${wallpaper}" preserveAspectRatio="none"/></g>` +
    `<path class="breach__edge"/>` +
    `</svg>`;
  document.body.append(breach);

  const run = breach.querySelector<SVGPathElement>(".breach__run")!;
  const coreShape = breach.querySelector<SVGPathElement>(".breach__core")!;
  const hole = breach.querySelector<SVGPathElement>("clipPath path")!;
  const edge = breach.querySelector<SVGPathElement>(".breach__edge")!;
  const image = breach.querySelector<SVGImageElement>("image")!;

  const outline = (radius: number, extra: (k: number) => number) => {
    let d = "";
    for (let k = 0; k < SIDES; k++) {
      const a = (k / SIDES) * Math.PI * 2;
      // Early on the hole runs along the crack; the stretch relaxes as it grows.
      const along = Math.abs(Math.cos(a - axis)) ** 3;
      const stretch = 1 + 1.5 * along * Math.max(0, 1 - radius / (reach * 0.3));
      const r = radius * ragged[k] * stretch + extra(k);
      d += `${k ? "L" : "M"}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
    }
    return `${d}Z`;
  };

  const thrown = new Set<number>();
  const start = performance.now();
  let left = false;

  const frame = (now: number) => {
    const t = now - start;

    // The crack runs out across the wall before anything comes away.
    run.style.strokeDashoffset = String(1 - easeOut(Math.min(1, t / 150)));

    let radius = 4;
    BURSTS.forEach((burst, i) => {
      if (t < burst.at) return;
      const p = Math.min(1, (t - burst.at) / burst.take);
      const before = i ? BURSTS[i - 1].reach : 0;
      // The last burst accelerates, as a wall that has given way does.
      const eased = i === BURSTS.length - 1 ? p ** 2.2 : easeOut(p);
      radius = Math.max(radius, reach * (before + (burst.reach - before) * eased));
      if (!thrown.has(i)) {
        thrown.add(i);
        throwPieces(breach, burst, cx, cy, reach * burst.reach * (i === BURSTS.length - 1 ? 0.18 : 1), ragged, vh);
      }
    });

    const d = outline(radius, () => 0);
    hole.setAttribute("d", d);
    edge.setAttribute("d", d);
    coreShape.setAttribute("d", outline(radius, (k) => core[k] * Math.min(1.5, 0.5 + radius / 220)));

    const p = easeInOut(Math.min(1, t / COVERED));
    image.setAttribute("x", lerp(from.x, to.x, p).toFixed(2));
    image.setAttribute("y", lerp(from.y, to.y, p).toFixed(2));
    image.setAttribute("width", lerp(from.w, to.w, p).toFixed(2));
    image.setAttribute("height", lerp(from.h, to.h, p).toFixed(2));

    if (t >= LEAVE && !left) {
      left = true;
      location.assign(href);
      return;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** Cracks running out from the hole to past the edge of the screen: two
 *  carrying on along the crack, three wherever the plaster is weakest. */
function runs(cx: number, cy: number, axis: number, vw: number, vh: number): string {
  const headings = [axis, axis + Math.PI, axis + 1.7 + Math.random() * 0.6, axis - 1.4 - Math.random() * 0.6, axis + Math.PI + 0.9 + Math.random() * 0.5];
  let d = "";
  for (const heading of headings) {
    let x = cx;
    let y = cy;
    let a = heading;
    d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
    while (x > -40 && x < vw + 40 && y > -40 && y < vh + 40) {
      a = heading + (Math.random() - 0.5) * 0.9;
      const step = 14 + Math.random() * 30;
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  return d;
}

const TONES = ["#e4c6b8", "#dcb9aa", "#cf9f8e", "#c69584"];

function throwPieces(
  breach: HTMLElement,
  burst: (typeof BURSTS)[number],
  cx: number,
  cy: number,
  radius: number,
  ragged: number[],
  vh: number,
): void {
  for (let n = 0; n < burst.pieces; n++) {
    const k = Math.floor(Math.random() * SIDES);
    const a = (k / SIDES) * Math.PI * 2;
    const r = radius * ragged[k] * (0.7 + Math.random() * 0.4);
    const [min, max] = burst.size;
    const size = min + Math.random() * (max - min);
    // Flakes, not gems: flat, uneven, longer one way than the other.
    const corners = 4 + Math.floor(Math.random() * 4);
    const squash = 0.45 + Math.random() * 0.4;
    const shape = Array.from({ length: corners }, (_, i) => {
      const b = (i / corners) * Math.PI * 2 + (Math.random() - 0.5) * 0.9;
      const s = 22 + Math.random() * 28;
      return `${(50 + Math.cos(b) * s).toFixed(0)}% ${(50 + Math.sin(b) * s * squash).toFixed(0)}%`;
    }).join(",");

    const piece = document.createElement("span");
    piece.className = "breach__bit";
    piece.style.setProperty("--size", `${size.toFixed(0)}px`);
    piece.style.setProperty("--x", `${(cx + Math.cos(a) * r - size / 2).toFixed(0)}px`);
    piece.style.setProperty("--y", `${(cy + Math.sin(a) * r - size / 2).toFixed(0)}px`);
    piece.style.setProperty("--drift", `${((Math.random() - 0.5) * 70 + Math.cos(a) * 30).toFixed(0)}px`);
    piece.style.setProperty("--spin", `${((Math.random() < 0.5 ? -1 : 1) * (140 + Math.random() * 320)).toFixed(0)}deg`);
    // Heavier pieces from higher up fall further; all of them are gone
    // before the page leaves.
    piece.style.setProperty("--fall", `${(420 + Math.random() * 220 + (1 - (cy + Math.sin(a) * r) / vh) * 80).toFixed(0)}ms`);
    piece.style.setProperty("--tone", TONES[Math.floor(Math.random() * TONES.length)]);
    piece.style.setProperty("--shape", `polygon(${shape})`);
    breach.append(piece);
  }
}

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const easeInOut = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
