/**
 * rift.exe — data checks.
 *
 * Mirrors `neighborhood.ts`'s `validate()`: plain sentences about problems in
 * the static tables, checkable from Node without a browser.
 *
 *     node --experimental-strip-types \
 *       -e 'import("./src/game/rift/validate.ts").then(m => console.log(m.validate()))'
 */

import { AUGMENTS } from "./augments.ts";
import { ENEMY_BASE } from "./units.ts";
import { AUGMENT_LEVELS, WAVES } from "./waves.ts";

export function validate(): string[] {
  const problems: string[] = [];

  const waveNumbers = new Set<number>();
  for (const def of WAVES) {
    if (waveNumbers.has(def.wave)) problems.push(`duplicate wave number ${def.wave}`);
    waveNumbers.add(def.wave);

    if (def.boss && def.spawns.length > 0) {
      problems.push(`wave ${def.wave} is marked boss but also lists regular spawns`);
    }
    if (!def.boss && def.spawns.length === 0) {
      problems.push(`wave ${def.wave} is not a boss wave but spawns nothing`);
    }
    for (const spawn of def.spawns) {
      if (!(spawn.kind in ENEMY_BASE)) {
        problems.push(`wave ${def.wave} spawns unknown enemy kind "${spawn.kind}"`);
      }
      if (spawn.count <= 0) {
        problems.push(`wave ${def.wave} lists "${spawn.kind}" with a non-positive count`);
      }
    }
  }
  for (let w = 1; w <= WAVES.length; w++) {
    if (!waveNumbers.has(w)) problems.push(`wave ${w} is missing — WAVES must be a dense 1..N run`);
  }
  const bossWaves = WAVES.filter((w) => w.boss);
  if (bossWaves.length !== 1) {
    problems.push(`expected exactly one boss wave, found ${bossWaves.length}`);
  } else if (bossWaves[0].wave !== WAVES.length) {
    problems.push("the boss wave is not the last wave — a run would end mid-list");
  }

  const ids = new Set<string>();
  for (const a of AUGMENTS) {
    if (ids.has(a.id)) problems.push(`duplicate augment id ${a.id}`);
    ids.add(a.id);
    if (!a.name.trim()) problems.push(`augment ${a.id} has no name`);
    if (!a.desc.trim()) problems.push(`augment ${a.id} has no description`);
  }
  if (AUGMENTS.length < 3) {
    problems.push("fewer than 3 augments exist — a pick needs 3 distinct offers");
  }

  for (const level of AUGMENT_LEVELS) {
    if (level < 2) problems.push(`augment level ${level} is below the first wave-clear level`);
  }
  if (AUGMENT_LEVELS.length !== new Set(AUGMENT_LEVELS).size) {
    problems.push("AUGMENT_LEVELS has a duplicate entry");
  }

  for (const [kind, base] of Object.entries(ENEMY_BASE)) {
    if (base.maxHp <= 0) problems.push(`${kind} has non-positive maxHp`);
    if (base.speed < 0) problems.push(`${kind} has negative speed`);
  }

  return problems;
}
