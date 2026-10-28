/**
 * Browser acceptance checks for the wall at `/` and the desktop inside it.
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
  ?? join(homedir(), "Downloads/resumes/JaydenLeeResume.pdf");
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
    // SVG internals are skipped: the field inside the crack is clipped to it.
    offenders: [...document.querySelectorAll("main *, header *, footer *")].filter((el) => {
      if (el.ownerSVGElement) return false;
      const box = el.getBoundingClientRect();
      return box.width > 0 && (box.right > innerWidth + 1 || box.left < -1);
    }).slice(0, 8).map((el) => `${el.tagName}.${el.className}`),
  }));
  assert.ok(dimensions.document <= dimensions.width + 1, JSON.stringify(dimensions));
  assert.ok(dimensions.body <= dimensions.width + 1, JSON.stringify(dimensions));
  return dimensions;
}

/** The notice, the way in, and the sign, all inside the first viewport. */
async function assertWall(page) {
  assert.equal(await page.locator("h1").count(), 1);
  assert.match(await page.locator("h1").innerText(), /under works/i);
  assert.match(await page.locator("main").innerText(), /check out my desktop/i);
  const visible = (selector) => page.locator(selector).evaluateAll((els) => els.some((el) => {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return box.height >= 24 && box.top >= 0 && box.bottom <= innerHeight
      && box.left >= 0 && box.right <= innerWidth
      && style.visibility !== "hidden" && style.display !== "none";
  }));
  assert.ok(await visible('a.crack[href="/desktop/"]'), "The crack is not in the first viewport");
  assert.ok(await visible('a[href="/resume.pdf"]'), "The résumé is not in the first viewport");
  assert.ok(await visible('a[href="mailto:jeyl@berkeley.edu"]'), "The email is not in the first viewport");
  assert.ok((await page.locator(".sign").innerText()).includes("Jayden Lee"));
}

/** Every role on the résumé, on the desktop's experience log. */
async function assertDesktopFacts(page) {
  const text = await page.locator("#doc-experience").innerText();
  for (const [organization, title] of expectedRoles) {
    assert.ok(text.includes(organization), `Missing organization: ${organization}`);
    assert.ok(text.includes(title), `Missing title: ${title}`);
  }
  assert.ok(!text.includes("Data Labeling Intern"), "Superseded SwingVision title is present");
  assert.ok(!/\b50%/.test(text), "The superseded 50% claim is present");
  assert.ok(text.includes("100 hours"), "SwingVision should carry the 26 Oct résumé's hours");
  const lea = page.locator("#doc-lea");
  assert.equal(await lea.count(), 1, "Lea has no document");
  assert.equal(await lea.locator('a[href="https://devpost.com/software/lea-lidar-enabled-assistant"]').count(), 1);
}

/** Counts animation frames, so "nothing moves at rest" is measured. */
async function instrument(page) {
  await page.addInitScript(() => {
    const stats = { frames: 0, requested: 0 };
    window.__portfolioTest = stats;
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      stats.requested++;
      return originalRaf.call(window, (time) => { stats.frames++; callback(time); });
    };
  });
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
    await check(`The wall at ${width}px: notice, crack and sign in view, no overflow`, () => withPage({
      viewport: { width, height: width < 768 ? 844 : width === 768 ? 1024 : 900 },
      reducedMotion: "reduce",
      ...(width < 768 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
    }, async (page, { errors, requests }) => {
      await load(page);
      await assertWall(page);
      const dimensions = await assertNoOverflow(page);
      const crack = await page.locator(".crack").boundingBox();
      assert.ok(crack.width >= 44 && crack.height >= 44, `Small crack target: ${JSON.stringify(crack)}`);
      await page.screenshot({ path: `${evidence}/wall-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      assert.ok(!requests.some((url) => /\/src\/os\/|\/assets\/desktop[-.]/.test(url)), "The wall requested desktop code");
      return dimensions;
    }));
  }

  await check("The crack frames the field exactly where the lock screen paints it", () => withPage({}, async (page, { errors }) => {
    await load(page);
    const placed = await page.evaluate(() => {
      const svg = document.querySelector(".crack svg");
      const view = svg.querySelector(".crack__field");
      const box = svg.getBoundingClientRect();
      const unit = box.width / svg.viewBox.baseVal.width;
      const n = (name) => Number(view.getAttribute(name)) * unit;
      return { x: box.left + n("x"), y: box.top + n("y"), w: n("width"), h: n("height"), href: view.getAttribute("href") };
    });
    const scale = Math.max(1440 / 1600, 1000 / 1000);
    const expected = { x: (1440 - 1600 * scale) / 2, y: (1000 - 1000 * scale) / 2, w: 1600 * scale, h: 1000 * scale };
    for (const key of ["x", "y", "w", "h"]) {
      assert.ok(Math.abs(placed[key] - expected[key]) < 1, `Field ${key} is ${placed[key]}, the lock paints it at ${expected[key]}`);
    }
    assert.equal(placed.href, "/field-lab.svg");
    assert.deepEqual(errors, []);
    return placed;
  }));

  await check("The crack shows the wallpaper the visitor chose on the desktop", () => withPage({}, async (page) => {
    await load(page);
    assert.equal(await page.locator(".crack__field").getAttribute("href"), "/field-blueprint.svg");
  }, (page) => page.addInitScript(() => localStorage.setItem("jl.desk", "blueprint"))));

  await check("Nothing moves at rest, and the crack is the wall's only way in", () => withPage({}, async (page, { errors }) => {
    await load(page);
    await page.waitForTimeout(300);
    assert.equal(await framesDuringRest(page), 0, "The wall requests frames at rest");
    assert.equal(await page.locator('a[href^="/desktop"]').count(), 1, "Expected exactly one way to the desktop");
    assert.deepEqual(errors, []);
  }, (page) => instrument(page)));

  await check("Hover and keyboard focus ring the crack in pencil", () => withPage({}, async (page) => {
    await load(page);
    const loop = page.locator(".crack__loop");
    const drawn = () => loop.evaluate((el) => Number(getComputedStyle(el).strokeDashoffset.replace("px", "")));
    assert.equal(await drawn(), 1, "The loop shows before anyone reaches for the crack");
    await page.locator(".crack").hover();
    await page.waitForTimeout(600);
    assert.equal(await drawn(), 0, "Hover did not ring the crack");
    await page.mouse.move(5, 5);
    await page.waitForTimeout(600);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.className), "crack", "The crack should be first in the tab order");
    await page.waitForTimeout(600);
    assert.equal(await drawn(), 0, "Keyboard focus is invisible");
    assert.equal(await page.locator(".crack").getAttribute("aria-label"), "My desktop");
  }));

  await check("Going in breaks the wall and lands on the lock with its field at rest", () => withPage({}, async (page, { errors }) => {
    await load(page);
    const crack = page.locator(".crack");
    await crack.hover();
    await crack.click({ noWaitAfter: true });
    await page.locator(".breach").waitFor({ state: "attached" });
    await page.waitForTimeout(260);
    await page.screenshot({ path: `${evidence}/breach.png`, fullPage: false });
    assert.ok(await page.locator(".breach__bit").count() > 0, "No plaster came away");
    await page.waitForURL(new URL("/desktop/", base).href, { timeout: 4_000 });
    await page.locator("#lock").waitFor({ state: "visible" });
    // The lock read and cleared the one-shot hand-off, and its contours were
    // already showing rather than raised from nothing.
    assert.equal(await page.evaluate(() => sessionStorage.getItem("jl.through")), null);
    const opacity = await page.locator("#lock svg > g > path").first().evaluate((el) => el.style.opacity);
    assert.equal(opacity, "1", "The lock replayed its entrance after the wall broke");
    await page.screenshot({ path: `${evidence}/breach-landed.png`, fullPage: false });
    assert.deepEqual(errors, []);
  }));

  await check("Back from the desktop mends the wall", () => withPage({}, async (page) => {
    await load(page);
    await page.locator(".crack").click({ noWaitAfter: true });
    await page.waitForURL(new URL("/desktop/", base).href, { timeout: 4_000 });
    await page.goBack();
    await page.waitForURL(new URL("/", base).href);
    assert.equal(await page.locator(".breach").count(), 0, "The wall came back broken");
  }));

  await check("Under reduced motion the crack is an ordinary link", () => withPage({ reducedMotion: "reduce" }, async (page) => {
    await load(page);
    await page.locator(".crack").click();
    await page.waitForURL(new URL("/desktop/", base).href);
    assert.equal(await page.evaluate(() => document.querySelector(".breach")), null);
  }));

  await check("JavaScript off: the wall reads, and the crack and résumé still work", () => withPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } }, async (page) => {
    await load(page);
    await assertWall(page);
    await assertNoOverflow(page);
    await page.screenshot({ path: `${evidence}/wall-no-js.png`, fullPage: true });
    await page.locator(".crack").click();
    await page.waitForURL(new URL("/desktop/", base).href);
  }));

  await check("200% text zoom keeps the notice, the crack and the sign", () => withPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }, async (page) => {
    await load(page);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    assert.match(await page.locator("h1").innerText(), /under works/i);
    for (const selector of ['a.crack[href="/desktop/"]', 'a[href="/resume.pdf"]', 'a[href="mailto:jeyl@berkeley.edu"]']) {
      assert.ok(await page.locator(selector).isVisible(), `${selector} is hidden at 200%`);
    }
    await assertNoOverflow(page);
    await page.screenshot({ path: `${evidence}/wall-text-zoom-200.png`, fullPage: true });
  }));

  await check("The desktop's documents carry the 26 Oct résumé", () => withPage({ javaScriptEnabled: false }, async (page) => {
    await load(page, "/desktop/");
    await assertDesktopFacts(page);
  }));

  await check("A desktop deep link skips the lock, opens its window, and leads home", () => withPage({ reducedMotion: "reduce" }, async (page, { errors }) => {
    await load(page, "/desktop/#lea");
    assert.equal(await page.locator("#lock").count(), 0, "A deep link should not land behind the lock screen");
    await page.locator('.win[data-win="lea"]').waitFor({ state: "visible" });
    const returnLink = page.locator(".menubar__link--home");
    assert.ok(await returnLink.isVisible(), "Desktop needs a visible way back out");
    await page.screenshot({ path: `${evidence}/desktop-deep-link.png`, fullPage: false });
    assert.deepEqual(errors, []);
    await returnLink.click();
    await page.waitForURL(new URL("/", base).href);
    assert.match(await page.locator("h1").innerText(), /under works/i);
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

} finally {
  await browser.close();
  const report = { url: base, date: new Date().toISOString(), results, measurements };
  await writeFile(`${evidence}/report.json`, JSON.stringify(report, null, 2));
  const skipped = results.filter((r) => r.status === "skip").length;
  console.log(`\n${results.filter((r) => r.status === "pass").length}/${results.length - skipped} checks passed${skipped ? `, ${skipped} skipped` : ""}. Evidence: ${evidence}/report.json`);
  if (results.some((r) => r.status === "fail")) process.exitCode = 1;
}
