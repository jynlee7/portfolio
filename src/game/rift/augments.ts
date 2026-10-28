/**
 * rift.exe — augments.
 *
 * Metadata only: an id, a name, a line of flavour, and nothing executable.
 * `sim.ts`'s `applyAugment` is the one place an id turns into an effect, the
 * same way `waves.ts` is data and `sim.ts` is the only thing that reads it —
 * keeping every table in this directory plain data, never a stored closure.
 *
 * Named for the surface the arena is drawn from rather than for anything a
 * MOBA would call them, on purpose: see RIFT.md's IP note.
 */

export type AugmentId =
  | "steepest-descent"
  | "contour"
  | "second-minimum"
  | "basin"
  | "curvature"
  | "gradient-step"
  | "tempered"
  | "overclock"
  | "long-reach"
  | "momentum"
  | "field-charge"
  | "dense-lattice"
  | "resonance"
  | "equilibrium";

export type AugmentDef = { id: AugmentId; name: string; desc: string };

export const AUGMENTS: readonly AugmentDef[] = [
  { id: "steepest-descent", name: "Steepest Descent", desc: "Move speed surges after casting an ability, then decays." },
  { id: "contour", name: "Contour", desc: "Mystic Bolt pierces every enemy in its path." },
  { id: "second-minimum", name: "Second Minimum", desc: "The next fatal hit leaves you at 1 HP instead. Once per run." },
  { id: "basin", name: "Basin", desc: "Barrier Mine's radius and damage both increase." },
  { id: "curvature", name: "Curvature", desc: "Basin Collapse is wider and hits harder, at a longer cooldown." },
  { id: "gradient-step", name: "Gradient Step", desc: "Auto-attacks fire noticeably faster." },
  { id: "tempered", name: "Tempered", desc: "Maximum HP increases, and you heal now." },
  { id: "overclock", name: "Overclock", desc: "Every ability cooldown is shorter." },
  { id: "long-reach", name: "Long Reach", desc: "Auto-attack range increases." },
  { id: "momentum", name: "Momentum", desc: "Flicker travels further and recharges sooner." },
  { id: "field-charge", name: "Field Charge", desc: "Auto-attacks arc a spark to a second nearby enemy." },
  { id: "dense-lattice", name: "Dense Lattice", desc: "Contact damage from enemies is reduced." },
  { id: "resonance", name: "Resonance", desc: "Mystic Bolt splits into two parallel bolts." },
  { id: "equilibrium", name: "Equilibrium", desc: "Barrier Mine places a second mine, offset from the first." },
];

/** mulberry32 — a tiny deterministic PRNG. Given the same seed, a run's
 *  augment offers (and enemy spawn edges) replay identically, which is what
 *  keeps validate() able to check a full simulated run from Node. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Three offers, never a repeat of something already owned or already on
 *  offer this pick. */
export function rollOffers(owned: readonly string[], rng: () => number): AugmentDef[] {
  const pool = AUGMENTS.filter((a) => !owned.includes(a.id));
  const offers: AugmentDef[] = [];
  const taken = new Set<number>();
  const n = Math.min(3, pool.length);
  while (offers.length < n) {
    const i = Math.floor(rng() * pool.length);
    if (taken.has(i)) continue;
    taken.add(i);
    offers.push(pool[i]);
  }
  return offers;
}
