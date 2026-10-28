/**
 * The machine's one live region.
 *
 * Everything the desktop does in response to a command — a window opening, the
 * desk being tidied, the wallpaper changing — is visible, and until now that
 * was the only way it was reported. A visitor driving this with a screen
 * reader pressed Return on `resume.pdf` and heard nothing at all.
 *
 * One region, not one per feature: everything OS-shaped shares this one.
 *
 * Announcements are debounced to the trailing message. A burst — closing five
 * windows at once — should say one true thing, not read five filenames at
 * somebody.
 */

let node: HTMLElement | null = null;
let timer = 0;
/** The clear-then-set pair below is two timers, and a burst that straddles the
 *  gap between them would let a superseded message land anyway. Both are held
 *  so both can be cancelled. */
let settle = 0;

export function initStatus(): void {
  node = document.getElementById("os-say");
}

/**
 * Announce a completed action, in the past tense, naming the thing it happened
 * to. Never a description of the UI ("dialog opened") — the visitor asked for
 * a file, so the file is what gets named.
 */
export function say(text: string): void {
  if (!node) return;
  const region = node;

  window.clearTimeout(timer);
  window.clearTimeout(settle);
  timer = window.setTimeout(() => {
    // Clearing first is what makes a repeated message announce twice. Setting
    // textContent to a string it already holds is not a mutation, so the same
    // action performed twice in a row (open resume, close it, open it again)
    // would be silent the second time.
    region.textContent = "";
    settle = window.setTimeout(() => {
      region.textContent = text;
    }, 40);
  }, 120);
}
