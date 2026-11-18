/**
 * Soft-ceiling backyard pressure from what the kid actually owns.
 * L1/L2 mixes already tighten the yard; full L3 loadouts push harder.
 * Visit grind alone does not brick Season 1.
 */

/** Matches turret-upgrades BOOST.power — L1 / L2 / L3. */
const POWER_BY_LEVEL = {
  1: 1,
  2: 1.25,
  3: 1.55,
};

/** How hard HP can climb from turret power alone (asymptote headroom). */
const POWER_HP_HEADROOM = 0.7;
/** Steepness — higher so L1/L2 mixes are felt before a full L3 yard. */
const POWER_HP_STEEPNESS = 3.2;
/** Mild extra HP from siege rank (Recruit…Marshal), capped. */
const RANK_HP_STEP = 0.02;
const RANK_HP_CAP = 0.08;
/** Count grows slower than HP so lanes clog without a slideshow. */
const COUNT_FROM_HP = 0.35;

/**
 * @param {unknown} level
 * @returns {1|2|3}
 */
function clampTurretLevel(level) {
  const n = Math.floor(Number(level) || 1);
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return 1;
}

/**
 * Focus power on the stronger half of the roster so a few L2s among stock
 * turrets still raise pressure (unlocking many L1s does not wash them out).
 * @param {string[]} unlockedTurrets
 * @param {Record<string, number>} [turretLevels]
 */
export function rosterPowerIndex(unlockedTurrets, turretLevels = {}) {
  const owned = Array.isArray(unlockedTurrets) ? unlockedTurrets.filter(Boolean) : [];
  if (!owned.length) return 1;
  const factors = owned
    .map((id) => POWER_BY_LEVEL[clampTurretLevel(turretLevels?.[id])])
    .sort((a, b) => b - a);
  const focusCount = owned.length <= 1 ? 1 : Math.max(2, Math.ceil(owned.length / 2));
  const focus = factors.slice(0, Math.min(focusCount, factors.length));
  return focus.reduce((sum, value) => sum + value, 0) / focus.length;
}

/**
 * @param {{
 *   unlockedTurrets?: string[],
 *   turretLevels?: Record<string, number>,
 *   rank?: number,
 *   firstSiege?: boolean,
 * }} [opts]
 * @returns {{ hpMul: number, countMul: number, powerIndex: number }}
 */
export function siegePressure(opts = {}) {
  if (opts.firstSiege) {
    return { hpMul: 1, countMul: 1, powerIndex: 1 };
  }
  const powerIndex = rosterPowerIndex(opts.unlockedTurrets ?? [], opts.turretLevels ?? {});
  const excess = Math.max(0, powerIndex - 1);
  const fromPower = POWER_HP_HEADROOM * (1 - Math.exp(-POWER_HP_STEEPNESS * excess));
  const rank = Math.max(0, Math.floor(Number(opts.rank) || 0));
  const fromRank = Math.min(RANK_HP_CAP, RANK_HP_STEP * rank);
  const hpMul = 1 + fromPower + fromRank;
  const countMul = 1 + COUNT_FROM_HP * (hpMul - 1);
  return { hpMul, countMul, powerIndex };
}
