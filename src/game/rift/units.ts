/**
 * rift.exe — the roster.
 *
 * One playable unit, tuned, rather than three tuned badly. Names are original
 * — "Mystic" where League has Ezreal — because mechanics are not copyrightable
 * and names are: see RIFT.md's IP note. Every number here is a starting point
 * a playtest is expected to move; nothing is derived from anyone else's kit,
 * only shaped like the genre (skillshot marksman with a blink and a beam).
 */

import type { EnemyKind, PlayerState } from "./types.ts";
import { ARENA, defaultMods } from "./types.ts";

/** MYSTIC — the one playable unit. */
export const MYSTIC = {
  radius: 18,
  speed: 340,
  maxHp: 100,
  attackRange: 260,
  attackDamage: 8,
  attackCooldownMs: 420,

  q: {
    name: "Mystic Bolt",
    cooldownMs: 900,
    speed: 900,
    radius: 10,
    damage: 16,
    ttlMs: 1100,
  },
  w: {
    name: "Barrier Mine",
    cooldownMs: 4200,
    armMs: 400,
    liveMs: 6000,
    radius: 90,
    damage: 30,
  },
  e: {
    name: "Flicker",
    cooldownMs: 3200,
    distance: 260,
    invulnMs: 150,
  },
  r: {
    name: "Basin Collapse",
    cooldownMs: 16000,
    armMs: 650,
    length: 1000,
    width: 70,
    damage: 55,
  },
} as const;

export function spawnPlayer(): PlayerState {
  return {
    pos: { x: ARENA.w / 2, y: ARENA.h / 2 },
    aim: { x: ARENA.w / 2 + 200, y: ARENA.h / 2 },
    hp: MYSTIC.maxHp,
    maxHp: MYSTIC.maxHp,
    speed: MYSTIC.speed,
    level: 1,
    attackRange: MYSTIC.attackRange,
    attackDamage: MYSTIC.attackDamage,
    attackCooldownMs: MYSTIC.attackCooldownMs,
    attackTimerMs: 0,
    cooldowns: { q: 0, w: 0, e: 0, r: 0 },
    mods: defaultMods(),
    invulnMs: 0,
    hasteMs: 0,
    alive: true,
  };
}

/** Enemy archetypes. `caster` is the one that telegraphs a skillshot — the
 *  thing a run is actually about dodging. `rusher` and `wisp` are contact
 *  pressure so the arena never empties out while you line up a shot. */
export const ENEMY_BASE: Record<Exclude<EnemyKind, "boss">, {
  radius: number;
  speed: number;
  maxHp: number;
  contactDamage: number;
  attackCooldownMs: number;
  windupMs: number;
  projectileSpeed: number;
  projectileRadius: number;
  projectileDamage: number;
}> = {
  rusher: {
    radius: 16,
    speed: 190,
    maxHp: 30,
    contactDamage: 9,
    attackCooldownMs: 700,
    windupMs: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileDamage: 0,
  },
  caster: {
    radius: 15,
    speed: 110,
    maxHp: 22,
    contactDamage: 4,
    attackCooldownMs: 2600,
    windupMs: 500,
    projectileSpeed: 620,
    projectileRadius: 9,
    projectileDamage: 12,
  },
  wisp: {
    radius: 9,
    speed: 260,
    maxHp: 10,
    contactDamage: 5,
    attackCooldownMs: 500,
    windupMs: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    projectileDamage: 0,
  },
};

/** The Saddle — the critical point between the field's two minima, and the
 *  wave-10 boss. Three phases on HP thresholds, not a timer, so a slow,
 *  careful run and a fast, reckless one both see the same fight shape. */
export const BOSS = {
  radius: 46,
  speed: 70,
  maxHp: 900,
  contactDamage: 14,
  attackCooldownMs: 900,
  phaseThresholds: [0.66, 0.33] as const,
  spokes: { count: 8, length: 260, width: 34, damage: 14, telegraphMs: 500 },
  beam: { width: 60, length: 900, damage: 20, telegraphMs: 700 },
  summon: { count: 2, everyMs: 4000 },
};
