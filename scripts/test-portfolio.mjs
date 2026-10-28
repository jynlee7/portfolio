/**
 * Browser acceptance checks for the portfolio and the desktop under it.
 * Run against a production preview after `npm run build`:
 *   PORTFOLIO_URL=http://127.0.0.1:4173 node scripts/test-portfolio.mjs
 * Playwright is a devDependency (never shipped to the page); a machine that
 * has not run it before needs `npx playwright install chromium` once.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.PORTFOLIO_URL ?? "http://127.0.0.1:4173";
const evidence = process.env.PORTFOLIO_EVIDENCE ?? "/tmp/pw-portfolio-evidence";
// public/resume.pdf is compared byte for byte with the PDF Jayden supplied,
// which lives outside the repo. RESUME_SOURCE names it, and a missing file
// there fails. Unset, the path the current résumé came from is tried, and a
// checkout without it skips that one check instead of failing it.
const resumeSource = process.env.RESUME_SOURCE
  ?? join(homedir(), "Downloads/resumes/Lee_Jayden_Resume_10202026.pdf");
const resumeRequired = Boolean(process.env.RESUME_SOURCE);
await mkdir(evidence, { recursive: true });
const results = [];
const measurements = {};
const browser = await chromium.launch({ headless: true });
const expectedRoles = [
  ["SwingVision", "Data Analyst Intern"],
  ["CalCompute", "AI Engineering Intern"],
  ["MatX", "AI Software Engineer"],
  ["Cal Athletics", "Data & AI Engineer"],
  ["Pacific Northwest National Laboratory", "Data Science Intern"],
];

async function check(name, run) {
  const start = Date.now();
  try {
    const detail = await run();
    results.push({ name, status: "pass", ms: Date.now() - start, detail });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: "fail", ms: Date.now() - start, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

function skip(name, reason) {
  results.push({ name, status: "skip", reason });
  console.log(`SKIP ${name}: ${reason}`);
}

/** Resolves with scrollY once it has held still for ~20 frames. */
function settledScroll(page) {
  return page.evaluate(() => new Promise((done) => {
    let last = scrollY;
    let still = 0;
    const tick = () => {
      if (scrollY !== last) { last = scrollY; still = 0; } else if (++still > 20) return done(scrollY);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
}

async function withPage(options, run, setup) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(8_000);
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  if (setup) await setup(page, context);
  try {
    return await run(page, { errors, requests, context });
  } finally {
    await context.close();
  }
}

async function load(page, path = "/") {
  const response = await page.goto(new URL(path, base).href, { waitUntil: "networkidle" });
  // A hash-only change on the current page is a same-document navigation,
  // which Playwright reports with a null response rather than a status.
  if (response) assert.equal(response.status(), 200);
  await page.evaluate(() => document.fonts.ready);
}

async function assertNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    offenders: [...document.querySelectorAll("main *, header *, footer *")].filter((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 0 && (box.right > innerWidth + 1 || box.left < -1);
    }).slice(0, 8).map((el) => `${el.tagName}.${el.className}`),
  }));
  assert.ok(dimensions.document <= dimensions.width + 1, JSON.stringify(dimensions));
  assert.ok(dimensions.body <= dimensions.width + 1, JSON.stringify(dimensions));
  return dimensions;
}

async function assertFirstViewportResume(page) {
  const actions = page.locator('a[href="/resume.pdf"]');
  assert.ok(await actions.count(), "A direct résumé link is required");
  const inViewport = await actions.evaluateAll((links) => links.some((link) => {
    const box = link.getBoundingClientRect();
    const style = getComputedStyle(link);
    return box.height >= 24 && box.top >= 0 && box.bottom <= innerHeight
      && box.left >= 0 && box.right <= innerWidth
      && style.visibility !== "hidden" && style.display !== "none";
  }));
  assert.ok(inViewport, "Direct PDF action is not visible in the first viewport");
}

async function assertFacts(page) {
  assert.equal(await page.locator("h1").count(), 1);
  const text = await page.locator("main").innerText();
  assert.match(text, /junior[\s\S]*Data Science[\s\S]*UC Berkeley/i);
  for (const [organization, title] of expectedRoles) {
    assert.ok(text.includes(organization), `Missing organization: ${organization}`);
    assert.ok(text.includes(title), `Missing title: ${title}`);
  }
  assert.ok(!text.includes("Data Labeling Intern"), "Superseded SwingVision title is present");
  for (const id of ["work", "experience", "about", "contact", "resume"]) {
    assert.equal(await page.locator(`[id="${id}"]`).count(), 1, `Anchor #${id}`);
  }
  for (const kind of ["tennis", "knowledge", "compute", "stadium", "protein"]) {
    assert.ok(await page.locator(`[data-scene="${kind}"]`).count(), `Missing ${kind} illustration`);
  }
}

async function instrument(page, { noWebGL = false } = {}) {
  await page.addInitScript(({ noWebGL }) => {
    const stats = { frames: 0, requested: 0, contexts: 0, shifts: 0 };
    window.__portfolioTest = stats;
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      stats.requested++;
      return originalRaf.call(window, (time) => { stats.frames++; callback(time); });
    };
    const originalContext = HTMLCanvasElement.prototype.getContext;
    const seen = new WeakSet();
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (kind === "webgl" || kind === "webgl2" || kind === "experimental-webgl") {
        if (noWebGL) return null;
        const context = originalContext.call(this, kind, ...args);
        if (context && !seen.has(context)) { seen.add(context); stats.contexts++; }
        return context;
      }
      return originalContext.call(this, kind, ...args);
    };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) stats.shifts += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    } catch { /* browser without layout-shift observer */ }
  }, { noWebGL });
}

async function framesDuringRest(page, ms = 650) {
  const before = await page.evaluate(() => window.__portfolioTest.frames);
  await page.waitForTimeout(ms);
  return await page.evaluate(() => window.__portfolioTest.frames) - before;
}

try {
  if (!resumeRequired && !existsSync(resumeSource)) {
    skip("Résumé PDF exactly matches the supplied source", `${resumeSource} not found; set RESUME_SOURCE to compare`);
  } else await check("Résumé PDF exactly matches the supplied source", async () => {
    const [source, shipped] = await Promise.all([
      readFile(resumeSource),
      fetch(new URL("/resume.pdf", base)).then(async (response) => {
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /pdf/);
        return Buffer.from(await response.arrayBuffer());
      }),
    ]);
    assert.ok(source.equals(shipped), "The shipped résumé differs from the user-provided PDF");
    return { bytes: shipped.length, sha256: createHash("sha256").update(shipped).digest("hex") };
  });

  for (const width of [320, 390, 768, 1024, 1440]) {
    await check(`Readable portfolio at ${width}px, no overflow, résumé visible`, () => withPage({
      viewport: { width, height: width < 768 ? 844 : 1000 },
      reducedMotion: "reduce",
      ...(width < 768 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
    }, async (page, { errors }) => {
      await load(page);
      await assertFacts(page);
      await assertFirstViewportResume(page);
      const dimensions = await assertNoOverflow(page);
      await page.screenshot({ path: `${evidence}/portfolio-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      return dimensions;
    }));
  }

  await check("Native details support click, direct hash, reload, and browser Back", () => withPage({ reducedMotion: "reduce" }, async (page) => {
    await load(page);
    for (const id of ["clinical", "bearings", "site", "chessblitz"]) {
      const details = page.locator(`details#${id}`);
      assert.equal(await details.count(), 1, `Missing native disclosure for ${id}`);
      const summary = details.locator(":scope > summary");
      assert.equal(await summary.count(), 1);
      await summary.click();
      await page.waitForFunction((id) => document.getElementById(id)?.open, id);
      await summary.click();
      assert.equal(await details.getAttribute("open"), null);
      await load(page, `/#${id}`);
      assert.ok(await details.evaluate((el) => el.open), `Direct hash did not open ${id}`);
      await page.reload({ waitUntil: "networkidle" });
      assert.ok(await details.evaluate((el) => el.open), `Reload did not retain ${id}`);
    }
    await load(page, "/#clinical");
    await page.locator('a[href="#work"]').first().click();
    await page.waitForFunction(() => location.hash === "#work");
    await page.goBack();
    await page.waitForFunction(() => location.hash === "#clinical");
    assert.ok(await page.locator("#clinical").evaluate((el) => el.open));
    return { hashes: ["clinical", "bearings", "site", "chessblitz"] };
  }));

  // Without reduced motion the jump is a smooth scroll, still at its start
  // when navigate() first records the entry, so Forward is the real test.
  await check("Back then Forward returns to where a smooth jump landed", () => withPage({}, async (page, { errors }) => {
    await load(page);
    await page.locator('#portfolio-nav a[href="#experience"]').click();
    await page.waitForFunction(() => location.hash === "#experience");
    const landed = await settledScroll(page);
    assert.ok(landed > 400, `The jump did not scroll (scrollY ${landed})`);
    await page.goBack();
    await page.waitForFunction(() => location.hash === "");
    assert.ok(await settledScroll(page) < 10, "Back did not return to the top");
    await page.goForward();
    await page.waitForFunction(() => location.hash === "#experience");
    const restored = await settledScroll(page);
    assert.ok(Math.abs(restored - landed) <= 2, `Forward restored scrollY ${restored}, expected ${landed}`);
    assert.deepEqual(errors, []);
    return { landed, restored };
  }));

  await check("Phone navigation, touch targets, and Escape focus return", () => withPage({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce",
  }, async (page) => {
    await load(page);
    const toggle = page.locator("[data-menu-toggle]");
    assert.ok(await toggle.isVisible());
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    await toggle.tap();
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    assert.ok(await page.locator('#portfolio-nav a[href="#experience"]').isVisible());
    await page.keyboard.press("Escape");
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    assert.ok(await toggle.evaluate((el) => document.activeElement === el));
    await toggle.tap();
    await page.locator('#portfolio-nav a[href="#experience"]').tap();
    await page.waitForFunction(() => location.hash === "#experience");
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    const box = await toggle.boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44, `Small menu target: ${JSON.stringify(box)}`);
    await assertNoOverflow(page);
  }));

  await check("Keyboard skip link, disclosure, and accessible control names", () => withPage({ reducedMotion: "reduce" }, async (page) => {
    await load(page);
    await page.keyboard.press("Tab");
    const first = page.locator(":focus");
    assert.equal(await first.getAttribute("href"), "#main", "First Tab should reach skip link");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.activeElement?.id === "main");
    const summary = page.locator("#clinical > summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    assert.ok(await page.locator("#clinical").evaluate((el) => el.open));
    const unnamed = await page.locator("button, a[href], summary").evaluateAll((controls) => controls.filter((el) => {
      if (!el.getClientRects().length || getComputedStyle(el).visibility === "hidden") return false;
      const labelled = el.getAttribute("aria-labelledby")?.split(/\s+/).map((id) => document.getElementById(id)?.textContent).join(" ");
      return !(el.getAttribute("aria-label") || labelled || el.textContent || el.querySelector("img")?.alt)?.trim();
    }).map((el) => el.outerHTML));
    assert.deepEqual(unnamed, []);
    const focus = await summary.evaluate((el) => {
      const style = getComputedStyle(el);
      return { outline: style.outlineStyle, width: style.outlineWidth, shadow: style.boxShadow };
    });
    assert.ok((focus.outline !== "none" && focus.width !== "0px") || focus.shadow !== "none", `Missing focus treatment ${JSON.stringify(focus)}`);
  }));

  await check("200% text zoom retains content and actions", () => withPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" }, async (page) => {
    await load(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await assertFacts(page);
    await assertNoOverflow(page);
    await page.screenshot({ path: `${evidence}/portfolio-text-zoom-200.png`, fullPage: true });
  }));

  await check("JavaScript disabled preserves facts, navigation, PDF, and native disclosures", () => withPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } }, async (page, { requests }) => {
    await load(page);
    await assertFacts(page);
    await assertFirstViewportResume(page);
    await assertNoOverflow(page);
    const summary = page.locator("#clinical > summary");
    await summary.click();
    assert.ok(await page.locator("#clinical").evaluate((el) => el.open));
    assert.ok(await page.locator('#portfolio-nav a[href="#experience"]').isVisible());
    const images = await page.locator(".scene__fallback").evaluateAll((els) => els.map((img) => ({ src: img.src, loaded: img.complete && img.naturalWidth > 0 })));
    assert.ok(images.length >= 5);
    assert.ok(images.every((img) => img.loaded), JSON.stringify(images));
    await page.screenshot({ path: `${evidence}/portfolio-no-js.png`, fullPage: true });
    return { illustrations: images.length, scriptRequests: requests.filter((url) => /\.js(?:\?|$)/.test(url)) };
  }));

  await check("Reduced motion stays static and avoids WebGL and large 3D script downloads", () => withPage({ reducedMotion: "reduce" }, async (page, { errors }) => {
    await load(page);
    for (const scene of await page.locator("[data-scene]").all()) await scene.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    assert.equal(await framesDuringRest(page), 0);
    const stats = await page.evaluate(() => window.__portfolioTest);
    assert.equal(stats.contexts, 0, "Reduced motion created a WebGL context");
    const scripts = await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => /\.js(?:\?|$)/.test(entry.name)).map((entry) => ({ url: entry.name, bytes: entry.decodedBodySize })));
    assert.ok(scripts.every((script) => script.bytes < 200_000), `Large 3D script was loaded: ${JSON.stringify(scripts)}`);
    assert.deepEqual(errors, []);
    measurements.reducedMotion = { ...stats, scripts };
  }, (page) => instrument(page)));

  await check("Unavailable WebGL keeps local illustrations and all reading actions", () => withPage({}, async (page, { errors }) => {
    await load(page);
    await assertFacts(page);
    for (const scene of await page.locator("[data-scene]").all()) {
      await scene.scrollIntoViewIfNeeded();
      const visible = await scene.locator(".scene__fallback").evaluate((img) => img.complete && img.naturalWidth > 0 && Number(getComputedStyle(img).opacity) > 0);
      assert.ok(visible, "Fallback disappeared without WebGL");
    }
    assert.equal(await framesDuringRest(page), 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${evidence}/portfolio-webgl-unavailable.png`, fullPage: true });
  }, (page) => instrument(page, { noWebGL: true })));

  await check("3D controls render on interaction, settle, share a context, and stop offscreen", () => withPage({}, async (page, { errors, requests }) => {
    await load(page);
    const figure = page.locator("figure.scene").first();
    const left = figure.locator('[data-scene-rotate="left"]');
    await left.waitFor({ state: "visible" });
    for (const control of await figure.locator("button").all()) {
      const box = await control.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, `Small 3D control ${JSON.stringify(box)}`);
    }
    await page.waitForTimeout(700);
    assert.equal(await framesDuringRest(page), 0, "Scene animates at rest");
    const before = await page.evaluate(() => window.__portfolioTest.frames);
    await left.click();
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => window.__portfolioTest.frames);
    assert.ok(after > before, "Rotate control did not render a frame");
    await figure.locator("[data-scene-reset]").focus();
    await page.keyboard.press("Enter");
    const mount = figure.locator("[data-scene]");
    const box = await mount.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 55, box.y + box.height / 2 - 25, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    assert.equal(await framesDuringRest(page), 0, "Scene did not settle after drag");
    await page.screenshot({ path: `${evidence}/portfolio-3d-desktop.png`, fullPage: false });
    for (const scene of await page.locator("[data-scene]").all()) {
      await scene.scrollIntoViewIfNeeded();
      await page.waitForTimeout(80);
    }
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    assert.equal(await framesDuringRest(page), 0, "Offscreen scenes kept requesting frames");
    const stats = await page.evaluate(() => window.__portfolioTest);
    assert.equal(stats.contexts, 1, `Expected one shared WebGL context: ${JSON.stringify(stats)}`);
    assert.deepEqual(errors, []);
    assert.ok(!requests.some((url) => /\/src\/os\/|\/assets\/desktop[-.]/.test(url)), "Homepage requested desktop code");
    const resources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => ({ url: entry.name, bytes: entry.decodedBodySize, transfer: entry.transferSize, duration: entry.duration })));
    measurements.interactive = { ...stats, resources };
    return { contexts: stats.contexts, cls: stats.shifts, scriptBytes: resources.filter((r) => /\.js$/.test(r.url)).reduce((sum, r) => sum + r.bytes, 0) };
  }, (page) => instrument(page)));

  await check("Image failures leave essential content and project actions usable", () => withPage({ reducedMotion: "reduce" }, async (page) => {
    await page.route("**/scenes/**", (route) => route.abort());
    await load(page);
    await assertFacts(page);
    await assertFirstViewportResume(page);
    await page.locator("#clinical > summary").click();
    assert.ok(await page.locator("#clinical").evaluate((el) => el.open));
    await assertNoOverflow(page);
  }));

  await check("A desktop deep link skips the lock, opens its window, and leads home", () => withPage({ reducedMotion: "reduce" }, async (page, { errors }) => {
    await load(page, "/desktop/#about");
    assert.equal(await page.locator("#lock").count(), 0, "A deep link should not land behind the lock screen");
    await page.locator('.win[data-win="about"]').waitFor({ state: "visible" });
    const returnLink = page.locator(".menubar__link--home");
    assert.ok(await returnLink.isVisible(), "Desktop needs a visible return to portfolio");
    await page.screenshot({ path: `${evidence}/desktop-deep-link.png`, fullPage: false });
    assert.deepEqual(errors, []);
    await returnLink.click();
    await page.waitForURL(new URL("/", base).href);
    assert.equal(await page.locator("h1").count(), 1);
  }));

  await check("Bare /desktop/ keeps its lock; the way home survives a phone width", () => withPage({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce",
  }, async (page) => {
    await load(page, "/desktop/");
    assert.ok(await page.locator("#lock").isVisible(), "The desktop should still boot to its lock screen");
    await page.locator("#lock").tap();
    await page.locator("#lock").waitFor({ state: "detached" });
    const home = page.locator(".menubar__link--home");
    assert.ok(await home.isVisible(), "Portfolio link hidden on a phone");
    const box = await home.boundingBox();
    assert.ok(box.x + box.width <= 390, `Portfolio link overflows the bar: ${JSON.stringify(box)}`);
    await home.tap();
    await page.waitForURL(new URL("/", base).href);
  }));

  await check("The desktop stays hidden, then shows itself to a visitor who stays", () => withPage({}, async (page, { errors, requests }) => {
    await page.clock.install();
    await load(page);
    assert.equal(await page.locator('a[href^="/desktop"]').count(), 0, "The portfolio links the desktop before it is found");
    await page.clock.runFor(19_000);
    assert.equal(await page.locator(".peek").count(), 0, "The desktop showed itself early");
    await page.clock.runFor(1_500);
    const peek = page.locator(".peek");
    await peek.waitFor({ state: "visible" });
    assert.equal(await peek.locator(".peek__bit").count(), 16 * 8);
    assert.equal(await page.locator(".peek-status").textContent(), "There's a computer under this page.");
    await page.clock.runFor(1_000);
    await page.waitForTimeout(400);
    assert.equal(await peek.getAttribute("data-state"), "open");
    const enter = peek.getByRole("link", { name: "Go in" });
    const box = await enter.boundingBox();
    assert.ok(box.height >= 44, `Go in is ${box.height}px tall`);
    assert.ok(box.x + box.width <= 1440 && box.y + box.height <= 1000, "Window runs off screen");
    await page.screenshot({ path: `${evidence}/peek-open.png`, fullPage: false });
    assert.ok(!requests.some((url) => /\/src\/os\/|\/assets\/desktop[-.]/.test(url)), "Finding the desktop loaded its code early");
    await enter.click();
    assert.ok(await page.locator(".peek-veil__bit").count() > 100, "The screen did not turn over");
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${evidence}/peek-veil.png`, fullPage: false });
    await page.clock.runFor(1_000);
    await page.waitForURL(new URL("/desktop/", base).href);
    await page.locator("#lock").waitFor({ state: "visible" });
    assert.deepEqual(errors, []);
  }));

  await check("Closing the desktop keeps it closed; reduced motion opens it plainly", () => withPage({ reducedMotion: "reduce" }, async (page) => {
    await page.clock.install();
    await load(page);
    await page.clock.runFor(20_500);
    const peek = page.locator(".peek");
    await peek.waitFor({ state: "visible" });
    assert.equal(await peek.getAttribute("data-state"), "open", "Reduced motion should open without choreography");
    await peek.getByRole("button", { name: "Close" }).focus();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".peek").count(), 0);
    assert.ok(await page.evaluate(() => document.activeElement?.id === "main"), "Focus fell out of the page");
    await page.reload({ waitUntil: "networkidle" });
    await page.clock.runFor(60_000);
    assert.equal(await page.locator(".peek").count(), 0, "A closed desktop came back in the same visit");
  }));

  await check("Go in is an ordinary link under reduced motion", () => withPage({ reducedMotion: "reduce" }, async (page) => {
    await page.clock.install();
    await load(page);
    await page.clock.runFor(20_500);
    await page.locator(".peek").getByRole("link", { name: "Go in" }).click();
    await page.waitForURL(new URL("/desktop/", base).href);
    assert.equal(await page.locator(".peek-veil").count(), 0);
  }));

  await check("On a 320px phone the desktop is a short strip, not a card", () => withPage({
    viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true, reducedMotion: "reduce",
  }, async (page) => {
    await page.clock.install();
    await load(page);
    await page.clock.runFor(20_500);
    const peek = page.locator(".peek");
    await peek.waitFor({ state: "visible" });
    const box = await peek.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 320, `Window overflows: ${JSON.stringify(box)}`);
    assert.ok(box.height <= 200, `The strip takes ${box.height}px of a 640px screen`);
    assert.equal(await peek.locator(".peek__bit").count(), 16 * 4);
    await assertNoOverflow(page);
    await page.screenshot({ path: `${evidence}/peek-320.png`, fullPage: false });
    await peek.getByRole("button", { name: "Close" }).tap();
  }));

} finally {
  await browser.close();
  const report = { url: base, date: new Date().toISOString(), results, measurements };
  await writeFile(`${evidence}/report.json`, JSON.stringify(report, null, 2));
  const skipped = results.filter((r) => r.status === "skip").length;
  console.log(`\n${results.filter((r) => r.status === "pass").length}/${results.length - skipped} checks passed${skipped ? `, ${skipped} skipped` : ""}. Evidence: ${evidence}/report.json`);
  if (results.some((r) => r.status === "fail")) process.exitCode = 1;
}
