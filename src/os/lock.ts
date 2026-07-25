/**
 * Lock screen.
 *
 * It is the first viewport and it carries almost nothing: the time this
 * machine keeps, whose it is, and one line worth being curious about. There
 * are no controls on it, because the whole surface is the door — a machine
 * you have to be told how to open is not one anybody wants to use. Everything
 * a visitor actually came for is one wake away, in the dock, the menubar and
 * on the desk itself.
 *
 * Unlock state lives in sessionStorage: coming back from the résumé PDF or
 * reloading should not make anyone dismiss the same screen twice.
 */

const KEY = "jl.woke";

export function initLock(): void {
  const lock = document.getElementById("lock");
  if (!lock) return;

  let woken = false;
  try {
    woken = sessionStorage.getItem(KEY) === "1";
  } catch {
    /* Private mode. Show the lock screen; it is not important enough to fight
       over. */
  }

  if (woken) {
    lock.remove();
    return;
  }

  lock.hidden = false;
  startClock();

  // Focus the way in so keyboard and screen-reader visitors land on it rather
  // than tabbing past the skip link to find it.
  document.getElementById("lock-enter")?.focus({ preventScroll: true });

  const wake = () => {
    if (lock.classList.contains("is-waking")) return;
    lock.classList.add("is-waking");
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }

    const done = () => {
      lock.remove();
      document.querySelector<HTMLElement>(".icon")?.focus();
    };
    lock.addEventListener("transitionend", done, { once: true });
    // Belt and braces: if the transition never fires (reduced motion, a
    // backgrounded tab), remove it anyway.
    window.setTimeout(done, 800);
  };

  lock.addEventListener("click", wake);
  document.addEventListener("keydown", (event) => {
    if (!lock.isConnected) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    // Tab is how a keyboard visitor looks around. Waking on it would throw
    // them through the door for trying the handle.
    if (event.key === "Tab") return;
    // Bare modifier presses are not a decision either.
    if (event.key === "Shift" || event.key === "Control") return;
    if (event.key === "Alt" || event.key === "Meta") return;
    wake();
  });
}

/**
 * Mount the contour field into the lock screen and let it resolve.
 *
 * The desktop paints the same field as a CSS background, which arrives all at
 * once. Inlining it here buys one thing: the generator writes each of the 26
 * contour levels as its own `<path>`, so they can be raised in order —
 * deepest first, which fills the two wells and then climbs the level sets out
 * of them. A loss surface converging, drawn from the surface this site's
 * wallpaper is actually generated from.
 *
 * Resolves when the entrance is over, so the caller can hand the field to the
 * live pointer-driven canvas without the two competing.
 */
export async function mountLockField(lock: HTMLElement): Promise<void> {
  const slot = lock.querySelector<HTMLElement>(".lock__field");
  if (!slot || !lock.isConnected) return;

  const url = wallpaperURL();
  if (!url) return;

  let markup: string;
  try {
    const response = await fetch(url);
    if (!response.ok) return;
    markup = await response.text();
  } catch {
    // The CSS background is still painting underneath, so a failed fetch
    // costs the entrance and nothing else.
    return;
  }

  if (!lock.isConnected) return;

  // The generator names its gradients `bg` and `glow`. Inlining would drop
  // both into the document's id namespace next to the icon sprite; namespace
  // them on the way in.
  markup = markup
    .replace(/id="(bg|glow)"/g, 'id="lockfield-$1"')
    .replace(/url\(#(bg|glow)\)/g, "url(#lockfield-$1)");

  slot.insertAdjacentHTML("beforeend", markup);
  lock.classList.add("lock--field");

  const levels = [...slot.querySelectorAll<SVGPathElement>("svg > g > path")];
  if (levels.length === 0) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    for (const level of levels) level.style.opacity = "1";
    return;
  }

  const STEP = 26;
  const FADE = 420;

  await new Promise<void>((resolve) => {
    // Two frames: one for the browser to lay the SVG out, one so the
    // transition has a start value to animate from.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        levels.forEach((level, i) => {
          level.style.transition = `opacity ${FADE}ms var(--ease-out) ${i * STEP}ms`;
          level.style.opacity = "1";
        });
        window.setTimeout(resolve, levels.length * STEP + FADE);
      });
    });
  });
}

/** The wallpaper the current desk is set to, read off the token rather than
 *  hardcoded, so the three themes cannot drift from this. */
function wallpaperURL(): string | null {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--wallpaper",
  );
  return raw.match(/url\(["']?([^"')]+)["']?\)/)?.[1] ?? null;
}

/** Re-lock from the menubar. Rebuilding the screen is not worth it; a reload
 *  after clearing the flag returns the machine to its cold state exactly. */
export function relock(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  location.reload();
}

/**
 * The clock reads Berkeley time, not the visitor's. This is Jayden's machine;
 * showing the visitor their own clock would say nothing.
 */
function startClock(): void {
  const time = document.getElementById("lock-clock");
  const date = document.getElementById("lock-date");
  if (!time || !date) return;

  const tz = "America/Los_Angeles";
  const tick = () => {
    const now = new Date();
    time.textContent = now.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    date.textContent = now.toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  tick();
  window.setInterval(tick, 10_000);
}
