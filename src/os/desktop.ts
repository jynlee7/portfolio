/**
 * Desktop items.
 *
 * Every launcher is a real <button data-open="…">, so the keyboard path is the
 * same path as the mouse path. Double-click is an addition on top of that, not
 * the way in — a desktop that can only be opened by double-clicking is a
 * desktop nobody using a keyboard can open at all.
 */

import { openDoc } from "./windows";

export function initLaunchers(): void {
  for (const el of document.querySelectorAll<HTMLElement>("[data-open]")) {
    const id = el.dataset.open as string;

    // Desktop icons follow the OS: one click selects, two opens. Everything
    // else (menus) opens on a single click.
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
