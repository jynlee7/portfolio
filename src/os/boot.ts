/**
 * The boot: what a first visit sees before the login.
 *
 * Pinstripes, the name engraved where it will end up, and an Aqua progress
 * capsule that fills from real work: the font arriving, the wallpaper decoding,
 * the shader compiling, and one tick for each thing on the desk, whose icon
 * joins the row above the bar the way extensions used to march across a Mac's
 * start-up screen. Read from the desk itself, so it can never list a file the
 * machine does not have.
 *
 * Then the capsule lets go. It draws in to a bead, the bead becomes the gel
 * drop (src/os/gel.ts), and the drop opens until the pinstripes are gone and
 * the login is what is left. Any key or press skips to that part, at about half
 * the time. It plays once a session and never for a deep link or under reduced
 * motion; the inline script in desktop/index.html decides, so the first paint
 * is already right.
 */

import type { Gel } from "./gel";

const BOOTED = "jl.booted";
/** Never less than this, or the row of icons is a flicker rather than a beat. */
const MIN_MS = 1500;
const BEAD = 300, BEAD_SKIP = 130;
const FLOOD = 680, FLOOD_SKIP = 360;

export function booting(): boolean {
  return document.documentElement.classList.contains("is-booting");
}

export function restart(): void {
  try {
    sessionStorage.removeItem(BOOTED);
    sessionStorage.removeItem("jl.woke");
  } catch {
    /* ignore */
  }
  location.reload();
}

/** Plays the boot. `onReveal` fires as the flood clears the login. */
export function initBoot(gel: Gel | null, onReveal: () => void): void {
  const root = document.documentElement;
  const boot = document.getElementById("boot");
  const bar = document.getElementById("boot-bar");
  const fill = document.getElementById("boot-fill");
  const parade = document.getElementById("boot-parade");
  const status = document.getElementById("boot-status");
  const pct = document.getElementById("boot-pct");
  if (!boot || !bar || !fill || !parade || !status || !pct) {
    root.classList.remove("is-booting");
    onReveal();
    return;
  }

  const icons = [...document.querySelectorAll<HTMLElement>(".icon")];
  const total = icons.length + 3;
  const start = performance.now();
  let done = 0;
  let shown = 0;
  let skipped = false;
  let leaving = false;
  let raf = 0;

  const say = (text: string) => {
    status.textContent = text;
  };
  const tick = (text: string) => {
    done += 1;
    say(text);
  };

  function draw(now: number): void {
    raf = 0;
    if (leaving) return;
    // Never ahead of the work, and never faster than the minimum.
    const p = Math.min(done / total, (now - start) / MIN_MS);
    fill!.style.width = `${(p * 100).toFixed(1)}%`;
    pct!.textContent = `${Math.round(p * 100)}%`;
    if (done >= total && now - start >= MIN_MS) {
      void finish();
      return;
    }
    raf = requestAnimationFrame(draw);
  }

  // One icon per beat, so the row is read as a row.
  const step = (MIN_MS - 300) / Math.max(1, icons.length);
  const march = window.setInterval(() => {
    const icon = icons[shown];
    if (!icon) {
      window.clearInterval(march);
      return;
    }
    const art = icon.querySelector(".icon__art")?.cloneNode(true) as HTMLElement | undefined;
    if (art) {
      // The tint is the launcher's, and this copy is not inside it.
      art.style.setProperty("--tint", getComputedStyle(icon).getPropertyValue("--tint"));
      parade!.append(art);
    }
    tick(`Filing ${icon.querySelector(".icon__label")?.textContent ?? ""}`);
    shown += 1;
  }, step);

  const fonts = Promise.race([
    document.fonts.load(`600 100px "General Sans"`, "Jayden Lee"),
    new Promise((resolve) => setTimeout(resolve, 2500)),
  ]);
  void fonts.then(() => tick("Reading General Sans"));
  void (gel?.ready ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => {
      tick("Hanging the wallpaper");
      tick("Pouring the gel");
    });

  async function finish(): Promise<void> {
    if (leaving) return;
    leaving = true;
    cancelAnimationFrame(raf);
    window.clearInterval(march);
    fill!.style.width = "100%";
    pct!.textContent = "100%";
    boot!.classList.add("is-leaving");
    bar!.style.setProperty("--bead", `${skipped ? BEAD_SKIP : BEAD}ms`);
    bar!.classList.add("is-bead");
    await new Promise((resolve) => setTimeout(resolve, skipped ? BEAD_SKIP : BEAD));
    try {
      sessionStorage.setItem(BOOTED, "1");
    } catch {
      /* The boot simply plays again. */
    }

    const leave = () => {
      root.classList.remove("is-booting");
      boot!.remove();
    };
    const box = bar!.getBoundingClientRect();
    const usable = gel && root.classList.contains("gel-ready");
    if (usable) {
      bar!.style.visibility = "hidden";
      await gel.flood(box.left + box.width / 2, box.top + box.height / 2, box.height / 2, skipped ? FLOOD_SKIP : FLOOD, onReveal);
      leave();
      gel.land();
    } else {
      // No GL to flood with: the pinstripes fade off the wallpaper instead.
      onReveal();
      root.classList.add("boot-fade");
      await new Promise((resolve) => setTimeout(resolve, 420));
      root.classList.remove("boot-fade");
      leave();
    }
  }

  // Anything deliberate skips the rest. A pointer merely passing does not.
  const skip = () => {
    skipped = true;
    void finish();
  };
  boot.addEventListener("pointerdown", skip);
  document.addEventListener("keydown", (event) => {
    if (booting() && !event.metaKey && !event.ctrlKey && !event.altKey) skip();
  });

  raf = requestAnimationFrame(draw);
}
