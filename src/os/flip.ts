/**
 * The flip: a reading window opens on the flavour and turns to paper as it is
 * scrolled. The ground is a function of the scroll position alone, so every
 * position has exactly one frame and nothing runs at rest.
 *
 * The contrast through it is the point. Half way from a saturated colour to
 * white, the ground passes through a tone where only pure black or pure white
 * clears AA, and either does (the worst case is 4.58:1, where they tie). So the
 * text is never interpolated. It holds pure white or pure black, whichever
 * reads better on the two stops of the ground as they stand, and quieter inks
 * come back only at the ends. scripts/test-desktop-motion.mjs measures it from
 * rendered pixels at every step, on every flavour, at both widths.
 */

type RGB = [number, number, number];

const PAPER: RGB = [255, 255, 255];
/** How much of the window's height of scrolling the flip spends. */
const RUN = 0.62;
/** A document with less room to scroll than this just opens as paper. */
const SHORT = 56;

function token(name: string): RGB {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: RGB): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB) => `rgb(${c.map((v) => Math.round(v)).join(" ")})`;

/** Binds the flip to a window's scroller. Returns what undoes it. */
export function attachFlip(win: HTMLElement, body: HTMLElement): () => void {
  win.classList.add("win--flip");
  let flavour = token("--fl-body");

  const update = () => {
    const room = body.scrollHeight - body.clientHeight;
    const short = room < SHORT;
    win.classList.toggle("win--flat", short);
    const run = Math.max(1, Math.min(room, body.clientHeight * RUN));
    const u = short ? 1 : Math.max(0, Math.min(1, body.scrollTop / run));
    const p = u * u * (3 - 2 * u);

    // One flat colour, because the 4.58:1 floor only holds on one: a second stop
    // keeps the ink on the wrong side of the tie for part of the way.
    const a = mix(flavour, PAPER, p);
    const b = a;
    const la = luminance(a), lb = luminance(b);
    const onWhite = Math.min(contrast(1, la), contrast(1, lb));
    const onBlack = Math.min(contrast(0, la), contrast(0, lb));
    body.style.setProperty("--ground-a", css(a));
    body.style.setProperty("--ground-b", css(b));
    body.style.setProperty("--doc-ink", onWhite > onBlack ? "#ffffff" : "#000000");
    body.dataset.ground = p >= 1 ? "paper" : "flavour";
  };

  const recolour = () => {
    flavour = token("--fl-body");
    update();
  };

  const resize = new ResizeObserver(update);
  resize.observe(body);
  body.addEventListener("scroll", update, { passive: true });
  const desk = new MutationObserver(recolour);
  desk.observe(document.documentElement, { attributes: true, attributeFilter: ["data-desk"] });
  update();

  return () => {
    resize.disconnect();
    desk.disconnect();
    body.removeEventListener("scroll", update);
  };
}

/**
 * The weighted wheel (src/front/weight.ts), for a window's scroller. A wheel or
 * trackpad sets a target and the scroller eases a tenth of the way there each
 * frame, so a flick keeps travelling and the flip has some weight to it. Fine
 * pointers only, never under reduced motion, and no frame requested at rest.
 */
export function weighWheel(body: HTMLElement): void {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const LERP = 0.1;
  let current = 0, target = 0, raf = 0, last = 0, written = -1;

  const frame = (now: number) => {
    raf = 0;
    if (written >= 0 && Math.abs(body.scrollTop - written) > 2) {
      last = 0;
      written = -1;
      return;
    }
    const dt = last ? Math.min(64, now - last) : 1000 / 60;
    last = now;
    current += (target - current) * (1 - (1 - LERP) ** (dt / (1000 / 60)));
    if (Math.abs(target - current) < 0.4) current = target;
    body.scrollTop = current;
    written = body.scrollTop;
    if (current !== target) raf = requestAnimationFrame(frame);
    else {
      last = 0;
      written = -1;
    }
  };

  body.addEventListener("wheel", (event) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const max = body.scrollHeight - body.clientHeight;
    if (max <= 0) return;
    let dy = event.deltaY;
    if (event.deltaMode === 1) dy *= 16;
    else if (event.deltaMode === 2) dy *= body.clientHeight;
    event.preventDefault();
    if (!raf) current = target = body.scrollTop;
    target = Math.max(0, Math.min(max, target + dy));
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: false });
}
