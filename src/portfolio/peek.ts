/**
 * The computer under the page.
 *
 * The portfolio is laid over the machine this site used to be. Nothing on the
 * page says so. Stay long enough (DWELL of the tab actually being visible) and
 * a corner of the page comes apart in square bits, each one turning over to
 * show the desktop's contour field underneath, framed on its deepest well.
 * The desktop's own window chrome then closes around them: a near-black bar,
 * a filename, a bone panel. "Go in" turns the whole screen over the same way,
 * onto the field exactly as the desktop's lock screen paints it, and only
 * then navigates, so the lock screen arrives as the thing already showing.
 *
 * Costs nothing before it opens and nothing after: one setTimeout, paused on
 * a hidden tab, then CSS keyframes on transforms. There is no loop. It does
 * not exist without JavaScript, and under reduced motion the bits are simply
 * there and "Go in" is an ordinary link.
 *
 * sessionStorage `jl.peek`: "seen" brings it back quickly on a reload,
 * "shut" keeps it closed for the rest of the visit.
 */

import "./peek.css";

const DWELL = 20_000;
const RETURN = 1_200;
const KEY = "jl.peek";
const THEMES = ["lab", "slate", "blueprint"];

/** The porthole, in bits: 16 × 8 of 16px in a corner card. On a phone a
 *  card that tall would sit on the résumé button, so it becomes a strip
 *  across the bottom instead, four rows deep, its bits sized to the screen. */
const COLS = 16;
const ROWS = 8;
const STRIP_ROWS = 4;
const STRIP_BELOW = 600;
/** Delay between successive diagonals of bits, plus scatter so they read as
 *  bits turning over rather than a wipe. */
const STEP = 18;
const SCATTER = 90;
/** Keep in step with peek.css: --peek-flip, --peek-shut, --veil-flip. */
const FLIP = 260;
const SHUT = 340;
const VEIL_SPREAD = 320;
const VEIL_FLIP = 300;

/** The field's frame, from src/field/core.ts. Not imported: that module is
 *  the desktop's, and the homepage never loads desktop code. */
const FRAME = { w: 1600, h: 1000 };

const arrow =
  '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function read(store: () => Storage, key: string): string | null {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
}

function remember(value: "seen" | "shut"): void {
  try {
    sessionStorage.setItem(KEY, value);
  } catch {
    /* Private mode: it simply comes back on the next visit. */
  }
}

export function initPeek(): void {
  const state = read(() => sessionStorage, KEY);
  if (state === "shut") return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  // The wallpaper the visitor last chose on the desktop, if they have been.
  const chosen = read(() => localStorage, "jl.desk");
  const theme = chosen && THEMES.includes(chosen) ? chosen : "lab";
  const wallpaper = `/field-${theme}.svg`;

  // Announced once, politely. A live region has to exist before its text
  // changes, so it goes in now, empty.
  const status = document.createElement("p");
  status.className = "peek-status";
  status.setAttribute("role", "status");
  document.body.append(status);

  let remaining = state === "seen" ? RETURN : DWELL;
  let started = 0;
  let timer = 0;

  const arm = () => {
    if (timer || document.hidden) return;
    started = performance.now();
    timer = window.setTimeout(open, remaining);
  };
  const disarm = () => {
    if (!timer) return;
    window.clearTimeout(timer);
    timer = 0;
    remaining = Math.max(0, remaining - (performance.now() - started));
  };
  const onVisibility = () => (document.hidden ? disarm() : arm());
  document.addEventListener("visibilitychange", onVisibility);
  arm();

  // Back from the desktop restores this page from the bfcache with the
  // screen still turned over. Turn it back.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) document.querySelector(".peek-veil")?.remove();
  });

  async function open(): Promise<void> {
    timer = 0;
    document.removeEventListener("visibilitychange", onVisibility);
    remember("seen");

    // A bit that turns over onto nothing is worse than a bit that waits.
    try {
      const image = new Image();
      image.src = wallpaper;
      await image.decode();
    } catch {
      /* The bits fall back to the desktop's bone colour. */
    }

    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = "/desktop/";
    document.head.append(prefetch);

    const width = document.documentElement.clientWidth;
    const rows = width <= STRIP_BELOW ? STRIP_ROWS : ROWS;
    const peek = build(rows);
    if (rows === STRIP_ROWS) {
      peek.classList.add("peek--strip");
      peek.style.setProperty("--bit", `${Math.floor((width - 24) / COLS)}px`);
    }
    document.body.append(peek);
    status.textContent = "There's a computer under this page.";

    if (reduced.matches) {
      peek.dataset.state = "open";
      return;
    }
    // The chrome closes in as the last bits land, not after.
    const last = (COLS - 1 + rows - 1) * STEP + SCATTER;
    window.setTimeout(() => {
      if (peek.dataset.state === "opening") peek.dataset.state = "open";
    }, last + FLIP - 120);
  }

  function build(rows: number): HTMLElement {
    const peek = document.createElement("section");
    peek.className = "peek";
    peek.dataset.state = "opening";
    peek.setAttribute("aria-label", "Jayden's desktop");
    peek.style.setProperty("--peek-field", `url("${wallpaper}")`);
    peek.style.setProperty("--peek-rows", String(rows));

    // Bits turn over from the corner of the screen inward, the way a page
    // would come away from its edge.
    let bits = "";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const d = (COLS - 1 - c + (rows - 1 - r)) * STEP + Math.round(Math.random() * SCATTER);
        bits += `<span class="peek__bit" style="--c:${c};--r:${r};--d:${d}ms"></span>`;
      }
    }

    peek.innerHTML =
      `<header class="peek__bar">` +
      `<button class="peek__close" type="button" aria-label="Close">✕</button>` +
      `<span class="peek__title">field-${theme}.svg</span>` +
      `<span class="peek__meta">wallpaper</span>` +
      `</header>` +
      // The whole porthole is a door too, for a pointer. The labelled link
      // below is the one in the tab order and the accessibility tree.
      `<a class="peek__field" href="/desktop/" tabindex="-1" aria-hidden="true">${bits}</a>` +
      `<div class="peek__foot">` +
      `<p>There's a computer under this page.</p>` +
      `<a class="peek__enter" href="/desktop/">Go in${arrow}</a>` +
      `</div>`;

    peek.querySelector(".peek__close")?.addEventListener("click", () => shut(peek));
    peek.addEventListener("keydown", (event) => {
      if (event.key === "Escape") shut(peek);
    });
    const field = peek.querySelector<HTMLElement>(".peek__field")!;
    for (const link of peek.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      link.addEventListener("click", (event) => goIn(event, link, field));
    }
    return peek;
  }

  function shut(peek: HTMLElement): void {
    if (peek.dataset.state === "closing") return;
    remember("shut");
    const hadFocus = peek.contains(document.activeElement);
    peek.dataset.state = "closing";
    status.textContent = "";
    if (hadFocus) document.getElementById("main")?.focus({ preventScroll: true });
    if (reduced.matches) peek.remove();
    else window.setTimeout(() => peek.remove(), SHUT);
  }

  function goIn(event: MouseEvent, link: HTMLAnchorElement, field: HTMLElement): void {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (reduced.matches || document.querySelector(".peek-veil")) return;
    event.preventDefault();
    // Tells the desktop's lock screen the field is already showing, so it
    // keeps it at rest instead of raising it again from nothing.
    try {
      sessionStorage.setItem("jl.through", "1");
    } catch {
      /* The lock replays its entrance. */
    }
    document.body.append(veil(field.getBoundingClientRect()));
    window.setTimeout(() => location.assign(link.href), VEIL_SPREAD + VEIL_FLIP + 60);
  }

  /** The whole viewport, turned over onto the field as the lock screen paints
   *  it: `center / cover` of the same SVG. Spreads out from the porthole. */
  function veil(from: DOMRect): HTMLElement {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const size = vw < 600 ? 48 : 72;
    const cols = Math.ceil(vw / size);
    const rows = Math.ceil(vh / size);
    const scale = Math.max(vw / FRAME.w, vh / FRAME.h);
    const fw = FRAME.w * scale;
    const fh = FRAME.h * scale;

    const cx = from.left + from.width / 2;
    const cy = from.top + from.height / 2;
    const far = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(vw - cx, cy),
      Math.hypot(cx, vh - cy),
      Math.hypot(vw - cx, vh - cy),
    );

    let bits = "";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const distance = Math.hypot(c * size + size / 2 - cx, r * size + size / 2 - cy);
        const d = Math.round((distance / far) * VEIL_SPREAD);
        bits += `<span class="peek-veil__bit" style="--c:${c};--r:${r};--d:${d}ms"></span>`;
      }
    }

    const el = document.createElement("div");
    el.className = "peek-veil";
    el.setAttribute("aria-hidden", "true");
    el.style.setProperty("--peek-field", `url("${wallpaper}")`);
    el.style.setProperty("--vb", `${size}px`);
    el.style.setProperty("--fw", `${fw}px`);
    el.style.setProperty("--fh", `${fh}px`);
    el.style.setProperty("--ox", `${(vw - fw) / 2}px`);
    el.style.setProperty("--oy", `${(vh - fh) / 2}px`);
    el.innerHTML = bits;
    return el;
  }
}
