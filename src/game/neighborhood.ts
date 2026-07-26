/**
 * spots.map — the block plan.
 *
 * No DOM in here. The map is checkable on its own, and `validate()` exists so
 * it can be checked from Node without a browser:
 *
 *     node --experimental-strip-types \
 *       -e 'import("./src/game/neighborhood.ts").then(m => console.log(m.validate()))'
 *
 * The geometry is hand-drawn, not generated. A procedural neighborhood reads as
 * a screensaver; a real block plan reads as a place, and this one is meant to
 * be somewhere you can get your bearings in. There is no seed and no daily
 * reshuffle — those belonged to the game this replaced.
 */

/** The whole plan is integer cells; nothing in here knows about pixels. */
export const GRID = { cols: 28, rows: 18 } as const;

export type Cell = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

/** Which way the building lies from its door cell. */
export type Facing = "N" | "S" | "E" | "W";

export type Slot = { id: string; door: Cell; facing: Facing };

/** Where the walker starts: a middle intersection, near nothing in particular. */
export const START: Cell = { x: 9, y: 6 };

/**
 * Building footprints. Everything not inside one is street.
 *
 * Three bands of three, with two-cell corridors between them — wide enough that
 * the walker never looks wedged, narrow enough that the neighborhood fits one
 * screen. The bottom band is shallower than the other two so the plan does not
 * read as graph paper.
 */
export const BLOCKS: readonly Rect[] = [
  { x: 2, y: 2, w: 6, h: 4 },
  { x: 10, y: 2, w: 6, h: 4 },
  { x: 18, y: 2, w: 8, h: 4 },
  { x: 2, y: 8, w: 6, h: 4 },
  { x: 10, y: 8, w: 6, h: 4 },
  { x: 18, y: 8, w: 8, h: 4 },
  { x: 2, y: 14, w: 6, h: 2 },
  { x: 10, y: 14, w: 6, h: 2 },
  { x: 18, y: 14, w: 8, h: 2 },
];

/**
 * Storefront doors, in fill order.
 *
 * `content/spots.md` fills these in the order they are written — entry n lands
 * in slot n — so Jayden never types a coordinate. The order below is a walk
 * rather than a raster scan: it starts beside the spawn and works outward, so
 * the first places he writes are the first ones found.
 *
 * There are more slots than the twelve-or-so the content is sized for. Extras
 * stay vacant, which is honest, and which makes the plan look like a
 * neighborhood rather than a board with every square filled.
 */
export const SLOTS: readonly Slot[] = [
  { id: "s1", door: { x: 9, y: 4 }, facing: "E" },
  { id: "s2", door: { x: 5, y: 6 }, facing: "N" },
  { id: "s3", door: { x: 13, y: 7 }, facing: "S" },
  { id: "s4", door: { x: 9, y: 10 }, facing: "E" },
  { id: "s5", door: { x: 12, y: 1 }, facing: "S" },
  { id: "s6", door: { x: 4, y: 1 }, facing: "S" },
  { id: "s7", door: { x: 1, y: 3 }, facing: "E" },
  { id: "s8", door: { x: 3, y: 7 }, facing: "S" },
  { id: "s9", door: { x: 16, y: 9 }, facing: "W" },
  { id: "s10", door: { x: 21, y: 1 }, facing: "S" },
  { id: "s11", door: { x: 22, y: 7 }, facing: "S" },
  { id: "s12", door: { x: 26, y: 4 }, facing: "W" },
  { id: "s13", door: { x: 5, y: 13 }, facing: "S" },
  { id: "s14", door: { x: 20, y: 13 }, facing: "S" },
];

const OFFSET: Record<Facing, Cell> = {
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
};

const STEPS: readonly Cell[] = [OFFSET.N, OFFSET.S, OFFSET.E, OFFSET.W];

export function inBounds(c: Cell): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < GRID.cols && c.y < GRID.rows;
}

function insideBlock(c: Cell): boolean {
  for (const b of BLOCKS) {
    if (c.x >= b.x && c.x < b.x + b.w && c.y >= b.y && c.y < b.y + b.h) return true;
  }
  return false;
}

/** Street, and on the plan. Buildings are solid; you walk around them. */
export function walkable(c: Cell): boolean {
  return inBounds(c) && !insideBlock(c);
}

/**
 * One step. Returns the *same object* when the move is into a wall or off the
 * plan, so a caller can compare by identity to know nothing happened and skip
 * the repaint. That check is what keeps walking into a wall free.
 */
export function step(from: Cell, dx: number, dy: number): Cell {
  const next = { x: from.x + dx, y: from.y + dy };
  return walkable(next) ? next : from;
}

/** The storefront whose door is this exact cell, if any. */
export function slotAt(c: Cell): Slot | null {
  for (const s of SLOTS) {
    if (s.door.x === c.x && s.door.y === c.y) return s;
  }
  return null;
}

/** The building cell a storefront's front is drawn on. */
export function frontOf(slot: Slot): Cell {
  const o = OFFSET[slot.facing];
  return { x: slot.door.x + o.x, y: slot.door.y + o.y };
}

const key = (c: Cell) => c.y * GRID.cols + c.x;
const unkey = (k: number): Cell => ({ x: k % GRID.cols, y: Math.floor(k / GRID.cols) });

/**
 * Shortest walk between two street cells, excluding the start and including the
 * destination. `null` when the route does not exist or an end is a building.
 *
 * Breadth-first over at most 504 cells. Only a tap calls this — keyboard
 * movement goes a cell at a time through `step` — so it runs once per gesture
 * and never in a loop.
 */
export function pathTo(from: Cell, to: Cell): Cell[] | null {
  if (!walkable(from) || !walkable(to)) return null;

  const start = key(from);
  const target = key(to);
  if (start === target) return [];

  const cameFrom = new Map<number, number>();
  const seen = new Set<number>([start]);
  let frontier: Cell[] = [from];

  while (frontier.length) {
    const next: Cell[] = [];

    for (const c of frontier) {
      for (const o of STEPS) {
        const n = { x: c.x + o.x, y: c.y + o.y };
        if (!walkable(n)) continue;

        const k = key(n);
        if (seen.has(k)) continue;
        seen.add(k);
        cameFrom.set(k, key(c));

        if (k === target) {
          const path: Cell[] = [];
          for (let at = k; at !== start; at = cameFrom.get(at) as number) {
            path.push(unkey(at));
          }
          return path.reverse();
        }
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * Problems with the plan, as plain sentences. Empty means the map is sound.
 *
 * Worth running after any edit to BLOCKS or SLOTS. A door sunk inside a
 * building, or one facing open street, draws nothing on the canvas and would
 * otherwise surface only as a storefront nobody can find.
 */
export function validate(): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const doors = new Set<number>();

  for (const b of BLOCKS) {
    if (b.x < 1 || b.y < 1 || b.x + b.w > GRID.cols - 1 || b.y + b.h > GRID.rows - 1) {
      problems.push(`block at ${b.x},${b.y} touches or crosses the plan edge`);
    }
  }

  for (const s of SLOTS) {
    if (ids.has(s.id)) problems.push(`duplicate slot id ${s.id}`);
    ids.add(s.id);

    if (doors.has(key(s.door))) {
      problems.push(`two slots share the door cell ${s.door.x},${s.door.y}`);
    }
    doors.add(key(s.door));

    if (!walkable(s.door)) {
      problems.push(`${s.id}: door ${s.door.x},${s.door.y} is not on the street`);
    }
    if (!insideBlock(frontOf(s))) {
      problems.push(`${s.id}: faces ${s.facing} into open street, not a building`);
    }
    if (!pathTo(START, s.door)) {
      problems.push(`${s.id}: no route from the start`);
    }
  }

  if (!walkable(START)) problems.push("START is not on the street");

  return problems;
}
