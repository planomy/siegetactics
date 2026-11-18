/**
 * Rare alien crystals for turret upgrades.
 * Each 10-set maths round draws from a fixed bag: ten ×3, five ×5, two ×10.
 * Leftover bag slots are discarded when the round rolls over.
 */

/** @typedef {{ value: 3|5|10, id: string, label: string, title: string }} RareCrystalTier */
/** @typedef {{ bag: number[], draws: number }} RareCrystalRound */
/** @typedef {{ value: number, tierId: string }} CrystalChip */

/** @type {readonly RareCrystalTier[]} */
export const RARE_CRYSTAL_TIERS = Object.freeze([
  { value: 3, id: 'spark', label: 'Spark', title: '×3 SPARK CRYSTAL!' },
  { value: 5, id: 'pulse', label: 'Pulse', title: '×5 PULSE CRYSTAL!' },
  { value: 10, id: 'nova', label: 'Nova', title: '×10 NOVA CRYSTAL!' },
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

/** @param {any} raw */
function chipValue(raw) {
  const value = Math.max(1, Math.floor(Number(raw?.value) || 0));
  const tierId = typeof raw?.tierId === 'string' && raw.tierId ? raw.tierId : value === 3 ? 'spark' : value === 5 ? 'pulse' : value === 10 ? 'nova' : 'basic';
  return { value, tierId };
}

/**
 * Unspent crystals in the vault glass. Sum of values must match upgradeCores.
 * Older saves with only a core count become that many ×1 chips.
 * @param {any} raw
 * @param {number} upgradeCores
 * @returns {CrystalChip[]}
 */
export function normalizeCrystalChips(raw, upgradeCores) {
  const target = Math.max(0, Math.floor(Number(upgradeCores) || 0));
  const chips = Array.isArray(raw) ? raw.map(chipValue).filter((c) => c.value > 0) : [];
  let sum = chips.reduce((n, c) => n + c.value, 0);
  if (sum === target) return chips;
  if (sum < target) {
    const out = chips.slice();
    for (let i = sum; i < target; i++) out.push({ value: 1, tierId: 'basic' });
    return out;
  }
  // Too many chip points (edited save / mismatch): keep rares, fill remainder with basics.
  const rares = chips.filter((c) => c.value > 1);
  let rareSum = rares.reduce((n, c) => n + c.value, 0);
  while (rareSum > target && rares.length) {
    const dropped = rares.pop();
    rareSum -= dropped?.value ?? 0;
  }
  const out = rares.slice();
  for (let i = rareSum; i < target; i++) out.push({ value: 1, tierId: 'basic' });
  return out;
}

/** @param {CrystalChip[]} chips @param {number} value @param {string} [tierId] */
export function addCrystalChip(chips, value, tierId) {
  const amount = Math.max(1, Math.floor(Number(value) || 1));
  const id = tierId || (amount === 3 ? 'spark' : amount === 5 ? 'pulse' : amount === 10 ? 'nova' : 'basic');
  return chips.concat({ value: amount, tierId: id });
}

/**
 * Spend cores by removing chips (small/basic first so rares stay visible longer).
 * @param {CrystalChip[]} chips
 * @param {number} cost
 */
export function spendCrystalChips(chips, cost) {
  let need = Math.max(0, Math.floor(Number(cost) || 0));
  if (need <= 0) return chips.slice();
  const sorted = chips
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.value - b.c.value || a.i - b.i);
  const kill = new Set();
  for (const { c, i } of sorted) {
    if (need <= 0) break;
    kill.add(i);
    need -= c.value;
  }
  /** @type {CrystalChip[]} */
  const kept = chips.filter((_, i) => !kill.has(i));
  // Overspend (removed a ×10 for a 6-cost): refund the spare as basics.
  while (need < 0) {
    kept.push({ value: 1, tierId: 'basic' });
    need += 1;
  }
  return kept;
}
