import "./style.css";
import "./scenes.css";
import { initScenes } from "./scenes";
import { initPeek } from "./peek";

const menuButton = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
const navigation = document.getElementById("portfolio-nav");

function setMenu(open: boolean, returnFocus = false): void {
  menuButton?.setAttribute("aria-expanded", String(open));
  navigation?.classList.toggle("is-open", open);
  if (returnFocus) menuButton?.focus();
}

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    setMenu(menuButton.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
      setMenu(false, true);
    }
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Node && !navigation.contains(target) && !menuButton.contains(target)) {
      setMenu(false);
    }
  });
  navigation.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) setMenu(false);
  });
  document.documentElement.classList.add("has-menu-js");
}

const projectDetails = Array.from(document.querySelectorAll<HTMLDetailsElement>("details.project-details[id]"));
type PageState = { portfolio: true; scrollY: number; opened: string[] };

function snapshot(): PageState {
  return { portfolio: true, scrollY: window.scrollY, opened: projectDetails.filter((d) => d.open).map((d) => d.id) };
}

function decodeHash(hash: string): string {
  try { return decodeURIComponent(hash.slice(1)); } catch { return ""; }
}

function reveal(id: string, focus: boolean, smooth: boolean): void {
  const target = document.getElementById(id);
  if (!target) return;
  if (target instanceof HTMLDetailsElement) target.open = true;
  let ancestor = target.parentElement;
  while (ancestor) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    ancestor = ancestor.parentElement;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: smooth && !reduced ? "smooth" : "instant", block: "start" });
  if (focus) {
    const focusTarget = target instanceof HTMLDetailsElement
      ? target.querySelector<HTMLElement>("summary")
      : target;
    if (focusTarget) {
      if (!focusTarget.matches("a,button,input,select,textarea,summary,[tabindex]")) focusTarget.tabIndex = -1;
      focusTarget.focus({ preventScroll: true });
    }
  }
}

function navigate(id: string, focus = true): void {
  if (!document.getElementById(id)) return;
  history.replaceState(snapshot(), "");
  if (decodeHash(location.hash) !== id) history.pushState(null, "", `#${encodeURIComponent(id)}`);
  reveal(id, focus, true);
  history.replaceState(snapshot(), "");
}

// Real anchors retain a complete no-JS path. Enhancement opens the native
// disclosure before navigating and remembers the visitor's previous reading spot.
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
  const id = decodeHash(url.hash);
  if (!document.getElementById(id)) return;
  event.preventDefault();
  navigate(id);
});

for (const details of projectDetails) {
  const summary = details.querySelector("summary");
  summary?.addEventListener("click", (event) => {
    event.preventDefault();
    if (!details.open) {
      navigate(details.id, false);
    } else {
      history.replaceState(snapshot(), "");
      details.open = false;
      const url = decodeHash(location.hash) === details.id ? "#work" : location.href;
      history.pushState(snapshot(), "", url);
    }
  });
  details.querySelectorAll<HTMLButtonElement>("[data-close-details]").forEach((button) => {
    button.addEventListener("click", () => {
      history.replaceState(snapshot(), "");
      details.open = false;
      history.pushState(snapshot(), "", "#work");
      summary?.focus({ preventScroll: true });
      details.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  });
}

history.scrollRestoration = "manual";

// navigate() records its new entry while the smooth scroll is still at its
// starting point, so the entry's position is recorded again once scrolling
// settles. Otherwise Back then Forward returns to where the jump began, not
// to the section it landed on (or wherever the reader scrolled after).
let settling = 0;
window.addEventListener("scroll", () => {
  clearTimeout(settling);
  settling = setTimeout(() => history.replaceState(snapshot(), ""), 150);
}, { passive: true });

let restoringPop = false;
window.addEventListener("popstate", (event: PopStateEvent) => {
  restoringPop = true;
  const state = event.state as Partial<PageState> | null;
  if (state?.portfolio && Array.isArray(state.opened)) {
    for (const details of projectDetails) details.open = state.opened.includes(details.id);
    window.scrollTo({ top: typeof state.scrollY === "number" ? state.scrollY : 0, behavior: "instant" });
  } else if (location.hash) {
    reveal(decodeHash(location.hash), false, false);
  } else {
    projectDetails.forEach((details) => { details.open = false; });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  // popstate and its hashchange are dispatched in the same traversal task.
  setTimeout(() => { restoringPop = false; }, 0);
});
window.addEventListener("hashchange", () => {
  if (!restoringPop && location.hash) {
    reveal(decodeHash(location.hash), false, false);
    history.replaceState(snapshot(), "");
  }
});

if (location.hash) reveal(decodeHash(location.hash), false, false);
history.replaceState(snapshot(), "");

initPeek();

let disposeScenes = initScenes();
window.addEventListener("pagehide", () => disposeScenes());
window.addEventListener("pageshow", (event) => {
  if (event.persisted) disposeScenes = initScenes();
});
