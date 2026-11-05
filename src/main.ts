import "./style.css";

import { booting, initBoot } from "./os/boot";
import { initGel } from "./os/gel";
import { initLock, showLock } from "./os/lock";
import { initMenubar } from "./os/menubar";
import { initLaunchers } from "./os/desktop";
import { initArrange } from "./os/arrange";
import { initWindowKeys, openDoc } from "./os/windows";
import { initWeather } from "./os/widgets";
import { initMpa } from "./os/mpa";

// The inline script's watchdog stands down: the machine is running.
document.documentElement.dataset.running = "";

initMenubar();
initLaunchers();
initArrange();
initWindowKeys();
initMpa();
void initWeather();
initLock();

const gel = initGel();
const cold = booting();
const ready = gel?.ready
  .then(() => document.documentElement.classList.add("gel-ready"))
  .catch(() => undefined);

// A cold visit plays the boot, which hands over to the drop itself. Anything
// else already has its ground, and the drop lands on the name once it is in.
if (cold) initBoot(gel, showLock);
else {
  showLock();
  void ready?.then(() => gel?.land());
}

/**
 * Deep links: /#resume opens that window on load, so the résumé can be linked
 * straight from an application or an email signature without the recipient
 * having to go find it on the desktop.
 */
const target = location.hash.slice(1);
if (target && document.getElementById(`doc-${target}`)) {
  openDoc(target);
}
