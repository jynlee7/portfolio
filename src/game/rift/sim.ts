/**
 * rift.exe — the simulation.
 *
 * The only place a wave table, an augment id, or a unit stat turns into a
 * moving thing. No DOM, no canvas, no requestAnimationFrame — `step()` is a
 * pure function of (state, intent, dtMs); `src/os/rift.ts` owns the loop that
 * calls it and everything about when that loop is allowed to run at all. See
 * RIFT.md §1 before touching the cadence anything here fires on.
 */

import type {
  Enemy,
  EnemyKind,
  Intent,
  Projectile,
  RiftState,
  Telegraph,
  Vec,
} from "./types.ts";
import { ARENA } from "./types.ts";
import { type AugmentId, mulberry32, rollOffers } from "./augments.ts";
import { BOSS, ENEMY_BASE, MYSTIC, spawnPlayer } from "./units.ts";
import { AUGMENT_LEVELS, WAVE_CLEAR_REWARD, buildSpawnQueue, waveDef } from "./waves.ts";

/* --- Vector helpers -------------------------------------------------- */

function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}
function len(v: Vec): number {
  return Math.hypot(v.x, v.y);
}
function norm(v: Vec): Vec {
  const l = len(v);
  return l > 1e-6 ? { x: v.x / l, y: v.y / l } : { x: 1, y: 0 };
}
function scale(v: Vec, s: number): Vec {
  return { x: v.x * s, y: v.y * s };
}
function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function rotate(v: Vec, rad: number): Vec {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
function clampToArena(p: Vec, radius: number): Vec {
  return {
    x: clamp(p.x, radius, ARENA.w - radius),
    y: clamp(p.y, radius, ARENA.h - radius),
  };
}

/** Shortest distance from a point to a segment, for beam collision. */
function pointSegDist(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y;
  if (l2 < 1e-6) return dist(p, a);
  const t = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2, 0, 1);
  const proj = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return dist(p, proj);
}

/* --- Run setup --------------------------------------------------------- */

export function createRun(seed: number): RiftState {
  const state: RiftState = {
    tMs: 0,
    wave: 1,
    waveActive: false,
    bossWave: false,
    spawnQueue: [],
    spawnTimerMs: 0,
    enemies: [],
    projectiles: [],
    telegraphs: [],
    player: spawnPlayer(),
    augmentsOwned: [],
    pendingPicks: 0,
    status: "running",
    nextId: 1,
    seed,
  };
  startWave(state);
  return state;
}

const rngFor = (state: RiftState) => {
  const rng = mulberry32(state.seed);
  // Advance the seed itself so the next call gets a different stream. Coarse,
  // but this only feeds spawn edges and augment offers, not combat math.
  state.seed = (state.seed + 0x9e3779b9) >>> 0;
  return rng;
};

function edgeSpawn(rng: () => number, radius: number): Vec {
  const side = Math.floor(rng() * 4);
  const inset = radius + 6;
  switch (side) {
    case 0:
      return { x: rng() * ARENA.w, y: inset };
    case 1:
      return { x: ARENA.w - inset, y: rng() * ARENA.h };
    case 2:
      return { x: rng() * ARENA.w, y: ARENA.h - inset };
    default:
      return { x: inset, y: rng() * ARENA.h };
  }
}

function spawnEnemy(state: RiftState, kind: Exclude<EnemyKind, "boss">, pos: Vec): Enemy {
  const base = ENEMY_BASE[kind];
  return {
    id: state.nextId++,
    kind,
    pos,
    hp: base.maxHp,
    maxHp: base.maxHp,
    speed: base.speed,
    radius: base.radius,
    contactDamage: base.contactDamage,
    attackCooldownMs: base.attackCooldownMs,
    attackTimerMs: base.attackCooldownMs * 0.5,
    windupMs: 0,
    aim: { x: pos.x, y: pos.y },
    phase: 1,
    phaseTimerMs: 0,
  };
}

function spawnBoss(state: RiftState): Enemy {
  return {
    id: state.nextId++,
    kind: "boss",
    pos: { x: ARENA.w / 2, y: 120 },
    hp: BOSS.maxHp,
    maxHp: BOSS.maxHp,
    speed: BOSS.speed,
    radius: BOSS.radius,
    contactDamage: BOSS.contactDamage,
    attackCooldownMs: BOSS.attackCooldownMs,
    attackTimerMs: 0,
    windupMs: 0,
    aim: { x: 0, y: 0 },
    phase: 1,
    phaseTimerMs: 0,
  };
}

/** Begins the current `state.wave`. Called once from `createRun`, and again
 *  from `src/os/rift.ts` after the last augment of a pick is resolved, since
 *  a pending pick holds the next wave back until the player has chosen. */
export function startWave(state: RiftState): void {
  const def = waveDef(state.wave);
  if (!def) {
    state.status = "won";
    return;
  }
  state.bossWave = def.boss;
  state.waveActive = true;
  if (def.boss) {
    state.enemies.push(spawnBoss(state));
    state.spawnQueue = [];
  } else {
    state.spawnQueue = buildSpawnQueue(def);
    state.spawnTimerMs = 0;
  }
}

/* --- Augments ------------------------------------------------------------ */

export function offerAugments(state: RiftState): { id: AugmentId; name: string; desc: string }[] {
  return rollOffers(state.augmentsOwned, rngFor(state));
}

export function applyAugment(state: RiftState, id: AugmentId): void {
  const m = state.player.mods;
  switch (id) {
    case "steepest-descent":
      m.hasteOnCast = true;
      break;
    case "contour":
      m.qPierce = true;
      break;
    case "second-minimum":
      m.reviveAvailable = true;
      break;
    case "basin":
      m.wRadiusMul *= 1.4;
      m.wDamageMul *= 1.25;
      break;
    case "curvature":
      m.rWidthMul *= 1.35;
      m.rDamageMul *= 1.3;
      m.rCooldownMul *= 1.2;
      break;
    case "gradient-step":
      m.atkSpeedMul *= 0.82;
      break;
    case "tempered":
      state.player.maxHp += 30;
      state.player.hp = Math.min(state.player.hp + 30, state.player.maxHp);
      break;
    case "overclock":
      m.cooldownMul *= 0.85;
      break;
    case "long-reach":
      m.rangeMul *= 1.25;
      break;
    case "momentum":
      m.dashDistMul *= 1.3;
      m.dashCooldownMul *= 0.8;
      break;
    case "field-charge":
      m.chainAttack = true;
      break;
    case "dense-lattice":
      m.damageReduction = 1 - (1 - m.damageReduction) * 0.88;
      break;
    case "resonance":
      m.qSplit = true;
      break;
    case "equilibrium":
      m.wDouble = true;
      break;
  }
  state.augmentsOwned = [...state.augmentsOwned, id];
  state.pendingPicks = Math.max(0, state.pendingPicks - 1);
  if (state.pendingPicks === 0 && !state.waveActive) startWave(state);
}

/* --- Player abilities ----------------------------------------------------- */

function fireQ(state: RiftState): void {
  const p = state.player;
  const dir = norm(sub(p.aim, p.pos));
  const make = (d: Vec): Projectile => ({
    id: state.nextId++,
    side: "player",
    pos: { ...p.pos },
    vel: scale(d, MYSTIC.q.speed),
    radius: MYSTIC.q.radius,
    damage: MYSTIC.q.damage,
    pierce: p.mods.qPierce,
    ttlMs: MYSTIC.q.ttlMs,
    hit: new Set(),
  });
  if (p.mods.qSplit) {
    state.projectiles.push(make(rotate(dir, -0.1)), make(rotate(dir, 0.1)));
  } else {
    state.projectiles.push(make(dir));
  }
}

function placeMine(state: RiftState, at: Vec): void {
  const p = state.player;
  const radius = MYSTIC.w.radius * p.mods.wRadiusMul;
  state.telegraphs.push({
    id: state.nextId++,
    side: "player",
    shape: { kind: "circle", center: clampToArena(at, radius), radius },
    armMs: MYSTIC.w.armMs,
    armTotalMs: MYSTIC.w.armMs,
    damage: MYSTIC.w.damage * p.mods.wDamageMul,
    resolve: "mine",
    liveMs: MYSTIC.w.liveMs,
  });
}

function castW(state: RiftState): void {
  const p = state.player;
  placeMine(state, p.aim);
  if (p.mods.wDouble) {
    const dir = norm(sub(p.aim, p.pos));
    const perp = { x: -dir.y, y: dir.x };
    placeMine(state, { x: p.aim.x + perp.x * 70, y: p.aim.y + perp.y * 70 });
  }
}

function castE(state: RiftState): void {
  const p = state.player;
  const dir = len(sub(p.aim, p.pos)) > 1 ? norm(sub(p.aim, p.pos)) : { x: 1, y: 0 };
  const target = clampToArena(
    { x: p.pos.x + dir.x * MYSTIC.e.distance * p.mods.dashDistMul, y: p.pos.y + dir.y * MYSTIC.e.distance * p.mods.dashDistMul },
    18,
  );
  p.pos = target;
  p.invulnMs = MYSTIC.e.invulnMs;
}

function castR(state: RiftState): void {
  const p = state.player;
  const dir = norm(sub(p.aim, p.pos));
  const to = { x: p.pos.x + dir.x * MYSTIC.r.length, y: p.pos.y + dir.y * MYSTIC.r.length };
  state.telegraphs.push({
    id: state.nextId++,
    side: "player",
    shape: { kind: "line", from: { ...p.pos }, to, width: MYSTIC.r.width * p.mods.rWidthMul },
    armMs: MYSTIC.r.armMs,
    armTotalMs: MYSTIC.r.armMs,
    damage: MYSTIC.r.damage * p.mods.rDamageMul,
    resolve: "beam",
    liveMs: 0,
  });
}

/* --- Enemy attacks --------------------------------------------------------- */

function spokeBurst(state: RiftState, boss: Enemy): void {
  const { count, length, width, damage, telegraphMs } = BOSS.spokes;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const to = { x: boss.pos.x + dir.x * length, y: boss.pos.y + dir.y * length };
    state.telegraphs.push({
      id: state.nextId++,
      side: "enemy",
      shape: { kind: "line", from: { ...boss.pos }, to, width },
      armMs: telegraphMs,
      armTotalMs: telegraphMs,
      damage,
      resolve: "beam",
      liveMs: 0,
    });
  }
}

function rotatingBeams(state: RiftState, boss: Enemy): void {
  const base = norm(sub(state.player.pos, boss.pos));
  for (const offsetDeg of [-25, 25]) {
    const dir = rotate(base, (offsetDeg * Math.PI) / 180);
    const to = { x: boss.pos.x + dir.x * BOSS.beam.length, y: boss.pos.y + dir.y * BOSS.beam.length };
    state.telegraphs.push({
      id: state.nextId++,
      side: "enemy",
      shape: { kind: "line", from: { ...boss.pos }, to, width: BOSS.beam.width },
      armMs: BOSS.beam.telegraphMs,
      armTotalMs: BOSS.beam.telegraphMs,
      damage: BOSS.beam.damage,
      resolve: "beam",
      liveMs: 0,
    });
  }
}

function summonWisps(state: RiftState): void {
  const rng = rngFor(state);
  for (let i = 0; i < BOSS.summon.count; i++) {
    state.enemies.push(spawnEnemy(state, "wisp", edgeSpawn(rng, ENEMY_BASE.wisp.radius)));
  }
}

/* --- Damage ---------------------------------------------------------------- */

function damagePlayer(state: RiftState, amount: number): void {
  const p = state.player;
  if (!p.alive || p.invulnMs > 0) return;
  p.hp -= amount * (1 - p.mods.damageReduction);
  if (p.hp <= 0) {
    if (p.mods.reviveAvailable) {
      p.mods.reviveAvailable = false;
      p.hp = 1;
      p.invulnMs = 1000;
    } else {
      p.hp = 0;
      p.alive = false;
      state.status = "lost";
    }
  }
}

/* --- Step -------------------------------------------------------------- */

const MAX_STEP_MS = 50;

export function step(state: RiftState, intent: Intent, dtMs: number): void {
  if (state.status !== "running") return;
  const dt = Math.min(dtMs, MAX_STEP_MS);
  state.tMs += dt;

  stepPlayer(state, intent, dt);
  stepAbilities(state, intent);
  stepSpawns(state, dt);
  stepProjectiles(state, dt);
  stepTelegraphs(state, dt);
  stepEnemies(state, dt);
  cullDead(state);
  checkWaveClear(state);
}

function stepPlayer(state: RiftState, intent: Intent, dt: number): void {
  const p = state.player;
  if (!p.alive) return;

  p.cooldowns.q = Math.max(0, p.cooldowns.q - dt);
  p.cooldowns.w = Math.max(0, p.cooldowns.w - dt);
  p.cooldowns.e = Math.max(0, p.cooldowns.e - dt);
  p.cooldowns.r = Math.max(0, p.cooldowns.r - dt);
  p.attackTimerMs = Math.max(0, p.attackTimerMs - dt);
  p.invulnMs = Math.max(0, p.invulnMs - dt);
  p.hasteMs = Math.max(0, p.hasteMs - dt);

  const moveLen = len(intent.move);
  const dir = moveLen > 1 ? scale(intent.move, 1 / moveLen) : intent.move;
  const hasteMul = 1 + 0.14 * (p.hasteMs / 2000);
  const moveDist = p.speed * hasteMul * (dt / 1000);
  p.pos = clampToArena({ x: p.pos.x + dir.x * moveDist, y: p.pos.y + dir.y * moveDist }, 18);
  p.aim = intent.aim;

  if (intent.autoattack && p.attackTimerMs <= 0) {
    const range = p.attackRange * p.mods.rangeMul;
    let nearest: Enemy | null = null;
    let nearestD = Infinity;
    for (const e of state.enemies) {
      const d = dist(p.pos, e.pos);
      if (d <= range && d < nearestD) {
        nearest = e;
        nearestD = d;
      }
    }
    if (nearest) {
      nearest.hp -= p.attackDamage;
      if (p.mods.chainAttack) {
        let second: Enemy | null = null;
        let secondD = Infinity;
        for (const e of state.enemies) {
          if (e === nearest) continue;
          const d = dist(nearest.pos, e.pos);
          if (d <= 140 && d < secondD) {
            second = e;
            secondD = d;
          }
        }
        if (second) second.hp -= p.attackDamage * 0.4;
      }
      p.attackTimerMs = p.attackCooldownMs * p.mods.atkSpeedMul;
    }
  }
}

function stepAbilities(state: RiftState, intent: Intent): void {
  const p = state.player;
  if (!p.alive) return;
  let cast = false;

  if (intent.castQ && p.cooldowns.q <= 0) {
    fireQ(state);
    p.cooldowns.q = MYSTIC.q.cooldownMs * p.mods.cooldownMul;
    cast = true;
  }
  if (intent.castW && p.cooldowns.w <= 0) {
    castW(state);
    p.cooldowns.w = MYSTIC.w.cooldownMs * p.mods.cooldownMul;
    cast = true;
  }
  if (intent.castE && p.cooldowns.e <= 0) {
    castE(state);
    p.cooldowns.e = MYSTIC.e.cooldownMs * p.mods.dashCooldownMul * p.mods.cooldownMul;
    cast = true;
  }
  if (intent.castR && p.cooldowns.r <= 0) {
    castR(state);
    p.cooldowns.r = MYSTIC.r.cooldownMs * p.mods.rCooldownMul * p.mods.cooldownMul;
    cast = true;
  }

  if (cast && p.mods.hasteOnCast) p.hasteMs = 2000;
}

function stepSpawns(state: RiftState, dt: number): void {
  if (!state.waveActive || state.bossWave || state.spawnQueue.length === 0) return;
  state.spawnTimerMs -= dt;
  if (state.spawnTimerMs > 0) return;

  const def = waveDef(state.wave);
  const kind = state.spawnQueue.shift();
  if (kind) {
    const rng = rngFor(state);
    state.enemies.push(spawnEnemy(state, kind, edgeSpawn(rng, ENEMY_BASE[kind].radius)));
  }
  state.spawnTimerMs = def?.spawnIntervalMs ?? 700;
}

function stepProjectiles(state: RiftState, dt: number): void {
  const keep: Projectile[] = [];
  for (const proj of state.projectiles) {
    proj.pos = { x: proj.pos.x + (proj.vel.x * dt) / 1000, y: proj.pos.y + (proj.vel.y * dt) / 1000 };
    proj.ttlMs -= dt;

    let dead = proj.ttlMs <= 0;
    if (
      proj.pos.x < -40 || proj.pos.x > ARENA.w + 40 ||
      proj.pos.y < -40 || proj.pos.y > ARENA.h + 40
    ) {
      dead = true;
    }

    if (!dead && proj.side === "player") {
      for (const e of state.enemies) {
        if (e.hp <= 0 || proj.hit.has(e.id)) continue;
        if (dist(proj.pos, e.pos) <= proj.radius + e.radius) {
          e.hp -= proj.damage;
          proj.hit.add(e.id);
          if (!proj.pierce) {
            dead = true;
            break;
          }
        }
      }
    } else if (!dead && proj.side === "enemy") {
      const p = state.player;
      if (p.alive && dist(proj.pos, p.pos) <= proj.radius + 18) {
        damagePlayer(state, proj.damage);
        dead = true;
      }
    }

    if (!dead) keep.push(proj);
  }
  state.projectiles = keep;
}

/**
 * Only the player ever places a mine — there is no enemy equivalent — so this
 * always checks enemies, never the player, and needs no side branch the way
 * `resolveBeam` does.
 */
function stepTelegraphs(state: RiftState, dt: number): void {
  const keep: Telegraph[] = [];
  for (const tg of state.telegraphs) {
    if (tg.armMs > 0) {
      tg.armMs -= dt;
      if (tg.armMs > 0) {
        keep.push(tg);
        continue;
      }
      if (tg.resolve === "beam") {
        resolveBeam(state, tg);
        continue; // consumed on the frame it arms
      }
      // A mine transitions from "arming" to "live" on this frame and falls
      // through to the live-proximity check below.
    }

    if (tg.resolve === "mine" && tg.shape.kind === "circle") {
      tg.liveMs -= dt;
      const { center, radius } = tg.shape;
      const caught = state.enemies.filter((e) => e.hp > 0 && dist(e.pos, center) <= radius);
      if (caught.length > 0) {
        for (const e of caught) e.hp -= tg.damage;
        continue; // detonated and removed
      }
      if (tg.liveMs > 0) keep.push(tg);
      // else: the arm window closed with nothing in range — it fizzles.
    }
  }
  state.telegraphs = keep;
}

function resolveBeam(state: RiftState, tg: Telegraph): void {
  if (tg.shape.kind !== "line") return;
  const { from, to, width } = tg.shape;
  if (tg.side === "player") {
    for (const e of state.enemies) {
      if (pointSegDist(e.pos, from, to) <= width / 2 + e.radius) e.hp -= tg.damage;
    }
  } else {
    const p = state.player;
    if (p.alive && pointSegDist(p.pos, from, to) <= width / 2 + 18) {
      damagePlayer(state, tg.damage);
    }
  }
}

function moveToward(e: Enemy, target: Vec, speed: number, dt: number): void {
  const dir = norm(sub(target, e.pos));
  e.pos = { x: e.pos.x + (dir.x * speed * dt) / 1000, y: e.pos.y + (dir.y * speed * dt) / 1000 };
}

function meleeContact(state: RiftState, e: Enemy, dt: number): void {
  e.attackTimerMs = Math.max(0, e.attackTimerMs - dt);
  const p = state.player;
  if (!p.alive) return;
  const reach = e.radius + 18 + 16;
  if (dist(e.pos, p.pos) <= reach && e.attackTimerMs <= 0) {
    damagePlayer(state, e.contactDamage);
    e.attackTimerMs = e.attackCooldownMs;
  }
}

function stepEnemies(state: RiftState, dt: number): void {
  for (const e of state.enemies) {
    // Killed earlier this step and not culled until the end of it: a corpse
    // takes no turn, or a rusher could land a hit after its own death.
    if (e.hp <= 0) continue;
    if (e.kind === "boss") {
      stepBoss(state, e, dt);
      continue;
    }
    if (e.kind === "caster") {
      stepCaster(state, e, dt);
      continue;
    }
    // rusher, wisp: close distance, hit on contact.
    moveToward(e, state.player.pos, e.speed, dt);
    meleeContact(state, e, dt);
  }
}

function stepCaster(state: RiftState, e: Enemy, dt: number): void {
  const d = dist(e.pos, state.player.pos);
  if (e.windupMs <= 0) {
    if (d > 460) moveToward(e, state.player.pos, e.speed, dt);
    else if (d < 300) moveToward(e, state.player.pos, -e.speed, dt);
  }

  if (e.windupMs > 0) {
    e.windupMs -= dt;
    if (e.windupMs <= 0) {
      const base = ENEMY_BASE.caster;
      const dir = norm(sub(e.aim, e.pos));
      state.projectiles.push({
        id: state.nextId++,
        side: "enemy",
        pos: { ...e.pos },
        vel: scale(dir, base.projectileSpeed),
        radius: base.projectileRadius,
        damage: base.projectileDamage,
        pierce: false,
        ttlMs: 2500,
        hit: new Set(),
      });
      e.attackTimerMs = e.attackCooldownMs;
    }
    return;
  }

  e.attackTimerMs = Math.max(0, e.attackTimerMs - dt);
  if (e.attackTimerMs <= 0) {
    e.windupMs = ENEMY_BASE.caster.windupMs;
    e.aim = { ...state.player.pos };
  }
}

/**
 * `windupMs` carries the phase-3 summon cadence rather than a dedicated
 * field: the boss never telegraphs its own attack the way a caster does, so
 * that field is otherwise idle, and `attackTimerMs` is already the contact
 * cooldown `meleeContact` owns below.
 */
function stepBoss(state: RiftState, boss: Enemy, dt: number): void {
  const frac = boss.hp / boss.maxHp;
  const nextPhase = frac > BOSS.phaseThresholds[0] ? 1 : frac > BOSS.phaseThresholds[1] ? 2 : 3;
  if (nextPhase !== boss.phase) {
    boss.phase = nextPhase;
    boss.phaseTimerMs = 0;
    if (nextPhase === 3) boss.windupMs = BOSS.summon.everyMs;
  }

  boss.phaseTimerMs -= dt;
  if (boss.phaseTimerMs <= 0) {
    if (boss.phase === 1) {
      spokeBurst(state, boss);
      boss.phaseTimerMs = 3000;
    } else {
      rotatingBeams(state, boss);
      boss.phaseTimerMs = boss.phase === 2 ? 2600 : 2400;
    }
  }

  if (boss.phase === 3) {
    boss.windupMs -= dt;
    if (boss.windupMs <= 0) {
      summonWisps(state);
      boss.windupMs = BOSS.summon.everyMs;
    }
  }

  moveToward(boss, state.player.pos, boss.speed, dt);
  meleeContact(state, boss, dt);
}

function cullDead(state: RiftState): void {
  const bossDied = state.enemies.some((e) => e.kind === "boss" && e.hp <= 0);
  state.enemies = state.enemies.filter((e) => e.hp > 0);
  if (bossDied) state.status = "won";
}

function checkWaveClear(state: RiftState): void {
  if (state.status !== "running" || state.bossWave) return;
  if (!state.waveActive) return;
  if (state.spawnQueue.length > 0 || state.enemies.length > 0) return;

  state.waveActive = false;
  const p = state.player;
  p.maxHp += WAVE_CLEAR_REWARD.maxHpGain;
  p.hp = Math.min(p.hp + WAVE_CLEAR_REWARD.heal, p.maxHp);
  p.attackDamage += WAVE_CLEAR_REWARD.damageGain;
  p.level += 1;

  state.wave += 1;
  if (AUGMENT_LEVELS.includes(p.level)) {
    state.pendingPicks += 1;
    return; // startWave() runs once applyAugment() clears the pick queue
  }
  startWave(state);
}
