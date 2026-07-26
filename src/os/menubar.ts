/**
 * Menubar: dropdown menus, the wallpaper switch, and the bar clock.
 *
 * Menus follow the desktop convention rather than a web one — click to open,
 * then hovering a sibling switches to it without a second click.
 */

import { closeAll } from "./windows";
import { relock } from "./lock";
import { tidy } from "./arrange";

const DESK_KEY = "jl.desk";
const BT_KEY = "jl.bt";
/** Berkeley time is Pacific plus ten. Class starts then; so does everything. */
const BT_OFFSET = 10 * 60_000;

export function initMenubar(): void {
  const menus = [...document.querySelectorAll<HTMLElement>("[data-menu]")];

  const closeMenus = (except?: HTMLElement) => {
    for (const menu of menus) {
      if (menu === except) continue;
      delete menu.dataset.open;
      menu.querySelector(".menu__trigger")?.setAttribute("aria-expanded", "false");
    }
  };

  for (const menu of menus) {
    const trigger = menu.querySelector<HTMLButtonElement>(".menu__trigger");
    if (!trigger) continue;

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const wasOpen = "open" in menu.dataset;
      closeMenus();
      if (!wasOpen) {
        menu.dataset.open = "";
        trigger.setAttribute("aria-expanded", "true");
      }
    });

    // Once one menu is open, sliding across the bar tracks the pointer.
    menu.addEventListener("pointerenter", () => {
      const anyOpen = menus.some((m) => "open" in m.dataset);
      if (!anyOpen) return;
      closeMenus(menu);
      menu.dataset.open = "";
      trigger.setAttribute("aria-expanded", "true");
    });

    // Choosing anything dismisses the menu.
    menu.querySelector(".menu__drop")?.addEventListener("click", () => closeMenus());
  }

  document.addEventListener("click", () => closeMenus());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenus();
  });

  // Actions that belong to the bar itself.
  document.querySelector('[data-action="close-all"]')?.addEventListener("click", closeAll);
  document
    .querySelector('[data-action="tidy"]')
    ?.addEventListener("click", () => tidy());
  document.querySelector('[data-action="lock"]')?.addEventListener("click", relock);

  initWallpaper();
  startBarClock();
}

/** Wallpaper switch. The choice sticks across visits. */
function initWallpaper(): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-desk]")].filter(
    (el) => el.tagName === "BUTTON",
  );

  const apply = (name: string) => {
    document.documentElement.dataset.desk = name;
    for (const button of buttons) {
      button.setAttribute("aria-checked", String(button.dataset.desk === name));
    }
    try {
      localStorage.setItem(DESK_KEY, name);
    } catch {
      /* ignore */
    }
  };

  let saved: string | null = null;
  try {
    saved = localStorage.getItem(DESK_KEY);
  } catch {
    /* ignore */
  }

  apply(saved && buttons.some((b) => b.dataset.desk === saved) ? saved : "lab");

  for (const button of buttons) {
    button.addEventListener("click", () => apply(button.dataset.desk as string));
  }
}

/**
 * The bar clock, which keeps two times.
 *
 * Pacific is the honest one and it is what the bar shows by default — a clock
 * that quietly disagrees with the visitor's own by ten minutes is a bug, not a
 * joke. Clicking switches it to Berkeley time, which is Pacific plus ten,
 * because every class on this campus starts ten minutes after the hour it is
 * scheduled for. It is a real convention, it is labelled `BT`, and the choice
 * sticks the way a menubar clock's display preference does.
 *
 * Nothing about the bar changes until someone points at the clock. That is the
 * entire design of it: no badge, no hint, no width shift.
 */
function startBarClock(): void {
  const clock = document.getElementById("bar-clock");
  const face = document.getElementById("bar-time");
  const tip = document.getElementById("bar-tip");
  if (!clock || !face) return;

  let berkeley = false;
  try {
    berkeley = localStorage.getItem(BT_KEY) === "1";
  } catch {
    /* Private mode. Pacific is the right thing to fall back to. */
  }

  const read = (at: number) =>
    new Date(at).toLocaleTimeString("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const tick = () => {
    const now = Date.now();
    face.textContent = read(berkeley ? now + BT_OFFSET : now);
    clock.setAttribute("aria-pressed", String(berkeley));
    if (tip) {
      // Once it is running ten fast, the tooltip carries the honest time. That
      // gap, stated, is the whole point of the thing.
      tip.textContent = berkeley
        ? `Ten past. Pacific is ${read(now)}.`
        : "Berkeley time — ten past the hour, when lecture actually starts.";
    }
  };

  tick();
  window.setInterval(tick, 20_000);

  clock.addEventListener("click", () => {
    berkeley = !berkeley;
    try {
      localStorage.setItem(BT_KEY, berkeley ? "1" : "0");
    } catch {
      /* ignore */
    }
    tick();
  });

  // Tooltip. The dwell is timed here rather than as a CSS transition-delay,
  // because the reduced-motion block zeroes every delay in the document and a
  // tooltip that fires on the way past is worse than none.
  let dwell = 0;
  const show = () => {
    clock.dataset.tip = "";
  };
  const hide = () => {
    window.clearTimeout(dwell);
    delete clock.dataset.tip;
  };

  clock.addEventListener("pointerenter", (event) => {
    // Touch has no hover to dwell in, and the tap already flips the clock.
    if (event.pointerType !== "mouse") return;
    dwell = window.setTimeout(show, 420);
  });
  clock.addEventListener("pointerleave", hide);
  // Keyboard arrives with intent, so it skips the dwell. A pointer click that
  // moved focus here should not leave a tooltip hanging over the desk.
  clock.addEventListener("focus", () => {
    if (clock.matches(":focus-visible")) show();
  });
  clock.addEventListener("blur", hide);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
}
