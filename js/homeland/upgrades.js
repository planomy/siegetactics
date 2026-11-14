/** Level-up upgrades: after each level-up the player picks one of three. */

/**
 * @typedef {'spread'|'rapid'|'power'|'rockets'|'orbit'|'side'|'shockwave'|'tuneup'} UpgradeId
 * @type {Record<UpgradeId, { name: string, icon: string, max: number, describe: (nextLevel: number) => string }>}
 */
export const UPGRADES = {
  spread: { name: 'Spread Shot', icon: '✦', max: 3, describe: (n) => `Fire ${1 + n * 2} shots in a fan` },
  rapid: { name: 'Rapid Fire', icon: '⚡', max: 5, describe: () => 'Shoot 25% faster' },
  power: { name: 'Power Shots', icon: '💪', max: 4, describe: (n) => `Every shot does ${1 + n} damage` },
  rockets: { name: 'Cupcake Missiles', icon: '🚀', max: 4, describe: (n) => `${n} homing cupcake missile${n > 1 ? 's' : ''} every 2 seconds` },
  orbit: { name: 'Cupcake Shield', icon: '🧁', max: 4, describe: (n) => `${n} cupcake${n > 1 ? 's' : ''} spinning round Granny` },
  side: { name: 'Side Blasters', icon: '↔', max: 3, describe: (n) => `Blast sideways at ${n} alien${n > 1 ? 's' : ''} at a time` },
  shockwave: { name: 'Shockwave', icon: '💥', max: 4, describe: (n) => `A blast ring every ${Math.max(2, 4.5 - n * 0.5)} seconds` },
  tuneup: { name: 'Scooter Tune-up', icon: '🔧', max: 99, describe: () => 'Faster scooter, more health, and a repair' },
};

/** @typedef {Record<UpgradeId, number>} UpgradeLevels */

/** @returns {UpgradeLevels} */
export function noUpgrades() {
  return { spread: 0, rapid: 0, power: 0, rockets: 0, orbit: 0, side: 0, shockwave: 0, tuneup: 0 };
}

/**
 * Three different upgrades the player hasn't maxed out.
 * @param {UpgradeLevels} levels @param {() => number} [rand]
 * @returns {UpgradeId[]}
 */
export function rollChoices(levels, rand = Math.random) {
  const open = /** @type {UpgradeId[]} */ (Object.keys(UPGRADES)).filter((id) => levels[id] < UPGRADES[id].max);
  const picks = [];
  while (picks.length < 3 && open.length) picks.push(open.splice(Math.floor(rand() * open.length), 1)[0]);
  return picks;
}

/** Crystals needed to reach the next level. @param {number} level */
export function crystalsForLevel(level) {
  return 5 + level * 4;
}
