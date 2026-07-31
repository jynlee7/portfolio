import "./style.css";

import { initLock, mountLockField } from "./os/lock";
import { initMenubar } from "./os/menubar";
import { initLaunchers, initDock } from "./os/desktop";
import { initArrange } from "./os/arrange";
import { initWindowKeys, openDoc } from "./os/windows";
import { initWeather } from "./os/widgets";
import { initFlow } from "./os/flow";
import { initSpots } from "./os/spots";

initLock();
initMenubar();
initLaunchers();
initArrange();
initDock();
initWindowKeys();
initSpots();
void initWeather();

// The pointer deforms the contour field on both surfaces that show it.
initFlow(document.getElementById("desk"));

// On the lock screen the field arrives one contour level at a time first.
// Handing it to the pointer only once that has played keeps the two moments
// sequential — otherwise the first mouse move slams the finished field down
// on top of an entrance that is still running. Somebody who wakes the machine
// mid-entrance takes the lock out of the document, so check before attaching.
const lock = document.getElementById("lock");
if (lock) {
  void mountLockField(lock).then(() => {
    if (lock.isConnected) {
      initFlow(lock, lock.querySelector<HTMLElement>(".lock__field"));
    }
  });
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
