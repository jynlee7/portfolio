/**
 * The scalar field, shared by the static wallpaper generator and the live
 * canvas that reacts to the pointer.
 *
 * Both must agree exactly: the SVG is what paints before JS runs and what
 * remains under reduced motion, and the canvas draws over it. If the two
 * drifted you would see the wallpaper jump on load. So the surface function,
 * the level spacing and the palettes live here and nowhere else.
 *
 * Node runs this file directly (v23.6+ strips types), and Vite bundles it for
 * the browser.
 */

/** Canonical frame. The field is authored for a 1600x1000 box; every consumer
 *  maps its own pixels through this so a wide monitor and a phone are looking
 *  at the same surface, cropped differently. */
export const FRAME = { w: 1600, h: 1000 };
export const ASPECT = FRAME.w / FRAME.h;

/** A gaussian well. Negative depth digs down, positive pushes up. */
function well(
  x: number,
  y: number,
  cx: number,
  cy: number,
  depth: number,
  spread: number,
): number {
  const dx = x - cx;
  const dy = y - cy;
  return -depth * Math.exp(-(dx * dx + dy * dy) / (2 * spread * spread));
}

/** A live disturbance — the pointer pressing on the sheet. */
export type Bump = {
  x: number;
  y: number;
  /** Positive pushes the surface up, which spreads contours outward. */
  amp: number;
  spread: number;
};

/**
 * The surface. Two deep wells with a saddle between them, a broad tilt so the
 * level sets never close into concentric rings, and a low-frequency ripple to
 * keep the outer contours from going circular.
 *
 * Wells are placed so the deepest sits centre-low, leaving the top-left quiet
 * for the nameplate and the right edge quiet for the widget rail.
 */
export function surface(x: number, y: number, bump?: Bump): number {
  let v =
    well(x, y, -0.26, 0.2, 1.0, 0.34) +
    well(x, y, 0.72, -0.3, 0.82, 0.42) +
    well(x, y, 0.3, 0.62, 0.3, 0.26) +
    0.22 * x +
    0.14 * y +
    0.06 * Math.sin(2.1 * x + 0.7) * Math.cos(1.7 * y - 0.4);

  if (bump && bump.amp !== 0) {
    v += well(x, y, bump.x, bump.y, -bump.amp, bump.spread);
  }

  return v;
}

/** Level spacing. Non-linear so contours pack into the wells, the way a real
 *  contour map crowds where the gradient is steep. */
export const LEVELS = 26;

export function levelAt(i: number, min: number, max: number): number {
  const t = i / (LEVELS - 1);
  return min + (max - min) * Math.pow(t, 1.45);
}

/** 0 at the deepest contour, 1 at the shallowest. Drives colour and weight. */
export function depthOf(i: number): number {
  return i / (LEVELS - 1);
}

export type Theme = {
  file: string;
  backdrop: { offset: number; color: string }[];
  glow: string;
  /** Carried by contours inside the wells. */
  stroke: string;
  /** Carried by the shallow contours outside them. */
  strokeShallow: string;
  opacity: (t: number) => number;
  width: (t: number) => number;
};

export const THEMES: Record<string, Theme> = {
  /* Default. The use scene is a hiring manager on a laptop in a bright room,
     so the desktop is light: a plot printed on bone stock, contours in
     graphite, indigo only where the surface is deepest. */
  lab: {
    file: "field-lab.svg",
    backdrop: [
      { offset: 0, color: "#eceae3" },
      { offset: 0.58, color: "#e3e0d7" },
      { offset: 1, color: "#d6d3c9" },
    ],
    glow: "rgba(67, 56, 245, 0.13)",
    stroke: "#4338f5",
    strokeShallow: "#4a4754",
    opacity: (t) => 0.22 + 0.5 * Math.pow(1 - t, 1.6),
    width: (t) => 0.8 + 1.5 * Math.pow(1 - t, 2.2),
  },
  /* Mid-tone alternative. Slate, not near-black — a darker desk lamp, not a
     different aesthetic. */
  slate: {
    file: "field-slate.svg",
    backdrop: [
      { offset: 0, color: "#3f4454" },
      { offset: 0.55, color: "#343949" },
      { offset: 1, color: "#282c3a" },
    ],
    glow: "rgba(139, 131, 255, 0.24)",
    stroke: "#b9b4ff",
    strokeShallow: "#98a0b8",
    opacity: (t) => 0.2 + 0.5 * Math.pow(1 - t, 1.6),
    width: (t) => 0.8 + 1.6 * Math.pow(1 - t, 2.2),
  },
  /* Drenched. The accent owns the whole field. */
  blueprint: {
    file: "field-blueprint.svg",
    backdrop: [
      { offset: 0, color: "#3b31d8" },
      { offset: 0.55, color: "#2f27ba" },
      { offset: 1, color: "#241d92" },
    ],
    glow: "rgba(226, 232, 255, 0.22)",
    stroke: "#ffffff",
    strokeShallow: "#b9b2ff",
    opacity: (t) => 0.18 + 0.5 * Math.pow(1 - t, 1.6),
    width: (t) => 0.8 + 1.6 * Math.pow(1 - t, 2.2),
  },
};

/** The accent is earned by depth: only contours inside the wells carry it. */
export function strokeFor(theme: Theme, t: number): string {
  return t < 0.45 ? theme.stroke : theme.strokeShallow;
}

/**
 * Sample the field onto a grid.
 *
 * `project` turns a grid index into field coordinates, so callers decide how
 * their pixels map onto the canonical frame (the SVG uses the whole frame; the
 * canvas emulates `background-size: cover`).
 */
export function sampleGrid(
  cols: number,
  rows: number,
  project: (c: number, r: number) => [number, number],
  bump?: Bump,
): { values: Float64Array; min: number; max: number } {
  const values = new Float64Array(cols * rows);
  let min = Infinity;
  let max = -Infinity;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const [x, y] = project(c, r);
      const v = surface(x, y, bump);
      values[r * cols + c] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  return { values, min, max };
}

/**
 * Marching squares.
 *
 * `emit` receives one line segment at a time in grid-cell units. Callers scale
 * it: the generator collects segments to join into polylines, the canvas
 * strokes them directly.
 *
 * Saddle cells (5 and 10) are disambiguated with the cell average, which stops
 * contours from crossing themselves.
 */
export function marchingSquares(
  values: Float64Array,
  cols: number,
  rows: number,
  level: number,
  emit: (x1: number, y1: number, x2: number, y2: number) => void,
): void {
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = values[r * cols + c];
      const tr = values[r * cols + c + 1];
      const br = values[(r + 1) * cols + c + 1];
      const bl = values[(r + 1) * cols + c];

      let idx = 0;
      if (tl > level) idx |= 8;
      if (tr > level) idx |= 4;
      if (br > level) idx |= 2;
      if (bl > level) idx |= 1;
      if (idx === 0 || idx === 15) continue;

      // Crossing points along each edge, in cell-relative units.
      const top = (): [number, number] => [c + (level - tl) / (tr - tl), r];
      const right = (): [number, number] => [c + 1, r + (level - tr) / (br - tr)];
      const bottom = (): [number, number] => [c + (level - bl) / (br - bl), r + 1];
      const left = (): [number, number] => [c, r + (level - tl) / (bl - tl)];

      const line = (a: [number, number], b: [number, number]) =>
        emit(a[0], a[1], b[0], b[1]);

      switch (idx) {
        case 1:
        case 14:
          line(left(), bottom());
          break;
        case 2:
        case 13:
          line(bottom(), right());
          break;
        case 3:
        case 12:
          line(left(), right());
          break;
        case 4:
        case 11:
          line(top(), right());
          break;
        case 6:
        case 9:
          line(top(), bottom());
          break;
        case 7:
        case 8:
          line(left(), top());
          break;
        case 5: {
          const avg = (tl + tr + br + bl) / 4;
          if (avg > level) {
            line(left(), top());
            line(bottom(), right());
          } else {
            line(left(), bottom());
            line(top(), right());
          }
          break;
        }
        case 10: {
          const avg = (tl + tr + br + bl) / 4;
          if (avg > level) {
            line(top(), right());
            line(left(), bottom());
          } else {
            line(left(), top());
            line(bottom(), right());
          }
          break;
        }
      }
    }
  }
}
