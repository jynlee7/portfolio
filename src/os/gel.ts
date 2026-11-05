/**
 * The gel. One WebGL2 canvas behind everything, and it owns two things.
 *
 *   - The ground: the flavour's wallpaper with the name moulded into it. Each
 *     letter is clear plastic, so the terraces bend inside it. Drawn once per
 *     size and flavour into a texture and never again.
 *   - The drop: one bead of Aqua gel that bends that ground under the pointer,
 *     and, on a cold boot, opens into the flood that takes the pinstripes away.
 *
 * It grew out of the front page's lens (src/front/lens.ts) but is its own file:
 * the two surfaces have different grounds and different lives.
 *
 * A frame is drawn only while the drop is travelling, settling or flooding. At
 * rest, none. Under reduced motion it sits still at its resting place.
 */

const VERT = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

/* The ground: wallpaper, then the name. The height of a letter is its own alpha
   blurred, which gives every stroke a rounded back to catch the light on. */
const GROUND_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uImage;
uniform float uSize;      // the name's font size, device px
uniform float uLod;
uniform sampler2D uWall;
uniform sampler2D uLetters;
uniform vec3 uLetter;
uniform vec3 uGlow;
uniform float uMilk;
out vec4 o;

vec3 wall(vec2 p) {
  float s = max(uRes.x / uImage.x, uRes.y / uImage.y);
  vec2 size = uImage * s;
  return texture(uWall, (p - (uRes - size) * 0.5) / size).rgb;
}

// A wide blur from the letter texture's mips, softened with a ring of taps so
// the mip blocks do not show on letters this large.
float soft(vec2 p, float lod) {
  float r = pow(2.0, lod);
  float a = textureLod(uLetters, p / uRes, lod).a * 2.0;
  for (int i = 0; i < 6; i++) {
    float t = float(i) * 1.0472;
    a += textureLod(uLetters, (p + vec2(cos(t), sin(t)) * r) / uRes, lod).a;
  }
  return a / 8.0;
}

float height(vec2 p) { return 0.6 * soft(p, uLod - 1.0) + 0.4 * soft(p, uLod); }

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float shadow = soft(p - vec2(uSize * 0.006, uSize * 0.03), uLod + 0.6);
  vec3 ground = wall(p) * (1.0 - 0.34 * shadow);
  float a = texture(uLetters, p / uRes).a;
  if (a <= 0.0) { o = vec4(ground, 1.0); return; }

  float e = pow(2.0, uLod - 1.0);
  vec2 g = vec2(height(p + vec2(e, 0.0)) - height(p - vec2(e, 0.0)), height(p + vec2(0.0, e)) - height(p - vec2(0.0, e)));
  vec3 n = normalize(vec3(-g * 2.6, 1.0));
  vec3 light = normalize(vec3(-0.4, -0.75, 0.55));
  vec3 half_ = normalize(light + vec3(0.0, 0.0, 1.0));

  // Clear plastic: what is behind bends by the slope of the letter, then the
  // milk in the plastic carries most of the colour.
  vec3 behind = wall(p + n.xy * uSize * 0.14);
  vec3 c = mix(behind, uLetter, uMilk);
  c *= 0.82 + 0.3 * dot(n, light);
  // The light that came through gathers along the bottom of every stroke, in the
  // colour of what it came through.
  c = mix(c, uGlow, smoothstep(0.0, 0.7, -g.y * 2.6) * 0.62);
  // And Aqua's own mark: a hard-edged band of white along the top of each stroke.
  float top = height(p) - height(p - vec2(0.0, uSize * 0.05));
  c += smoothstep(0.1, 0.13, top) * 0.5 * smoothstep(0.34, 0.1, top - 0.1);
  c += pow(max(dot(n, half_), 0.0), 40.0) * 0.4;
  o = vec4(mix(ground, c, a), 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform vec2 uC;
uniform vec2 uR;
uniform float uOn;
uniform float uHole;
uniform float uBoot;      // 1 while the ground outside the glass is the boot's
uniform float uGloss;
uniform sampler2D uGround;
uniform sampler2D uLetters;
uniform vec3 uTint;
out vec4 o;

vec3 ground(vec2 p) { return texture(uGround, vec2(p.x, uRes.y - p.y) / uRes).rgb; }

// The stylesheet's pinstripes and the name engraved in them (style.css, .ground).
vec3 boot(vec2 p) {
  vec3 c = mod(p.y / uDpr, 4.0) < 2.0 ? vec3(0.965) : vec3(0.925);
  c = mix(c, vec3(1.0), texture(uLetters, (p - vec2(0.0, uDpr)) / uRes).a);
  return mix(c, vec3(0.5, 0.5, 0.52), texture(uLetters, p / uRes).a);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float live = step(0.001, uOn);
  vec2 R = max(uR * uOn, vec2(1.0));
  vec2 d = p - uC;
  vec2 q = d / R;
  float r = length(q);
  float rm = min(R.x, R.y);
  float px = 1.0 / rm;

  // The drop lays a soft shadow down the sheet, offset away from the light.
  float rs = length((d - min(rm * 0.1, 18.0 * uDpr) * vec2(0.45, 0.9)) / R);
  float soft = min(rm * 0.5, 72.0 * uDpr);
  float sh = (1.0 - smoothstep(-0.35 * soft, soft, (rs - 1.0) * rm)) * 0.36 * live;
  vec3 outside = (uBoot > 0.5 ? boot(p) : ground(p)) * (1.0 - sh);

  float inside = (1.0 - smoothstep(1.0 - 1.5 * px, 1.0, r)) * live;
  if (inside <= 0.0) { o = vec4(outside, 1.0); return; }

  // Refraction across the band of glass between the opening and the rim: the
  // centre magnifies, the rim folds what is outside back in, and each colour
  // bends by its own amount.
  float t = clamp((r - uHole) / max(1.0 - uHole, 1e-3), 0.0, 1.0);
  float band = rm * (1.0 - uHole);
  vec2 dir = d / max(length(d), 1e-3);
  float rim = smoothstep(0.5, 1.0, t);
  float k = 1.0 / 1.3 - 1.0 + 0.62 * rim * rim;
  float ca = 0.05 * rim * rim;
  float reach = band * t;
  vec3 col;
  col.r = ground(p + dir * reach * (k + ca)).r;
  col.g = ground(p + dir * reach * k).g;
  col.b = ground(p + dir * reach * (k - ca)).b;

  // Aqua, which is mostly two lights. The body takes a little of the flavour and
  // darkens toward its rim. A crescent of white sits in the top half with a hard
  // lower edge; the light that came through gathers at the bottom.
  col = mix(col, uTint, 0.1);
  col *= 1.0 - smoothstep(0.55, 1.0, t) * 0.24;
  vec2 lens = vec2(q.x / 0.74, (q.y + 0.42) / 0.44);
  float dome = 1.0 - smoothstep(0.86, 1.0, length(lens));
  col += dome * mix(0.62, 0.06, smoothstep(-0.92, -0.08, q.y)) * uGloss;
  col += smoothstep(0.2, 0.96, q.y) * (1.0 - smoothstep(0.82, 1.0, r)) * mix(vec3(1.0), uTint, 0.35) * 0.3 * uGloss;

  // One thin lit edge where the light enters, a fainter one where it leaves.
  float side = dot(dir, normalize(vec2(-0.45, -0.85))) * 0.5 + 0.5;
  float thin = smoothstep(0.93, 0.992, t);
  col += thin * mix(0.08, 0.6, pow(side, 3.0));

  float open = uHole > 0.0 ? 1.0 - smoothstep(uHole - 1.5 * px, uHole, r) : 0.0;
  if (uHole > 0.0) col += (1.0 - smoothstep(0.0, 2.5 * px / max(1.0 - uHole, 1e-3), t)) * 0.4;
  o = vec4(mix(outside, mix(col, ground(p), open), inside), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, fragment: string): WebGLProgram | null {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, fragment]] as const) {
    const shader = gl.createShader(type);
    if (!shader || !program) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      if (import.meta.env.DEV) console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program!, 0, "a");
  gl.linkProgram(program!);
  return gl.getProgramParameter(program!, gl.LINK_STATUS) ? program : null;
}

/** A hex token as 0-1 RGB for a shader. */
function rgb(token: string): [number, number, number] {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(token).trim() || "#000000";
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, t: number) => {
  const u = clamp01((t - a) / (b - a));
  return u * u * (3 - 2 * u);
};

/** var(--move) in tokens.css, as a function, so the flood shares its curve. */
function move(t: number): number {
  const ax = 1 - 3 * 0.35 + 3 * 0.65, bx = 3 * 0.35 - 6 * 0.65, cx = 3 * 0.65;
  const ay = 1 - 3 * 1 + 0, by = 3 * 1, cy = 0;
  let u = clamp01(t);
  for (let i = 0; i < 8; i++) {
    const miss = ((ax * u + bx) * u + cx) * u - t;
    if (Math.abs(miss) < 1e-4) break;
    u -= miss / ((3 * ax * u + 2 * bx) * u + cx);
  }
  return ((ay * u + by) * u + cy) * u;
}

export interface Gel {
  /** Resolves once the wallpaper, the font and the ground texture are in. */
  ready: Promise<void>;
  /** Opens a drop at a point in the viewport until the ground is all there is. */
  flood(x: number, y: number, r: number, ms: number, onReveal: () => void): Promise<void>;
  /** Shows the ground, with the drop landing on the name. */
  land(): void;
}

export function initGel(): Gel | null {
  const stage = document.getElementById("ground");
  const canvas = document.getElementById("gel") as HTMLCanvasElement | null;
  const desk = document.getElementById("desk");
  const name = document.querySelector<HTMLElement>(".nameplate__name");
  if (!stage || !canvas || !desk || !name) return null;
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  const groundProgram = gl && compile(gl, GROUND_FRAG);
  const program = gl && compile(gl, FRAG);
  if (!gl || !groundProgram || !program) {
    canvas.remove();
    return null;
  }

  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const uniforms = (p: WebGLProgram, names: string[]) =>
    Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)])) as Record<string, WebGLUniformLocation | null>;
  const G = uniforms(groundProgram, ["uRes", "uImage", "uSize", "uLod", "uWall", "uLetters", "uLetter", "uGlow", "uMilk"]);
  const L = uniforms(program, ["uRes", "uDpr", "uC", "uR", "uOn", "uHole", "uBoot", "uGloss", "uGround", "uLetters", "uTint"]);

  const texture = (filter: number) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const wallTex = texture(gl.LINEAR);
  const lettersTex = texture(gl.LINEAR_MIPMAP_LINEAR);
  const groundTex = texture(gl.LINEAR);
  const groundFbo = gl.createFramebuffer();

  const letters = document.createElement("canvas");
  let image: { w: number; h: number } | null = null;

  // A zero-size box sitting on each word's baseline, which is where the letters
  // are drawn from, whichever lines the words have wrapped onto.
  const words = [...name.querySelectorAll<HTMLElement>(".nameplate__word > span")];
  const probes = words.map((word) => {
    const probe = document.createElement("span");
    probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    word.prepend(probe);
    return probe;
  });

  let dpr = 1, W = 0, H = 0, R = 90, fontSize = 200;
  let x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0;
  let on = 0, von = 0, ton = 0;
  let rest = { x: 0, y: 0 };
  let raf = 0, last = 0, live = false;
  let floodState: { at: number; ms: number; x: number; y: number; r: number; revealed: boolean; onReveal: () => void; done: () => void } | null = null;

  /** Reads the name as the page has laid it out, and draws it for the shader. */
  function paintLetters(): void {
    // An entrance that is still running would have the letters mid-rise.
    for (const animation of name!.getAnimations({ subtree: true })) animation.finish();
    const style = getComputedStyle(name!);
    fontSize = parseFloat(style.fontSize);
    letters.width = Math.max(1, Math.round(W * dpr));
    letters.height = Math.max(1, Math.round(H * dpr));
    const ctx = letters.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const scrolls = desk!.scrollHeight > desk!.clientHeight + 1;
    root.classList.toggle("gel-name", !scrolls);
    let lee: { x: number; y: number } | null = null;
    let end = { x: 0, y: 0 };
    if (!scrolls) {
      ctx.fillStyle = "#fff";
      ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      ctx.textBaseline = "alphabetic";
      const range = document.createRange();
      words.forEach((word, index) => {
        const baseline = probes[index].getBoundingClientRect().bottom;
        const text = [...word.childNodes].find((n) => n.nodeType === Node.TEXT_NODE) as Text | undefined;
        if (!text) return;
        for (let i = 0; i < text.length; i++) {
          range.setStart(text, i);
          range.setEnd(text, i + 1);
          const box = range.getBoundingClientRect();
          const ch = text.data[i];
          ctx.fillText(ch, box.left, baseline);
          if (ch === "L") lee = { x: box.left + box.width * 0.5, y: baseline };
          end = { x: box.right, y: baseline };
        }
      });
    }
    R = Math.max(40, Math.min(132, fontSize * 0.4));
    // At rest it never covers a letter's identity. Where the name leaves room it
    // sits beside the name; where it runs edge to edge, on the top of the L.
    const at = lee as { x: number; y: number } | null;
    rest = !at
      ? { x: W * 0.72, y: H * 0.72 }
      : end.x + R * 2.3 < W
        ? { x: end.x + R * 1.25, y: end.y - fontSize * 0.34 }
        : { x: at.x + R * 0.25, y: at.y - fontSize * 0.86 };

    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, lettersTex);
    gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, letters);
    gl!.generateMipmap(gl!.TEXTURE_2D);
  }

  /** The static pass: wallpaper plus name, into a texture the drop bends. */
  function paintGround(): void {
    if (!image) return;
    const w = canvas!.width, h = canvas!.height;
    gl!.activeTexture(gl!.TEXTURE2);
    gl!.bindTexture(gl!.TEXTURE_2D, groundTex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, w, h, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, groundFbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, groundTex, 0);
    gl!.viewport(0, 0, w, h);
    gl!.useProgram(groundProgram);
    gl!.uniform2f(G.uRes, w, h);
    gl!.uniform2f(G.uImage, image.w, image.h);
    gl!.uniform1f(G.uSize, fontSize * dpr);
    gl!.uniform1f(G.uLod, Math.log2(Math.max(3, fontSize * dpr * 0.034)));
    gl!.uniform1i(G.uWall, 0);
    gl!.uniform1i(G.uLetters, 1);
    gl!.uniform3fv(G.uLetter, rgb("--letter"));
    gl!.uniform3fv(G.uGlow, rgb("--fl-lite"));
    gl!.uniform1f(G.uMilk, parseFloat(getComputedStyle(root).getPropertyValue("--letter-milk")) || 0.8);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, w, h);
  }

  function measure(): void {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = stage!.clientWidth;
    H = stage!.clientHeight;
    canvas!.width = Math.max(1, Math.round(W * dpr));
    canvas!.height = Math.max(1, Math.round(H * dpr));
    paintLetters();
    paintGround();
    if (!live) { x = tx = rest.x; y = ty = rest.y; }
  }

  async function loadWall(): Promise<void> {
    const raw = getComputedStyle(root).getPropertyValue("--wallpaper");
    const url = raw.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
    if (!url) return;
    const img = new Image();
    img.src = url;
    await img.decode();
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, wallTex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, img);
    image = { w: img.naturalWidth, h: img.naturalHeight };
  }

  function draw(): void {
    let cx = x, cy = y, hole = 0, size = on, gloss = 1;
    const ex = Math.min(Math.abs(vx) / 9000, 0.09), ey = Math.min(Math.abs(vy) / 9000, 0.09);
    let rx = R * (1 + ex - ey * 0.45), ry = R * (1 + ey - ex * 0.45);
    if (floodState) {
      const q = move(clamp01((performance.now() - floodState.at) / floodState.ms));
      // Grown in log space, so it reads as even growth; it drifts to the middle
      // of the window so it clears the corners evenly.
      const drift = smooth(0, 0.75, q);
      cx = lerp(floodState.x, W / 2, drift);
      cy = lerp(floodState.y, H / 2, drift);
      const far = Math.hypot(W, H) * 0.5 * 1.05 + 84;
      const big = Math.exp(lerp(Math.log(floodState.r), Math.log(far), q));
      const band = Math.max(30, Math.min(84, Math.min(W, H) * 0.09));
      hole = big - lerp(big, band, smooth(0, 0.18, q));
      rx = ry = big;
      size = 1;
      gloss = 1 - smooth(0, 0.3, q);
    }
    gl!.useProgram(program);
    gl!.uniform2f(L.uRes, canvas!.width, canvas!.height);
    gl!.uniform1f(L.uDpr, dpr);
    gl!.uniform2f(L.uC, cx * dpr, cy * dpr);
    gl!.uniform2f(L.uR, rx * dpr, ry * dpr);
    gl!.uniform1f(L.uOn, Math.max(0, size));
    gl!.uniform1f(L.uHole, rx > 0 ? hole / rx : 0);
    gl!.uniform1f(L.uBoot, floodState ? 1 : 0);
    gl!.uniform1f(L.uGloss, gloss);
    gl!.uniform1i(L.uGround, 2);
    gl!.uniform1i(L.uLetters, 1);
    gl!.uniform3fv(L.uTint, rgb("--fl-body"));
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function frame(now: number): void {
    raf = 0;
    if (document.hidden) { last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (floodState) {
      const v = clamp01((now - floodState.at) / floodState.ms);
      if (v > 0.5 && !floodState.revealed) { floodState.revealed = true; floodState.onReveal(); }
      if (v >= 1) {
        const done = floodState.done;
        floodState = null;
        x = tx = rest.x; y = ty = rest.y; vx = vy = 0;
        on = 0; von = 0; ton = 0;
        draw();
        done();
        return;
      }
      draw();
      raf = requestAnimationFrame(frame);
      return;
    }
    // Short of critical damping: it overshoots once and settles, which is what
    // makes it read as liquid rather than dragged. Ratio .72, the moodboard
    // notes' floor for anything meant to feel like a material.
    const steps = Math.ceil(dt / (1 / 240));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const k = 210, c = 2 * Math.sqrt(k) * 0.72;
      vx += (k * (tx - x) - c * vx) * h; x += vx * h;
      vy += (k * (ty - y) - c * vy) * h; y += vy * h;
      const ko = 170, co = 2 * Math.sqrt(ko) * 0.72;
      von += (ko * (ton - on) - co * von) * h; on += von * h;
    }
    const settled = Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05 && Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5
      && Math.abs(ton - on) < 0.001 && Math.abs(von) < 0.01;
    if (settled) { x = tx; y = ty; vx = vy = 0; on = ton; von = 0; last = 0; }
    draw();
    if (!settled) raf = requestAnimationFrame(frame);
  }

  function kick(): void {
    if (!live) return;
    if (reduce.matches && !floodState) { x = tx; y = ty; on = ton; vx = vy = von = 0; draw(); return; }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  const ready = (async () => {
    // The ground cannot be painted before its font: the name is in it. A font
    // that never comes does not hold the machine up.
    await Promise.race([
      document.fonts.load(`600 100px "General Sans"`, "Jayden Lee"),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    await loadWall();
    measure();
  })();

  function land(): void {
    live = true;
    root.classList.add("gl");
    canvas!.classList.add("is-live");
    x = tx = rest.x; y = ty = rest.y;
    ton = 1;
    if (reduce.matches) on = 1;
    draw();
    kick();
  }

  new ResizeObserver(() => {
    if (!image) return;
    measure();
    tx = rest.x; ty = rest.y;
    if (live) { if (reduce.matches) { x = tx; y = ty; } draw(); kick(); }
  }).observe(stage);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });

  new MutationObserver(() => {
    void (async () => {
      await loadWall();
      if (!image) return;
      paintGround();
      if (live) draw();
    })();
  }).observe(root, { attributes: true, attributeFilter: ["data-desk"] });

  /** The pointer leads the drop only over bare desk: it stays put under a window
   *  somebody is reading, and under the menus. */
  const bare = (target: EventTarget | null) =>
    !(target instanceof Element && target.closest(".win, .menubar, .menu__drop, .mpa"));

  if (!reduce.matches) {
    addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch" || !fine.matches || !bare(event.target)) return;
      tx = event.clientX;
      ty = event.clientY;
      kick();
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => { tx = rest.x; ty = rest.y; kick(); });
    addEventListener("blur", () => { tx = rest.x; ty = rest.y; kick(); });
    // A press dents it; a touch moves it to where it landed.
    addEventListener("pointerdown", (event) => {
      if (!live || !bare(event.target)) return;
      if (event.pointerType === "touch") { tx = event.clientX; ty = event.clientY; }
      else ton = 0.86;
      kick();
    });
    addEventListener("pointerup", () => { if (ton !== 0 && ton !== 1) { ton = 1; kick(); } });
  }

  canvas.addEventListener("webglcontextlost", () => {
    cancelAnimationFrame(raf);
    live = false;
    floodState?.onReveal();
    floodState?.done();
    floodState = null;
    root.classList.remove("gl", "gel-name");
    canvas.remove();
  });

  return {
    ready,
    land,
    flood(fx, fy, r, ms, onReveal) {
      return new Promise<void>((resolve) => {
        live = true;
        root.classList.add("gl");
        canvas!.classList.add("is-live");
        floodState = { at: performance.now(), ms, x: fx, y: fy, r, revealed: false, onReveal, done: resolve };
        draw();
        kick();
      });
    },
  };
}
