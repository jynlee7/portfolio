/**
 * Draggable desktop items.
 *
 * The icons ship as a CSS grid, which is what the no-JS page and the mobile
 * home screen keep. On a pointer-driven desktop they are promoted to free
 * positions: every icon is measured WHERE THE GRID ALREADY PUT IT and then
 * switched to absolute at exactly those coordinates, so nothing moves at the
 * moment the promotion happens.
 *
 * Positions persist. A desktop that forgets where you left things is a
 * demo of dragging, not a desktop.
 *
 * Dragging is not the only way to arrange: a focused icon moves under the
 * arrow keys too. A feature that exists only for the mouse would undo the
 * keyboard path every other launcher here is careful to keep.
 */

const KEY = "jl.icons";

/** Keyboard nudge, and the coarser step with Shift held. */
const NUDGE = 8;
const NUDGE_FAR = 24;

/** Kept clear at the bottom so an icon can never be parked under the dock
 *  where it cannot be grabbed again. */
const DOCK_SAFE = 78;

type Point = [number, number];

let free = false;
let lastDragEnd = 0;

export function initArrange(): void {
  const desk = document.getElementById("desk");
  const shelf = document.getElementById("icons");
  const column = document.querySelector<HTMLElement>(".deskcol");
  if (!desk || !shelf || !column) return;

  const icons = [...shelf.querySelectorAll<HTMLElement>(".icon")];
  if (icons.length === 0) return;

  // The grid is the right answer on a phone: a home screen you can smear out
  // of alignment with a stray thumb is worse than one you cannot move.
  const roomy = window.matchMedia("(min-width: 781px) and (pointer: fine)");

  /**
   * Wait for a layout worth measuring before promoting.
   *
   * Both entry points are early: at boot the webfont may still be swapping,
   * and the media query fires before the wide layout has been applied.
   * Measuring then reports a collapsed desk, and every icon clamps to the
   * origin — five icons in one stack, which is a far worse failure than a
   * frame of delay. The grid is already on screen throughout, so waiting is
   * invisible.
   */
  const promote = (attempt = 0): void => {
    if (free) return;
    const deskBox = desk.getBoundingClientRect();
    const settled =
      deskBox.width > 200 && deskBox.height > 200 && icons[0].offsetWidth > 0;

    if (!settled) {
      // ~10 frames is generous; give up rather than spin forever, and leave
      // the grid in place, which is a perfectly good layout on its own.
      if (attempt < 10) requestAnimationFrame(() => promote(attempt + 1));
      return;
    }

    const seeded = new Map<string, Point>();
    for (const icon of icons) {
      const box = icon.getBoundingClientRect();
      seeded.set(idOf(icon), [box.left - deskBox.left, box.top - deskBox.top]);
    }

    // Sits between the field canvas and the nameplate/rail, so a dragged icon
    // slides under the fixed furniture rather than over it.
    desk.insertBefore(shelf, column);
    shelf.classList.add("is-free");
    free = true;

    const stored = load();
    for (const icon of icons) {
      const id = idOf(icon);
      const at = stored[id] ?? seeded.get(id) ?? [0, 0];
      moveTo(icon, at[0], at[1], desk);
    }

    shelf.dataset.seed = JSON.stringify([...seeded]);
  };

  const revert = (): void => {
    if (!free) return;
    // Back into the column so the grid and the mobile layout own it again.
    column.append(shelf);
    shelf.classList.remove("is-free");
    for (const icon of icons) {
      icon.style.removeProperty("left");
      icon.style.removeProperty("top");
    }
    free = false;
  };

  if (roomy.matches) promote();
  roomy.addEventListener("change", (event) => {
    if (event.matches) promote();
    else revert();
  });

  for (const icon of icons) wire(icon, desk, () => save(icons));

  // A narrower window can strand an icon outside the desk. Pull them back.
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    if (!free) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      // Re-checked here, not only when scheduling: a resize that crosses the
      // breakpoint reverts to the grid in between, and re-applying
      // coordinates afterwards would put stale inline offsets back on it.
      if (!free) return;
      for (const icon of icons) {
        moveTo(icon, numeric(icon.style.left), numeric(icon.style.top), desk);
      }
      save(icons);
    }, 140);
  });

  // Exposed for the View menu.
  tidy = () => {
    if (!free) return;
    const seeded = new Map<string, Point>(
      JSON.parse(shelf.dataset.seed ?? "[]") as [string, Point][],
    );
    for (const icon of icons) {
      const at = seeded.get(idOf(icon)) ?? [0, 0];
      moveTo(icon, at[0], at[1], desk);
    }
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };
}

/** Restore the icons to the layout the grid would have given them. */
export let tidy: () => void = () => {};

function idOf(icon: HTMLElement): string {
  return icon.dataset.open ?? "";
}

function numeric(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Place an icon, clamped so it always stays fully grabbable on the desk. */
function moveTo(icon: HTMLElement, x: number, y: number, desk: HTMLElement): void {
  const deskBox = desk.getBoundingClientRect();
  const w = icon.offsetWidth;
  const h = icon.offsetHeight;
  const maxX = Math.max(0, deskBox.width - w);
  const maxY = Math.max(0, deskBox.height - h - DOCK_SAFE);
  icon.style.left = `${Math.min(Math.max(x, 0), maxX)}px`;
  icon.style.top = `${Math.min(Math.max(y, 0), maxY)}px`;
}

function wire(icon: HTMLElement, desk: HTMLElement, persist: () => void): void {
  icon.addEventListener("pointerdown", (event) => {
    if (!free || event.button !== 0) return;

    const deskBox = desk.getBoundingClientRect();
    const box = icon.getBoundingClientRect();
    const grabX = event.clientX - box.left;
    const grabY = event.clientY - box.top;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;

    // Keeps the drag alive when the cursor outruns the icon. Not fatal if the
    // browser refuses the capture; the listeners below still track it.
    try {
      icon.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    const move = (e: PointerEvent) => {
      // A few pixels of slop, so a slightly shaky click is still a click.
      if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) < 4) return;
      if (!moved) {
        moved = true;
        icon.classList.add("is-dragging");
      }
      moveTo(icon, e.clientX - deskBox.left - grabX, e.clientY - deskBox.top - grabY, desk);
    };

    const up = () => {
      icon.removeEventListener("pointermove", move);
      icon.removeEventListener("pointerup", up);
      icon.removeEventListener("pointercancel", up);
      if (!moved) return;
      icon.classList.remove("is-dragging");
      lastDragEnd = performance.now();
      persist();
    };

    icon.addEventListener("pointermove", move);
    icon.addEventListener("pointerup", up);
    icon.addEventListener("pointercancel", up);
  });

  // Releasing a drag fires a click, and two quick drags can pair into a
  // dblclick. Neither should open the document. Capture phase, so this runs
  // before the launcher bound in desktop.ts.
  icon.addEventListener(
    "dblclick",
    (event) => {
      if (performance.now() - lastDragEnd < 400) {
        event.stopPropagation();
        event.preventDefault();
      }
    },
    { capture: true },
  );

  // Arrow keys arrange from the keyboard.
  icon.addEventListener("keydown", (event) => {
    if (!free) return;
    const step = event.shiftKey ? NUDGE_FAR : NUDGE;
    const delta: Record<string, Point> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = delta[event.key];
    if (!d) return;
    event.preventDefault();
    moveTo(icon, numeric(icon.style.left) + d[0], numeric(icon.style.top) + d[1], desk);
    persist();
  });
}

function load(): Record<string, Point> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Point>) : {};
  } catch {
    return {};
  }
}

function save(icons: HTMLElement[]): void {
  const out: Record<string, Point> = {};
  for (const icon of icons) {
    out[idOf(icon)] = [numeric(icon.style.left), numeric(icon.style.top)];
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    /* Private mode. Dragging still works, it just will not be remembered. */
  }
}
