/**
 * One place for the first-siege generosity and later battle economy.
 * Returns fresh mission data; the shared level definitions are not mutated.
 *
 * @param {import('./missions-data.js?v=20261114k1').Mission} mission
 * @param {number} siegesCompleted
 */
export function balanceMission(mission, siegesCompleted) {
  const firstSiege = siegesCompleted === 0;
  return {
    ...mission,
    killBudgetXp: 2,
    bossKillBudgetXp: 6,
    waveClearBudgetXp: 15,
    leakCoinPenalty: firstSiege ? 5 : (mission.leakCoinPenalty ?? 10),
    maxLeaks: firstSiege ? 7 : (mission.maxLeaks ?? 5),
  };
}

/**
 * The first siege includes enough coins to build a proper defence.
 * Accuracy coins are additive, even when the new-player minimum applies.
 *
 * @param {import('./missions-data.js?v=20261114k1').Mission} mission
 * @param {number} siegesCompleted
 * @param {number} mathsBonusCoins
 */
export function startingSiegeCoins(mission, siegesCompleted, mathsBonusCoins = 0) {
  const normal = Math.max(0, mission.rewards?.placementBudget ?? 90);
  const base = siegesCompleted === 0 ? Math.max(125, normal) : normal;
  return base + Math.max(0, mathsBonusCoins);
}

export const BATTLE_CRIES = Object.freeze([
  'BRING IT ON!',
  'GET OFF MY LAWN!',
  'COME AT ME, ALIENS!',
  'GRANNY MEANS BUSINESS!',
  'LET’S MAKE SPACE DUST!',
  'NOT TODAY, SPACE POTATOES!',
  'I’VE GOT BISCUITS AND BLASTERS!',
  'YOU CALL THAT AN INVASION?',
  'PREPARE TO BE MULCHED!',
  'SEND IN THE SPACE NOODLES!',
  'GRANNY’S NOT IMPRESSED!',
  'TIME FOR SOME LAWN JUSTICE!',
]);

/**
 * Choose a different line every siege when possible.
 * @param {number} [random]
 * @param {string} [previous]
 */
export function nextBattleCry(random = Math.random(), previous = '') {
  const alternatives = BATTLE_CRIES.filter((cry) => cry !== previous);
  const fraction = Math.max(0, Math.min(0.999999, Number.isFinite(random) ? random : 0));
  return alternatives[Math.floor(fraction * alternatives.length)];
}
