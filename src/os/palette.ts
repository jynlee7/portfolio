/**
 * The command palette — ⌘K / Ctrl+K.
 *
 * PRODUCT.md's visitor has ninety seconds and is looking for one file. Every
 * other way into this machine asks them to find something first: the right
 * icon on the desk, the right item in the dock, the right menu. This asks them
 * to type three letters.
 *
 * THE INDEX IS DERIVED, NEVER AUTHORED. Rows are read out of the live DOM
 * every time it opens — the documents from `#docs`, the commands from the
 * menubar's own items. A hand-written list here would be a second copy of
 * facts the whole window manager exists to keep single, and the copy that
 * drifts is always the one nobody is looking at. Nothing in this file knows
 * the name of a single document.
 *
 * It is modal, unlike the windows, which are deliberately not: it is a prompt
 * that owns the machine until it is answered or dismissed.
 */

import { openDoc } from "./windows";

type Row = {
  label: string;
  hint: string;
  run: () => void;
};

let root: HTMLElement | null = null;
let field: HTMLInputElement | null = null;
let list: HTMLElement | null = null;
let empty: HTMLElement | null = null;

let rows: Row[] = [];
let shown: Row[] = [];
let cursor = 0;
/** Where focus was before the palette took it. */
let cameFrom: HTMLElement | null = null;

/** The same breakpoint the window manager uses for bottom sheets. A phone has
 *  no keyboard to press ⌘K with and no room to put the result. */
const narrow = () => window.matchMedia("(max-width: 780px)").matches;

export function initPalette(): void {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "k" && event.key !== "K") return;
    if (!event.metaKey && !event.ctrlKey) return;
    // The lock screen is the door; nothing behind it is reachable yet.
    if (document.getElementById("lock")?.isConnected) return;
    if (narrow()) return;
    event.preventDefault();
    toggle();
  });

  // The menu item, so the shortcut is discoverable by someone who would never
  // guess it. A shortcut nobody can find is a shortcut nobody has.
  document
    .querySelector('[data-action="palette"]')
    ?.addEventListener("click", () => {
      if (!narrow()) window.requestAnimationFrame(openPalette);
    });
}

function toggle(): void {
  if (root?.dataset.open !== undefined) closePalette();
  else openPalette();
}

/* ------------------------------------------------------------------
   The index.
   ------------------------------------------------------------------ */

function collect(): Row[] {
  const out: Row[] = [];

  // Every document that exists, wherever it currently lives — on the shelf or
  // already inside a window. `data-title` and `data-meta` are the same strings
  // the window title bar is built from, so a row can never name a file
  // something the window would not.
  for (const article of document.querySelectorAll<HTMLElement>("article.doc")) {
    const id = article.id.replace(/^doc-/, "");
    if (!id) continue;
    out.push({
      label: article.dataset.title ?? id,
      hint: article.dataset.meta ?? "document",
      run: () => openDoc(id),
    });
  }

  // The commands, read off the menubar items that already perform them, so the
  // palette cannot offer an action the menus do not have.
  for (const item of document.querySelectorAll<HTMLElement>(
    ".menu__drop [data-action], .menu__drop [data-desk]",
  )) {
    // The palette's own menu item would be a row that reopens the palette.
    if (item.dataset.action === "palette") continue;
    const key = item.querySelector(".menu__key")?.textContent ?? "";
    const whole = item.textContent ?? "";
    const label = (key ? whole.replace(key, "") : whole).trim();
    if (!label) continue;
    out.push({
      label,
      hint: item.dataset.desk ? "wallpaper" : "command",
      run: () => item.click(),
    });
  }

  // Mail is a real destination on this machine and it is what a recruiter is
  // most likely to want after the résumé. Read from the dock's own link, so
  // the address is never restated here.
  const mail = document.querySelector<HTMLAnchorElement>('.dockitem[href^="mailto:"]');
  if (mail) {
    out.push({
      label: mail.dataset.label ?? "Send mail",
      hint: "mail",
      run: () => mail.click(),
    });
  }

  return out;
}

/* ------------------------------------------------------------------
   Matching. Ten rows; a fuzzy-match dependency would be more code than
   the corpus.
   ------------------------------------------------------------------ */

function match(query: string): Row[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;

  const scored: { row: Row; rank: number }[] = [];
  for (const row of rows) {
    const label = row.label.toLowerCase();
    const at = label.indexOf(q);
    if (at === 0) scored.push({ row, rank: 0 });
    else if (at > 0) scored.push({ row, rank: 1 });
    else if (row.hint.toLowerCase().includes(q)) scored.push({ row, rank: 2 });
  }
  // A stable sort keeps document order inside each rank, so the list does not
  // reshuffle under the cursor as a query gets longer.
  return scored.sort((a, b) => a.rank - b.rank).map((s) => s.row);
}

/* ------------------------------------------------------------------
   The surface.
   ------------------------------------------------------------------ */

function build(): void {
  root = document.createElement("div");
  root.className = "palette";
  root.id = "palette";

  root.innerHTML = `
    <div class="palette__scrim" data-scrim></div>
    <div class="palette__panel" role="dialog" aria-modal="true"
         aria-label="Open a document or run a command">
      <input class="palette__field" id="palette-field" type="text"
             role="combobox" aria-expanded="true" aria-controls="palette-list"
             aria-autocomplete="list" autocomplete="off" spellcheck="false"
             placeholder="Open a document, or type a command" />
      <ul class="palette__list" id="palette-list" role="listbox"
          aria-label="Results"></ul>
      <p class="palette__empty" data-empty hidden>No such file.</p>
    </div>
  `;

  document.body.append(root);
  field = root.querySelector<HTMLInputElement>(".palette__field");
  list = root.querySelector<HTMLElement>(".palette__list");
  empty = root.querySelector<HTMLElement>("[data-empty]");

  root.querySelector("[data-scrim]")?.addEventListener("click", closePalette);
  field?.addEventListener("input", () => render(match(field?.value ?? "")));
  field?.addEventListener("keydown", onKey);

  // Clicking a row runs it. Bound on the list so the rows themselves stay
  // plain markup that render() can replace wholesale.
  list?.addEventListener("click", (event) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>("[data-row]");
    if (!row) return;
    choose(Number(row.dataset.row));
  });

  // The palette is modal, so Tab must not walk out the back of it into the
  // desktop underneath. One field and one listbox means the trap is this
  // small: there is nowhere else for focus to legitimately go.
  root.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      field?.focus();
    }
  });
}

function openPalette(): void {
  if (!root) build();
  if (!root || !field) return;

  cameFrom = document.activeElement as HTMLElement | null;
  rows = collect();
  field.value = "";
  root.dataset.open = "";
  render(rows);
  field.focus();
}

function closePalette(): void {
  if (!root || root.dataset.open === undefined) return;
  delete root.dataset.open;
  // Focus goes back where it came from. A modal that dumps focus on <body>
  // costs a keyboard visitor their whole place in the page.
  if (cameFrom?.isConnected) cameFrom.focus();
  cameFrom = null;
}

function render(next: Row[]): void {
  if (!list || !empty || !field) return;
  shown = next;
  cursor = 0;

  list.innerHTML = shown
    .map(
      (row, i) =>
        `<li class="palette__row" role="option" id="palette-row-${i}" data-row="${i}"` +
        ` aria-selected="${i === 0}">` +
        `<span class="palette__label">${esc(row.label)}</span>` +
        `<span class="palette__hint">${esc(row.hint)}</span></li>`,
    )
    .join("");

  empty.hidden = shown.length > 0;
  list.hidden = shown.length === 0;
  field.setAttribute("aria-expanded", String(shown.length > 0));
  syncActive();
}

/** Selection moves `aria-activedescendant`, never DOM focus — the visitor is
 *  still typing, and focus has to stay in the field for that to work. */
function syncActive(): void {
  if (!list || !field) return;
  const options = [...list.children] as HTMLElement[];
  options.forEach((el, i) => el.setAttribute("aria-selected", String(i === cursor)));
  if (shown.length) {
    field.setAttribute("aria-activedescendant", `palette-row-${cursor}`);
    options[cursor]?.scrollIntoView({ block: "nearest" });
  } else {
    field.removeAttribute("aria-activedescendant");
  }
}

function onKey(event: KeyboardEvent): void {
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      if (shown.length) cursor = (cursor + 1) % shown.length;
      return syncActive();
    case "ArrowUp":
      event.preventDefault();
      if (shown.length) cursor = (cursor - 1 + shown.length) % shown.length;
      return syncActive();
    case "Home":
      event.preventDefault();
      cursor = 0;
      return syncActive();
    case "End":
      event.preventDefault();
      cursor = Math.max(0, shown.length - 1);
      return syncActive();
    case "Enter":
      event.preventDefault();
      return choose(cursor);
    case "Escape":
      event.preventDefault();
      // Stop here: the desktop's own Escape handler would otherwise close the
      // frontmost window behind the palette as well.
      event.stopPropagation();
      return closePalette();
    default:
      break;
  }
}

function choose(index: number): void {
  const row = shown[index];
  if (!row) return;
  closePalette();
  row.run();
}

/** The labels come from the document's own markup, but they are still going
 *  back into innerHTML, and a document title is exactly the kind of string
 *  that grows an ampersand one day. */
function esc(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}
