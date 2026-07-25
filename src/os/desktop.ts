/**
 * Desktop items and the dock.
 *
 * Every launcher is a real <button data-open="…">, so the keyboard path is the
 * same path as the mouse path. Double-click is an addition on top of that, not
 * the way in — a desktop that can only be opened by double-clicking is a
 * desktop nobody using a keyboard can open at all.
 */

import { openDoc, isOpen, onWindowsChange } from "./windows";

export function initLaunchers(): void {
  for (const el of document.querySelectorAll<HTMLElement>("[data-open]")) {
    const id = el.dataset.open as string;

    // Desktop icons follow the OS: one click selects, two opens. Everything
    // else (dock, menus) opens on a single click.
    if (el.classList.contains("icon")) {
      el.addEventListener("click", () => select(el));
      el.addEventListener("dblclick", () => openDoc(id));
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select(el);
          openDoc(id);
        }
      });
    } else {
      el.addEventListener("click", () => openDoc(id));
    }
  }

  // Clicking bare desktop clears the selection, as it should.
  document.getElementById("desk")?.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest(".icon") && !target.closest(".win")) clearSelection();
  });
}

function clearSelection(): void {
  for (const el of document.querySelectorAll(".icon.is-selected")) {
    el.classList.remove("is-selected");
    el.setAttribute("aria-pressed", "false");
  }
}

function select(icon: HTMLElement): void {
  clearSelection();
  icon.classList.add("is-selected");
  icon.setAttribute("aria-pressed", "true");
}

/**
 * Dock magnification.
 *
 * The falloff is computed per item from the pointer's horizontal distance, so
 * neighbours swell in a curve instead of each icon snapping on its own hover.
 * Written to a custom property; the actual transform lives in CSS.
 */
export function initDock(): void {
  const dock = document.getElementById("dock");
  if (!dock) return;

  const items = [...dock.querySelectorAll<HTMLElement>(".dockitem")];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)");

  const clear = () => {
    for (const item of items) item.style.removeProperty("--mag");
  };

  dock.addEventListener("pointermove", (event) => {
    if (reduced.matches || coarse.matches) return;
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      const centre = rect.left + rect.width / 2;
      const distance = Math.abs(event.clientX - centre);
      const reach = 96;
      // Cosine falloff: smooth at both ends, no discontinuity at the edge.
      const mag =
        distance > reach ? 0 : (Math.cos((distance / reach) * Math.PI) + 1) / 2;
      item.style.setProperty("--mag", mag.toFixed(3));
    }
  });

  dock.addEventListener("pointerleave", clear);
  reduced.addEventListener("change", clear);

  // Running indicators reflect real window state.
  onWindowsChange(() => {
    for (const item of items) {
      const id = item.dataset.open;
      item.classList.toggle("is-running", Boolean(id && isOpen(id)));
    }
  });
}
