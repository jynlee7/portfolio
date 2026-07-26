/**
 * content/spots.md → the list of places inside #doc-spots.
 *
 * Separate from `doc.mjs` because that compiler is built for documents made of
 * principles: every `##` becomes a tenet and demands an anchor line. A place is
 * a different shape — a name, the thing he ate, and a sentence about it — so it
 * gets its own twenty lines rather than an option flag threaded through the
 * other one. The typography, escaping and link safety are imported, not
 * reimplemented, so both documents read the same.
 *
 * Run through `vite.config.mjs` at build time. Nothing here ships to the
 * browser.
 *
 * The grammar:
 *
 *     Draft: yes                 ← renders a draft band, warns on build
 *
 *     # Places I actually went   ← optional heading, then an optional lede
 *     One paragraph.
 *
 *     ## Cheese Board Collective ← the place
 *     Slot: s4                   ← optional; pins it to one storefront
 *     One slice, whatever's on   ← the dish. One line, and only one.
 *     The prose about it, which  ← everything up to the blank line
 *     can wrap as far as it likes.
 *
 * Entries fill the storefronts in `src/game/neighborhood.ts` in the order they
 * are written, so nobody has to type a coordinate. `Slot:` is the escape hatch
 * for pinning one place somewhere specific.
 *
 * A missing dish or missing description is a build warning AND a visible gap in
 * the page — the same failure mode `doc.mjs` uses for a missing anchor, and for
 * the same reason. Content that is quietly absent reads fine and is therefore
 * never fixed.
 */

import { escape, inline, frontmatter } from "./doc.mjs";

/** A dish line this long is prose that landed in the wrong slot. */
const DISH_MAX = 72;

/**
 * Render the places to markup for the `<!-- @spots -->` marker.
 *
 * `slotIds` is the ordered list from the block plan; it is what makes "more
 * places than storefronts" and "Slot: nonsense" build warnings rather than
 * silently missing pins.
 */
export function renderSpots(source, slotIds = []) {
  const { meta, body } = frontmatter(source);
  const warnings = [];
  const draft = /^(yes|true)$/i.test(meta.draft ?? "");

  const places = [];
  const head = [];
  let place = null;
  let para = [];
  let ledeNext = false;
  let commenting = false;

  const flushPara = () => {
    if (para.length === 0) return;
    const text = para.join(" ");
    if (place) {
      // The first paragraph under a place is its description; a second one is
      // more of the same rather than a new field.
      place.note.push(text);
    } else if (ledeNext) {
      head.push(`<p class="spots__lede">${inline(text)}</p>`);
      ledeNext = false;
    } else {
      head.push(`<p>${inline(text)}</p>`);
    }
    para = [];
  };

  const flushPlace = () => {
    flushPara();
    if (place) places.push(place);
    place = null;
  };

  for (const raw of body) {
    const line = raw.trim();

    // Comments. The format reminder lives in the file Jayden edits rather than
    // only in GAME.md, so it is in front of him while he writes.
    if (commenting) {
      if (line.endsWith("-->")) commenting = false;
      continue;
    }
    if (line.startsWith("<!--")) {
      if (!line.endsWith("-->")) commenting = true;
      continue;
    }

    if (line === "") {
      flushPara();
      continue;
    }

    if (line.startsWith("## ")) {
      flushPlace();
      place = { name: line.slice(3).trim(), slot: "", dish: "", note: [] };
      continue;
    }

    if (line.startsWith("# ")) {
      flushPlace();
      head.push(`<h3 class="spots__h">${inline(line.slice(2).trim())}</h3>`);
      ledeNext = true;
      continue;
    }

    // Only meaningful directly under its own place, before anything else.
    if (place && !place.dish && place.note.length === 0 && para.length === 0) {
      const pin = line.match(/^Slot:\s*(\S+)$/i);
      if (pin) {
        place.slot = pin[1];
        continue;
      }
      place.dish = line;
      continue;
    }

    para.push(line);
  }

  flushPlace();

  // Assign storefronts. Pinned places claim theirs first, so an explicit Slot:
  // never gets taken by an unpinned entry that happened to come earlier.
  const taken = new Set();
  for (const p of places) {
    if (!p.slot) continue;
    if (!slotIds.includes(p.slot)) {
      warnings.push(`"${p.name}" is pinned to slot "${p.slot}", which is not on the map.`);
      p.slot = "";
    } else if (taken.has(p.slot)) {
      warnings.push(`"${p.name}" is pinned to slot "${p.slot}", which is already taken.`);
      p.slot = "";
    } else {
      taken.add(p.slot);
    }
  }

  const free = slotIds.filter((id) => !taken.has(id));
  for (const p of places) {
    if (p.slot) continue;
    const next = free.shift();
    if (next) {
      p.slot = next;
    } else {
      warnings.push(
        `"${p.name}" has no storefront left to stand in — the map has ${slotIds.length}. ` +
          `Add a slot to src/game/neighborhood.ts or cut a place.`,
      );
    }
  }

  for (const p of places) {
    if (!p.dish) {
      warnings.push(`"${p.name}" has no dish line. Add one short line naming what he ate.`);
    } else if (p.dish.length > DISH_MAX) {
      warnings.push(
        `"${p.name}" has a ${p.dish.length}-character dish line. It renders on one line beside ` +
          `the name; move the detail into the paragraph under it.`,
      );
    }
    if (p.note.length === 0) {
      warnings.push(`"${p.name}" has no description. Add a sentence or two under the dish.`);
    }
  }

  if (draft) {
    warnings.push(
      `still marked "Draft: yes" — the list renders with a draft band until that says no.`,
    );
  }

  const items = places
    .filter((p) => p.slot)
    .map(
      (p) =>
        `<li class="place" id="place-${escape(p.slot)}" data-slot="${escape(p.slot)}">` +
        `<h4 class="place__name">${inline(p.name)}</h4>` +
        (p.dish
          ? `<p class="place__dish">${inline(p.dish)}</p>`
          : `<p class="place__dish place__dish--missing">dish missing</p>`) +
        (p.note.length
          ? p.note.map((n) => `<p class="place__note">${inline(n)}</p>`).join("")
          : `<p class="place__note place__note--missing">description missing</p>`) +
        `</li>`,
    );

  // An empty list is a real state, not a failure: it is what the page says
  // until Jayden writes the file. It must read as a sentence, not a blank.
  const list = items.length
    ? `<ol class="spots">\n${items.join("\n")}\n</ol>`
    : `<p class="spots__empty">No places written up yet — the map below shows the ` +
      `storefronts standing empty, which is the truth of it.</p>`;

  const html =
    (draft
      ? `<p class="draftbar">Draft. Not finished, and visible so it cannot be forgotten.</p>\n`
      : "") +
    (head.length ? `${head.join("\n")}\n` : "") +
    list;

  return { html, warnings, count: items.length, draft };
}
