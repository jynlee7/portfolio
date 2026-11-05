/**
 * The login.
 *
 * It is the first viewport once the boot has cleared, and it carries almost
 * nothing over the name and the wallpaper, which are the desk's own and stay
 * where they are when it goes: the time this machine keeps, one sentence, and
 * a pulsing default button. The whole surface is the door as well, so a click
 * anywhere works and the button is there for the keyboard and for the eye.
 * Everything a visitor came for is one step away, in the menubar and on the desk.
 *
 * Unlock state lives in sessionStorage: coming back from the résumé PDF or
 * reloading should not make anyone dismiss the same screen twice.
 */

import { booting } from "./boot";

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

  // A deep link (/desktop/#resume, from an email or an application) is a visitor
  // who already chose a door. Making them wake the machine first would put
  // the window they asked for behind a screen they did not.
  const target = location.hash.slice(1);
  if (target && document.getElementById(`doc-${target}`)) {
    woken = true;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (woken) {
    document.documentElement.classList.add("awake");
    lock.remove();
    return;
  }

  document.documentElement.classList.remove("awake");
  lock.hidden = false;
  startClock();

  // Deliberately no autofocus. Chromium treats a programmatic focus() as
  // keyboard-initiated and paints the :focus-visible ring, which drew a box
  // around the hint and turned the one line that says "this is not a button"
  // into a button. Nothing is lost: any keypress wakes the machine, and Tab
  // reaches the hint immediately.

  const wake = () => {
    if (lock.classList.contains("is-waking") || booting()) return;
    lock.classList.add("is-waking");
    // The name and the wallpaper stay where they are. Only the chrome arrives.
    const root = document.documentElement;
    root.classList.add("awake", "is-arriving");
    window.setTimeout(() => root.classList.remove("is-arriving"), 1400);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }

    let entered = false;
    const done = () => {
      // Both the transition and the fallback timer land here; only the first
      // one is the visitor walking in.
      if (entered) return;
      entered = true;
      lock.remove();
      document.querySelector<HTMLElement>(".icon")?.focus();
      // Mpa (src/os/mpa.ts) greets from this. A deep link or a reload never
      // reaches here, which is exactly when there is nobody new to greet.
      document.dispatchEvent(new Event("jl:enter"));
    };
    // An exit runs about half its entrance (--exit in tokens.css). Under reduced
    // motion it is still one frame, so the menubar is showing before this goes.
    window.setTimeout(done, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 40 : 220);
  };

  lock.addEventListener("click", wake);
  document.addEventListener("keydown", (event) => {
    if (!lock.isConnected || booting()) return;
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

/** The login's words arrive. Called as the boot clears them, or at once. */
export function showLock(): void {
  document.getElementById("lock")?.classList.add("is-in");
}

/** Log out from the menubar. Rebuilding the screen is not worth it; a reload
 *  after clearing the flag returns the machine to its login exactly. */
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
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
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
