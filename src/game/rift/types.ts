/**
 * rift.exe — shared types.
 *
 * No DOM in this file or anywhere under src/game/rift/. See RIFT.md before
 * changing anything here: this directory is the pure half of the game
 * (state + rules), the same split neighborhood.ts draws for spots.map.
 *
 * State carries only plain data — no functions, no DOM references — so a run
 * can be logged, replayed, or checked from Node without a browser.
 */

/** Arena space. Deliberately the same box `src/field/core.ts` authors its
 *  surface in, so the arena floor can be sampled from that field directly at
 *  render time with no separate coordinate system to keep in sync. */
export const ARENA = { w: 1600, h: 1000 } as const;

export type Vec = { x: number; y: number };

export type EnemyKind = "rusher" | "caster" | "wisp" | "boss";

export type Enemy = {
  id: number;
  kind: EnemyKind;
  pos: Vec;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  contactDamage: number;
  attackCooldownMs: number;
  attackTimerMs: number;
  /** Ranged only: counts down while a telegraph is armed, then fires.
   *  Repurposed by the boss's phase-3 AI as its wisp-summon cadence, since
   *  the boss never telegraphs its own attack this way and `attackTimerMs`
   *  is already spoken for by its contact-damage cooldown. */
  windupMs: number;
  /** Ranged only: the point aimed at, snapshotted when the windup starts, so
   *  a player who moves during it can genuinely dodge the shot. */
  aim: Vec;
  /** Boss only. */
  phase: number;
  phaseTimerMs: number;
};

export type Projectile = {
  id: number;
  side: "player" | "enemy";
  pos: Vec;
  vel: Vec;
  radius: number;
  damage: number;
  pierce: boolean;
  ttlMs: number;
  /** Enemy ids already struck, so a piercing bolt cannot hit one twice. */
  hit: Set<number>;
};

export type TelegraphShape =
  | { kind: "line"; from: Vec; to: Vec; width: number }
  | { kind: "circle"; center: Vec; radius: number };

/** What happens when a telegraph's arm timer reaches zero. Pure data tag,
 *  dispatched in sim.ts — never a stored closure, so state stays plain data. */
export type TelegraphResolve = "beam" | "mine";

export type Telegraph = {
  id: number;
  side: "player" | "enemy";
  shape: TelegraphShape;
  armMs: number;
  /** `armMs`'s starting value, kept so a renderer can compute how close to
   *  resolving this is (`1 - armMs / armTotalMs`) without the sim exposing
   *  anything beyond plain state. */
  armTotalMs: number;
  damage: number;
  resolve: TelegraphResolve;
  /** Mines only: stays live after arming instead of resolving once. */
  liveMs: number;
};

/** Per-run modifiers, set by augment picks. Neutral defaults so a fresh run
 *  needs no special-casing anywhere else in the sim. */
export type PlayerMods = {
  qPierce: boolean;
  qSplit: boolean;
  wDouble: boolean;
  wRadiusMul: number;
  wDamageMul: number;
  rDamageMul: number;
  rWidthMul: number;
  rCooldownMul: number;
  atkSpeedMul: number;
  cooldownMul: number;
  rangeMul: number;
  dashDistMul: number;
  dashCooldownMul: number;
  chainAttack: boolean;
  damageReduction: number;
  hasteOnCast: boolean;
  reviveAvailable: boolean;
};

export function defaultMods(): PlayerMods {
  return {
    qPierce: false,
    qSplit: false,
    wDouble: false,
    wRadiusMul: 1,
    wDamageMul: 1,
    rDamageMul: 1,
    rWidthMul: 1,
    rCooldownMul: 1,
    atkSpeedMul: 1,
    cooldownMul: 1,
    rangeMul: 1,
    dashDistMul: 1,
    dashCooldownMul: 1,
    chainAttack: false,
    damageReduction: 0,
    hasteOnCast: false,
    reviveAvailable: false,
  };
}

export type PlayerState = {
  pos: Vec;
  aim: Vec;
  hp: number;
  maxHp: number;
  speed: number;
  level: number;
  attackRange: number;
  attackDamage: number;
  attackCooldownMs: number;
  attackTimerMs: number;
  cooldowns: { q: number; w: number; e: number; r: number };
  mods: PlayerMods;
  /** Brief i-frame window after a dash. */
  invulnMs: number;
  /** Decaying move-speed buff from "Steepest Descent". */
  hasteMs: number;
  alive: boolean;
};

export type RunStatus = "running" | "won" | "lost";

/** Normalised input for one simulation step. Both control schemes (WASD+mouse
 *  and click-to-move) resolve into this shape before sim.step ever sees them,
 *  so the sim has exactly one input path to reason about. */
export type Intent = {
  /** -1..1 per axis. */
  move: Vec;
  /** World-space point the player is aiming at. */
  aim: Vec;
  autoattack: boolean;
  castQ: boolean;
  castW: boolean;
  castE: boolean;
  castR: boolean;
};

export function neutralIntent(): Intent {
  return {
    move: { x: 0, y: 0 },
    aim: { x: ARENA.w / 2 + 200, y: ARENA.h / 2 },
    autoattack: false,
    castQ: false,
    castW: false,
    castE: false,
    castR: false,
  };
}

export type RiftState = {
  tMs: number;
  wave: number;
  waveActive: boolean;
  bossWave: boolean;
  /** The boss never spawns through this queue — it's placed directly when
   *  its wave starts — so this never holds `"boss"`. */
  spawnQueue: Exclude<EnemyKind, "boss">[];
  spawnTimerMs: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  telegraphs: Telegraph[];
  player: PlayerState;
  augmentsOwned: string[];
  pendingPicks: number;
  status: RunStatus;
  nextId: number;
  /** mulberry32 seed. Advanced by rng(), never read directly outside sim.ts. */
  seed: number;
};
