/**
 * The neighborhood: a hidden scalar field you can only learn by eating.
 *
 * This is the same shape as the surface behind the desktop — two peaks with a
 * saddle between them, one better than the other — but it is deliberately NOT
 * `src/field/core.ts`. That file is the wallpaper's single source of truth and
 * changing it means regenerating three SVGs. This one is reseeded every day and
 * has no business touching the desk.
 *
 * No DOM in here. The rules are checkable on their own.
 */

export const COLS = 8;
export const ROWS = 6;
export const NIGHTS = 7;

/** Ratings live in a range people already know how to read. */
const FLOOR = 4.2;
const CEIL = 9.4;

/** A visited block. `value` is fixed the moment it is first sampled. */
export type Sample = { c: number; r: number; value: number };

export type Block = { c: number; r: number; value: number };

export type Neighborhood = {
  seed: number;
  /** Rating of a block, to one decimal. Deterministic. */
  rating: (c: number, r: number) => number;
  /**
   * The underlying surface, continuous and unrounded, for drawing contours.
   * Block ratings are this plus a little per-block noise: the map is the smooth
   * truth, individual kitchens vary.
   */
  smooth: (c: number, r: number) => number;
  /** The single best block. What the whole week was competing against. */
  best: Block;
  /** The best block far away from `best` — the plausible wrong answer. */
  decoy: Block;
};

/** `A1` through `H6`. A grid reference, not a fabricated restaurant name. */
export function label(c: number, r: number): string {
  return `${String.fromCharCode(65 + c)}${r + 1}`;
}

/** Small deterministic PRNG. Same seed, same neighborhood, no dependency. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Today, on this machine's clock.
 *
 * Pacific, not the visitor's own timezone, and deliberately: the menubar clock
 * keeps Pacific, and the document claims everyone gets the same neighborhood on
 * the same day. Seeding off local time would quietly make that false — someone
 * in Tokyo would be playing tomorrow's board. One machine, one day, one
 * neighborhood.
 */
export function dayKey(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is the key we want anyway.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function seedForDay(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Distance in normalised board units. */
function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function peak(
  x: number,
  y: number,
  cx: number,
  cy: number,
  height: number,
  spread: number,
): number {
  const dx = x - cx;
  const dy = y - cy;
  return height * Math.exp(-(dx * dx + dy * dy) / (2 * spread * spread));
}

/**
 * Build a neighborhood.
 *
 * The weaker peak is pulled toward the middle of the board and given a wider
 * spread, so a greedy walk finds it first and finds it easily. The better one
 * is tighter and pushed to the edges. That asymmetry is the entire game: the
 * comfortable answer is genuinely good and genuinely not the best.
 */
export function makeNeighborhood(seed: number): Neighborhood {
  let attempt = seed >>> 0;

  for (let tries = 0; tries < 12; tries++) {
    const built = build(attempt);
    // Reject boards where the safe answer is as good as the right one; there
    // is no decision left in those and the closing line falls flat.
    if (built.best.value - built.decoy.value >= 0.55) return built;
    attempt = (Math.imul(attempt, 1664525) + 1013904223) >>> 0;
  }

  return build(attempt);
}

function build(seed: number): Neighborhood {
  const rand = mulberry32(seed);

  // Decoy sits central. Wide and forgiving — easy to stumble into.
  const dx = 0.34 + rand() * 0.32;
  const dy = 0.32 + rand() * 0.36;

  // The real one keeps its distance. Tighter, so it has to be looked for.
  let bx = 0;
  let by = 0;
  do {
    bx = 0.1 + rand() * 0.8;
    by = 0.1 + rand() * 0.8;
  } while (dist(bx, by, dx, dy) < 0.44);

  const ripplePhase = rand() * Math.PI * 2;
  const rippleFreq = 2.2 + rand() * 1.4;

  // Per-block jitter, precomputed so a block's rating never moves once set.
  const jitter = new Float64Array(COLS * ROWS);
  for (let i = 0; i < jitter.length; i++) jitter[i] = (rand() - 0.5) * 0.16;

  // The surface, continuous in c and r so contours drawn from it are smooth.
  const raw = (c: number, r: number): number => {
    const x = (c + 0.5) / COLS;
    const y = (r + 0.5) / ROWS;
    return (
      peak(x, y, bx, by, 1.2, 0.17) +
      peak(x, y, dx, dy, 1.0, 0.25) +
      0.09 * Math.sin(rippleFreq * x + ripplePhase) * Math.cos(rippleFreq * y)
    );
  };

  const noiseAt = (c: number, r: number): number => jitter[r * COLS + c] ?? 0;

  // Normalise across the whole board so ratings always use the full range.
  let lo = Infinity;
  let hi = -Infinity;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = raw(c, r) + noiseAt(c, r);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  const span = hi - lo || 1;
  const scale = (v: number): number => FLOOR + ((v - lo) / span) * (CEIL - FLOOR);

  const smooth = (c: number, r: number): number => scale(raw(c, r));

  const rating = (c: number, r: number): number =>
    Math.round(scale(raw(c, r) + noiseAt(c, r)) * 10) / 10;

  // The best block is whatever actually scores highest — read off the board,
  // not asserted from the peak we placed.
  let best: Block = { c: 0, r: 0, value: -Infinity };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = rating(c, r);
      if (v > best.value) best = { c, r, value: v };
    }
  }

  // The runner-up, measured far enough from the winner that it is a different
  // place to eat rather than the block next door.
  let decoy: Block = { c: 0, r: 0, value: -Infinity };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const far = dist((c + 0.5) / COLS, (r + 0.5) / ROWS, (best.c + 0.5) / COLS, (best.r + 0.5) / ROWS);
      if (far < 0.3) continue;
      const v = rating(c, r);
      if (v > decoy.value) decoy = { c, r, value: v };
    }
  }

  return { seed, rating, smooth, best, decoy };
}

/**
 * What the machine believes the neighborhood looks like, given what has been
 * eaten so far. Inverse distance weighting at power four — sharp enough that
 * each new sample visibly rearranges the map, which is the point of drawing it.
 *
 * Under two samples there is nothing honest to draw, so it returns null and the
 * board shows an empty grid.
 */
export function estimate(
  samples: Sample[],
): ((c: number, r: number) => number) | null {
  if (samples.length < 2) return null;

  return (c, r) => {
    let num = 0;
    let den = 0;
    for (const s of samples) {
      const dc = c - s.c;
      const dr = r - s.r;
      const d2 = dc * dc + dr * dr;
      if (d2 < 1e-9) return s.value;
      const w = 1 / (d2 * d2);
      num += w * s.value;
      den += w;
    }
    return num / den;
  };
}

/** The average of every night eaten. The only score that counts. */
export function weekAverage(picks: Sample[]): number {
  if (!picks.length) return 0;
  const total = picks.reduce((sum, p) => sum + p.value, 0);
  return Math.round((total / picks.length) * 10) / 10;
}
