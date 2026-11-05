/**
 * Desktop items.
 *
 * Every launcher is a real <button data-open="…">, so the keyboard path is the
 * same path as the mouse path. Double-click is an addition on top of that, not
 * the way in — a desktop that can only be opened by double-clicking is a
 * desktop nobody using a keyboard can open at all.
 */

import { draggedJustNow } from "./arrange";
import { openDoc } from "./windows";

export function initLaunchers(): void {
  for (const el of document.querySelectorAll<HTMLElement>("[data-open]")) {
    const id = el.dataset.open as string;

    // Desktop icons follow the OS: with a mouse one click selects and two
    // open. A finger has no hover to select with, and a double tap is the
    // browser's zoom, so on a touch screen one tap opens, as on a phone's home
    // screen. The pointer is read per press rather than from a media query, so
    // a touch laptop answers to whichever the visitor used. Everything else
    // (menus) opens on a single click.
    if (el.classList.contains("icon")) {
      let touched = false;
      el.addEventListener("pointerdown", (event) => {
        touched = event.pointerType !== "mouse";
      });
      el.addEventListener("click", () => {
        select(el);
        if (touched && !draggedJustNow()) openDoc(id);
        touched = false;
      });
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
