/**
 * Motion checks for /desktop/, run against a production preview:
 *   PORTFOLIO_URL=http://127.0.0.1:4173 node scripts/test-desktop-motion.mjs
 * Checkpoint scope: the boot, rest, reduced motion, the network and the flip's
 * contrast, measured from rendered pixels. SwiftShader stands in for a GPU, so
 * nothing here says how smooth it is on a real laptop.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.PORTFOLIO_URL ?? "http://127.0.0.1:4173";
const out = process.env.MOTION_OUT ?? "docs/research/desktop-y2k-checkpoint";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const results = [];
const check = async (name, run) => {
  try {
    results.push({ name, status: "pass", detail: await run() });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: "fail", error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
};

async function open({ width = 1440, height = 900, reduce = false, cold = false, desk = "tangerine" } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduce ? "reduce" : "no-preference" });
  const page = await context.newPage();
  await page.addInitScript(({ cold, desk }) => {
    const stats = (window.__motion = { frames: 0 });
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => raf.call(window, (t) => { stats.frames++; cb(t); });
    localStorage.setItem("jl.mpa", "1");
    localStorage.setItem("jl.desk", desk);
    if (!cold) sessionStorage.setItem("jl.booted", "1");
  }, { cold, desk });
  return { context, page };
}

async function atRest(page, ms = 1200) {
  const before = await page.evaluate(() => window.__motion.frames);
  await page.waitForTimeout(ms);
  const frames = (await page.evaluate(() => window.__motion.frames)) - before;
  const loops = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && a.effect.getTiming().iterations === Infinity).length);
  return { frames, loops };
}

const lum = (r, g, b) => {
  const f = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

try {
  await check("A cold visit boots, fills from real work, and lands on the login", async () => {
    const { context, page } = await open({ cold: true });
    await page.goto(`${base}/desktop/`);
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains("is-booting")), "The first paint should be the boot");
    await page.locator("#lock.is-in").waitFor({ timeout: 15000 });
    await page.waitForFunction(() => !document.getElementById("boot"), null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => sessionStorage.getItem("jl.booted")), "1");
    await context.close();
  });

  await check("A press skips the boot", async () => {
    const { context, page } = await open({ cold: true });
    await page.goto(`${base}/desktop/`);
    await page.locator("#boot").waitFor({ state: "attached" });
    await page.mouse.click(700, 200);
    await page.waitForFunction(() => !document.getElementById("boot"), null, { timeout: 15000 });
    await context.close();
  });

  await check("Nothing runs at rest: login, desk, and a window after scrolling", async () => {
    const { context, page } = await open();
    await page.goto(`${base}/desktop/`);
    await page.waitForTimeout(3500);
    const login = await atRest(page);
    await page.locator("#lock-enter").click();
    await page.waitForTimeout(2500);
    const desk = await atRest(page);
    await page.evaluate(() => document.querySelector('.menu [data-open="lea"]').click());
    await page.locator('.win[data-win="lea"] .win__body').evaluate((el) => { el.scrollTop = 80; });
    await page.waitForTimeout(800);
    const win = await atRest(page);
    await context.close();
    for (const state of [login, desk, win]) assert.deepEqual(state, { frames: 0, loops: 0 });
    return { login, desk, win };
  });

  await check("Reduced motion: no boot, the login at once, no frames", async () => {
    const { context, page } = await open({ reduce: true, cold: true });
    await page.goto(`${base}/desktop/`);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains("is-booting")), false);
    assert.ok(await page.locator("#lock").isVisible());
    await page.waitForTimeout(1500);
    const rest = await atRest(page);
    await context.close();
    assert.deepEqual(rest, { frames: 0, loops: 0 });
  });

  await check("The only third-party request is the weather", async () => {
    const { context, page } = await open();
    const hosts = new Set();
    page.on("request", (request) => hosts.add(new URL(request.url()).host));
    await page.goto(`${base}/desktop/`, { waitUntil: "networkidle" });
    await context.close();
    const others = [...hosts].filter((host) => host !== new URL(base).host && !host.endsWith("open-meteo.com"));
    assert.deepEqual(others, []);
  });

  // The ground is captured with the text hidden, and every sampled pixel under
  // each block of text is scored against that text's computed colour.
  await check("Contrast through the flip: rendered pixels, every flavour, both widths", async () => {
    const lowest = {};
    const failures = [];
    for (const desk of ["tangerine", "bondi", "grape", "lime", "strawberry", "graphite"]) {
      for (const [width, height] of [[1440, 900], [390, 844]]) {
        const { context, page } = await open({ width, height, desk });
        await page.goto(`${base}/desktop/#lea`);
        const body = page.locator('.win[data-win="lea"] .win__body');
        await body.waitFor();
        await page.waitForTimeout(500);
        for (let step = 0; step <= 10; step += 1) {
          const blocks = await body.evaluate(async (el, f) => {
            el.scrollTop = Math.min(el.scrollHeight - el.clientHeight, el.clientHeight * 0.62) * f;
            // The ink follows the scroll event, which fires with the next frame.
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const view = el.getBoundingClientRect();
            return [...el.querySelectorAll(".doc__h1, .doc__lede, .doc > p, .spec dt, .spec dd")].map((node) => {
              const box = node.getBoundingClientRect();
              return { color: getComputedStyle(node).color, x: box.left - view.left, y: Math.max(box.top, view.top) - view.top, w: box.width, h: Math.min(box.bottom, view.bottom) - Math.max(box.top, view.top), viewW: view.width };
            }).filter((b) => b.h > 2);
          }, step / 10);
          await page.addStyleTag({ content: ".win__body .doc{visibility:hidden}" }).then(async (tag) => {
            const shot = (await body.screenshot()).toString("base64");
            await tag.evaluate((node) => node.remove());
            const scores = await page.evaluate(async ({ shot, blocks }) => {
              const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${shot}`)).blob());
              const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
              const ctx = canvas.getContext("2d");
              ctx.drawImage(bitmap, 0, 0);
              return blocks.map((b) => {
                const samples = [];
                for (let i = 0; i <= 4; i += 1) for (let j = 0; j <= 2; j += 1) {
                  const x = Math.min(bitmap.width - 1, Math.round(b.x + (b.w * i) / 4));
                  const y = Math.min(bitmap.height - 1, Math.round(b.y + (b.h * j) / 2));
                  samples.push([...ctx.getImageData(x, y, 1, 1).data].slice(0, 3));
                }
                return { color: b.color, samples };
              });
            }, { shot, blocks });
            for (const { color, samples } of scores) {
              const [r, g, b] = color.match(/[\d.]+/g).map(Number);
              const ink = lum(r, g, b);
              for (const px of samples) {
                const l = lum(...px);
                const c = (Math.max(ink, l) + 0.05) / (Math.min(ink, l) + 0.05);
                const key = `${desk} ${width}`;
                if (!lowest[key] || c < lowest[key].contrast) lowest[key] = { contrast: Number(c.toFixed(2)), step };
                if (c < 4.5) failures.push(`${key}, step ${step}: ${c.toFixed(2)}:1`);
              }
            }
          });
        }
        await context.close();
      }
    }
    assert.equal(failures.length, 0, failures.slice(0, 8).join("; "));
    return lowest;
  });

  await check("Twenty fresh loads put every icon in the same place, the face early or late", async () => {
    const layouts = new Map();
    for (let i = 0; i < 20; i++) {
      const { context, page } = await open();
      // Every other load gets General Sans 150ms late. That is when the grid
      // was measured under the fallback face and lea kept a 15.6px drop (#37).
      if (i % 2) {
        await page.route("**/fonts/GeneralSans-Variable.woff2", async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 150));
          await route.continue();
        });
      }
      await page.goto(`${base}/desktop/?load=${i}`);
      await page.waitForFunction(() => document.getElementById("icons")?.classList.contains("is-free"), null, { timeout: 8000 });
      const at = await page.evaluate(() => [...document.querySelectorAll(".icon")].map((el) => `${el.dataset.open} ${el.style.left} ${el.style.top}`).join(", "));
      layouts.set(at, (layouts.get(at) ?? 0) + 1);
      await context.close();
    }
    assert.equal(layouts.size, 1, [...layouts].map(([at, n]) => `${n}× ${at}`).join(" | "));
    return [...layouts.keys()][0];
  });
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify({ url: base, date: new Date().toISOString(), results }, null, 2));
  console.log(`\n${results.filter((r) => r.status === "pass").length}/${results.length} checks passed.`);
  if (results.some((r) => r.status === "fail")) process.exitCode = 1;
}
