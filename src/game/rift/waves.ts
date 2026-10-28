/**
 * rift.exe — wave composition.
 *
 * Ten waves, fixed and hand-tuned rather than randomly rolled, so a run has a
 * shape someone can learn and eventually clear — the same reasoning that made
 * spots.map's block plan hand-drawn instead of generated. Wave 10 is the boss
 * alone; every other wave is a flat spawn list, dealt out over the wave's
 * `spawnIntervalMs` rather than all at once.
 */

import type { EnemyKind } from "./types.ts";

export type WaveDef = {
  wave: number;
  boss: boolean;
  spawns: { kind: Exclude<EnemyKind, "boss">; count: number }[];
  spawnIntervalMs: number;
};

export const WAVES: readonly WaveDef[] = [
  { wave: 1, boss: false, spawns: [{ kind: "rusher", count: 3 }], spawnIntervalMs: 900 },
  {
    wave: 2,
    boss: false,
    spawns: [
      { kind: "rusher", count: 3 },
      { kind: "wisp", count: 4 },
    ],
    spawnIntervalMs: 700,
  },
  {
    wave: 3,
    boss: false,
    spawns: [
      { kind: "caster", count: 2 },
      { kind: "rusher", count: 3 },
    ],
    spawnIntervalMs: 850,
  },
  {
    wave: 4,
    boss: false,
    spawns: [
      { kind: "rusher", count: 4 },
      { kind: "wisp", count: 6 },
    ],
    spawnIntervalMs: 650,
  },
  {
    wave: 5,
    boss: false,
    spawns: [
      { kind: "caster", count: 3 },
      { kind: "rusher", count: 3 },
      { kind: "wisp", count: 4 },
    ],
    spawnIntervalMs: 700,
  },
  {
    wave: 6,
    boss: false,
    spawns: [
      { kind: "rusher", count: 5 },
      { kind: "caster", count: 2 },
      { kind: "wisp", count: 6 },
    ],
    spawnIntervalMs: 650,
  },
  {
    wave: 7,
    boss: false,
    spawns: [
      { kind: "caster", count: 4 },
      { kind: "rusher", count: 4 },
    ],
    spawnIntervalMs: 700,
  },
  {
    wave: 8,
    boss: false,
    spawns: [
      { kind: "rusher", count: 6 },
      { kind: "wisp", count: 8 },
      { kind: "caster", count: 2 },
    ],
    spawnIntervalMs: 550,
  },
  {
    wave: 9,
    boss: false,
    spawns: [
      { kind: "caster", count: 4 },
      { kind: "rusher", count: 5 },
      { kind: "wisp", count: 6 },
    ],
    spawnIntervalMs: 600,
  },
  { wave: 10, boss: true, spawns: [], spawnIntervalMs: 0 },
];

/** Levels a wave-clear promotes the player to trigger an augment pick, per
 *  RIFT.md's run shape: four picks across a ten-wave run. */
export const AUGMENT_LEVELS: readonly number[] = [2, 4, 6, 8];

/** Automatic reward for clearing any wave — the "extra stats" the user asked
 *  for, distinct from the strategic augment picks at the levels above. */
export const WAVE_CLEAR_REWARD = { maxHpGain: 6, heal: 20, damageGain: 1 } as const;

export function waveDef(wave: number): WaveDef | undefined {
  return WAVES.find((w) => w.wave === wave);
}

/** Flattens a wave's spawn list into an order to deal enemies out in. Grouped
 *  round-robin rather than kind-by-kind, so a wave doesn't open with nothing
 *  but rushers and close with nothing but casters. */
export function buildSpawnQueue(def: WaveDef): Exclude<EnemyKind, "boss">[] {
  const buckets = def.spawns.map((s) => ({ kind: s.kind, left: s.count }));
  const queue: Exclude<EnemyKind, "boss">[] = [];
  let remaining = buckets.reduce((n, b) => n + b.left, 0);
  let cursor = 0;
  while (remaining > 0) {
    const bucket = buckets[cursor % buckets.length];
    if (bucket.left > 0) {
      queue.push(bucket.kind);
      bucket.left -= 1;
      remaining -= 1;
    }
    cursor += 1;
  }
  return queue;
}
