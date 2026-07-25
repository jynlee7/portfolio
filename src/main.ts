import "./style.css";

import { initLock } from "./os/lock";
import { initMenubar } from "./os/menubar";
import { initLaunchers, initDock } from "./os/desktop";
import { initWindowKeys, openDoc } from "./os/windows";
import { initWeather } from "./os/widgets";
import { initFlow } from "./os/flow";

initLock();
initMenubar();
initLaunchers();
initDock();
initWindowKeys();
void initWeather();

// The pointer deforms the contour field on both surfaces that show it. The
// lock screen is the first viewport, so it is the one most likely to be
// noticed; it mounts into its own slot, which sits behind the lock's text.
initFlow(document.getElementById("desk"));
const lock = document.getElementById("lock");
if (lock) initFlow(lock, lock.querySelector<HTMLElement>(".lock__field"));

/**
 * Deep links: /#resume opens that window on load, so the résumé can be linked
 * straight from an application or an email signature without the recipient
 * having to go find it on the desktop.
 */
const target = location.hash.slice(1);
if (target && document.getElementById(`doc-${target}`)) {
  openDoc(target);
}
