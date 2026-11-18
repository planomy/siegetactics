/**
 * Rare alien crystals for turret upgrades.
 * Each 10-set maths round draws from a fixed bag: ten ×3, five ×5, two ×10.
 * Leftover bag slots are discarded when the round rolls over.
 */

/** @typedef {{ value: 3|5|10, id: string, label: string, title: string }} RareCrystalTier */
/** @typedef {{ bag: number[], draws: number }} RareCrystalRound */

/** @type {readonly RareCrystalTier[]} */
export const RARE_CRYSTAL_TIERS = Object.freeze([
  { value: 3, id: 'spark', label: 'Spark', title: 'SPARK CRYSTAL!' },
  { value: 5, id: 'pulse', label: 'Pulse', title: 'PULSE CRYSTAL!' },
  { value: 10, id: 'nova', label: 'Nova', title: 'NOVA CRYSTAL!' },
]);

/** How many of each value start in a fresh 10-set bag. */
export const RARE_CRYSTAL_BAG_STOCK = Object.freeze({ 3: 10, 5: 5, 10: 2 });

/** Draws allowed before the bag resets (one rare per passed set). */
export const RARE_CRYSTAL_DRAWS_PER_ROUND = 10;

/** @param {number} value */
export function rareCrystalTier(value) {
  return RARE_CRYSTAL_TIERS.find((t) => t.value === value) ?? null;
}

/** Build the full stock list for a new round. */
export function buildRareCrystalBag() {
  /** @type {number[]} */
  const bag = [];
  for (const [value, count] of Object.entries(RARE_CRYSTAL_BAG_STOCK)) {
    const v = Number(value);
    for (let i = 0; i < count; i++) bag.push(v);
  }
  return bag;
}

/** @param {number[]} bag @param {() => number} [rand] */
export function shuffleRareBag(bag, rand = Math.random) {
  const out = bag.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** @param {any} raw @returns {RareCrystalRound} */
export function normalizeRareCrystalRound(raw) {
  if (!raw || typeof raw !== 'object') {
    return { bag: shuffleRareBag(buildRareCrystalBag()), draws: 0 };
  }
  const bag = Array.isArray(raw.bag)
    ? raw.bag.map((n) => Math.floor(Number(n))).filter((n) => n === 3 || n === 5 || n === 10)
    : shuffleRareBag(buildRareCrystalBag());
  const draws = Math.max(0, Math.floor(Number(raw.draws) || 0));
  if (!bag.length || draws >= RARE_CRYSTAL_DRAWS_PER_ROUND) {
    return { bag: shuffleRareBag(buildRareCrystalBag()), draws: 0 };
  }
  return { bag, draws };
}

/**
 * Pull one rare from the round bag (without replacement).
 * @param {RareCrystalRound} round
 * @param {() => number} [rand]
 * @returns {{ value: 3|5|10, tier: RareCrystalTier, round: RareCrystalRound }}
 */
export function drawRareCrystal(round, rand = Math.random) {
  let state = normalizeRareCrystalRound(round);
  if (!state.bag.length || state.draws >= RARE_CRYSTAL_DRAWS_PER_ROUND) {
    state = { bag: shuffleRareBag(buildRareCrystalBag(), rand), draws: 0 };
  }
  const index = Math.floor(rand() * state.bag.length);
  const value = /** @type {3|5|10} */ (state.bag[index]);
  const bag = state.bag.slice(0, index).concat(state.bag.slice(index + 1));
  const tier = /** @type {RareCrystalTier} */ (rareCrystalTier(value));
  return {
    value,
    tier,
    round: { bag, draws: state.draws + 1 },
  };
}
