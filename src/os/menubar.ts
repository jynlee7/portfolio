/**
 * Menubar: dropdown menus, the wallpaper switch, and the bar clock.
 *
 * Menus follow the desktop convention rather than a web one — click to open,
 * then hovering a sibling switches to it without a second click.
 */

import { closeAll } from "./windows";
import { relock } from "./lock";

const DESK_KEY = "jl.desk";

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

function startBarClock(): void {
  const clock = document.getElementById("bar-clock");
  if (!clock) return;

  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  tick();
  window.setInterval(tick, 20_000);
}
