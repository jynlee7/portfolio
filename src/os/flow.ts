/**
 * Live wallpaper.
 *
 * The desktop background is a contour map of a loss surface. This makes the
 * pointer a perturbation on that surface: a soft gaussian bump follows the
 * cursor with lag, and the contours are RECOMPUTED around it every frame, so
 * lines genuinely bend, split and merge rather than sliding as a parallax
 * layer. It is the one authored moment in a machine whose other motion is all
 * 90-220ms utility.
 *
 * Cost discipline:
 *   - zero frames at rest; the loop only runs while the pointer is on the desk
 *     plus a short settle tail
 *   - the static SVG stays the resting image, so the canvas is transparent
 *     whenever nothing is happening
 *   - never starts under reduced motion, on a coarse pointer, or on a hidden
 *     tab, and stops if the tab is backgrounded mid-gesture
 */

import {
  ASPECT,
  FRAME,
  LEVELS,
  THEMES,
  type Bump,
  type Theme,
  depthOf,
  levelAt,
  marchingSquares,
  sampleGrid,
  strokeFor,
} from "../field/core.ts";

/* Grid resolution in the canonical frame. Fixed rather than derived from the
   viewport so the cost of a frame is the same on every screen. The static SVG
   is sampled far denser; the canvas only shows during motion, which is exactly
   when the eye cannot read the difference. */
const COLS = 148;
const ROWS = 92;

/* Pointer feel. */
const FOLLOW = 0.14; /* position lerp — the lag that makes it flow      */
const AMP_RISE = 0.09; /* how fast the bump swells on entry              */
const AMP_FALL = 0.05; /* how fast it relaxes after the pointer leaves   */
const AMP_REST = 0.4; /* height of the bump while the pointer is still  */
const AMP_SPEED = 0.5; /* extra height from a fast sweep                 */
const SPREAD = 0.34; /* bump radius in field units                     */

const FADE_IN = 0.12;
const FADE_OUT = 0.055;

/**
 * @param host   The surface whose geometry and pointer drive the field.
 * @param mount  Where the canvas is inserted, when that is not the host
 *               itself (the lock screen has a dedicated slot behind its text).
 */
export function initFlow(host: HTMLElement | null, mount?: HTMLElement | null): void {
  const desk = host;
  if (!desk) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)");
  if (reduced.matches || coarse.matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "desk__flow";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;
  (mount ?? desk).prepend(canvas);

  /* --- Geometry ------------------------------------------------------- */

  let dpr = 1;
  let cover = 1;
  let offX = 0;
  let offY = 0;

  /** Emulate `background-size: cover` on the canonical frame, so the canvas
   *  and the SVG underneath are looking at the same crop of the same field. */
  function measure(): void {
    const rect = desk!.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    cover = Math.max(rect.width / FRAME.w, rect.height / FRAME.h);
    offX = (rect.width - FRAME.w * cover) / 2;
    offY = (rect.height - FRAME.h * cover) / 2;
  }

  /** Client pixel -> field coordinate, for placing the bump. */
  function toField(clientX: number, clientY: number): [number, number] {
    const rect = desk!.getBoundingClientRect();
    const px = (clientX - rect.left - offX) / cover;
    const py = (clientY - rect.top - offY) / cover;
    return [(px / FRAME.w) * 2 * ASPECT - ASPECT, (py / FRAME.h) * 2 - 1];
  }

  /* --- State ---------------------------------------------------------- */

  const bump: Bump = { x: 0, y: 0, amp: 0, spread: SPREAD };
  let targetX = 0;
  let targetY = 0;
  let targetAmp = 0;
  let speed = 0;
  let lastX = 0;
  let lastY = 0;
  let inside = false;
  let opacity = 0;
  let raf = 0;

  function theme(): Theme {
    return THEMES[document.documentElement.dataset.desk ?? "lab"] ?? THEMES.lab;
  }

  /* --- Draw ----------------------------------------------------------- */

  function draw(): void {
    const t = theme();
    const rect = { w: canvas.width / dpr, h: canvas.height / dpr };

    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, rect.w, rect.h);
    ctx!.globalAlpha = opacity;

    // Work in canonical units from here so gradients, stroke widths and the
    // grid all land exactly where the SVG puts them.
    ctx!.setTransform(cover * dpr, 0, 0, cover * dpr, offX * dpr, offY * dpr);

    const bg = ctx!.createLinearGradient(0, 0, FRAME.w * 0.6, FRAME.h);
    for (const stop of t.backdrop) bg.addColorStop(stop.offset, stop.color);
    ctx!.fillStyle = bg;
    ctx!.fillRect(0, 0, FRAME.w, FRAME.h);

    const glow = ctx!.createRadialGradient(
      FRAME.w * 0.24,
      FRAME.h * 0.46,
      0,
      FRAME.w * 0.24,
      FRAME.h * 0.46,
      FRAME.w * 0.5,
    );
    glow.addColorStop(0, t.glow);
    glow.addColorStop(1, "transparent");
    ctx!.fillStyle = glow;
    ctx!.fillRect(0, 0, FRAME.w, FRAME.h);

    const project = (c: number, r: number): [number, number] => [
      (c / (COLS - 1)) * 2 * ASPECT - ASPECT,
      (r / (ROWS - 1)) * 2 - 1,
    ];

    const grid = sampleGrid(COLS, ROWS, project, bump);
    const cellW = FRAME.w / (COLS - 1);
    const cellH = FRAME.h / (ROWS - 1);

    ctx!.lineCap = "round";
    ctx!.lineJoin = "round";

    for (let i = 0; i < LEVELS; i++) {
      const depth = depthOf(i);
      const level = levelAt(i, grid.min, grid.max);

      ctx!.beginPath();
      marchingSquares(grid.values, COLS, ROWS, level, (x1, y1, x2, y2) => {
        ctx!.moveTo(x1 * cellW, y1 * cellH);
        ctx!.lineTo(x2 * cellW, y2 * cellH);
      });

      ctx!.strokeStyle = strokeFor(t, depth);
      ctx!.lineWidth = t.width(depth);
      ctx!.globalAlpha = opacity * t.opacity(depth);
      ctx!.stroke();
    }

    ctx!.globalAlpha = 1;
  }

  /* --- Loop ----------------------------------------------------------- */

  function frame(): void {
    // The lock screen is removed from the DOM once the machine wakes. Stop
    // rather than burning frames drawing into a detached canvas.
    if (!canvas.isConnected) {
      raf = 0;
      return;
    }

    // Position eases toward the pointer; the gap between them IS the flow.
    bump.x += (targetX - bump.x) * FOLLOW;
    bump.y += (targetY - bump.y) * FOLLOW;

    // A fast sweep presses harder than a slow drift.
    targetAmp = inside ? AMP_REST + Math.min(speed * AMP_SPEED, 0.45) : 0;
    const rate = targetAmp > bump.amp ? AMP_RISE : AMP_FALL;
    bump.amp += (targetAmp - bump.amp) * rate;
    speed *= 0.86;

    const targetOpacity = inside || bump.amp > 0.01 ? 1 : 0;
    opacity += (targetOpacity - opacity) * (targetOpacity > opacity ? FADE_IN : FADE_OUT);

    draw();

    // Settled: hand the resting image back to the SVG and stop burning frames.
    if (!inside && bump.amp < 0.004 && opacity < 0.01) {
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      raf = 0;
      return;
    }

    raf = requestAnimationFrame(frame);
  }

  function start(): void {
    if (raf) return;
    raf = requestAnimationFrame(frame);
  }

  function stop(): void {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    opacity = 0;
    bump.amp = 0;
  }

  /* --- Input ---------------------------------------------------------- */

  desk.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    const [fx, fy] = toField(event.clientX, event.clientY);

    if (!inside) {
      // Arrive where the pointer already is, so the bump does not fly in from
      // the last place it was seen.
      bump.x = fx;
      bump.y = fy;
      inside = true;
    } else {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      speed = Math.min(Math.hypot(dx, dy) / 40, 1);
    }

    targetX = fx;
    targetY = fy;
    lastX = event.clientX;
    lastY = event.clientY;
    start();
  });

  desk.addEventListener("pointerleave", () => {
    inside = false;
    start();
  });

  /* --- Lifecycle ------------------------------------------------------ */

  measure();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      measure();
      if (raf) draw();
    }, 120);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      inside = false;
      stop();
    }
  });

  // A wallpaper change while the field is live should repaint immediately.
  new MutationObserver(() => {
    if (raf) draw();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-desk"],
  });

  reduced.addEventListener("change", (event) => {
    if (event.matches) {
      inside = false;
      stop();
    }
  });
}
