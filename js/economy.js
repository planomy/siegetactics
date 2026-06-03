/** Player-facing currency names and bank rules. */
export const ECONOMY = {
  forgeXpLabel: 'Forge XP',
  siegeCoinsLabel: 'Siege coins',
  /** Unspent siege coins → Forge XP at end of run (1 XP per N coins). */
  bankCoinDivisor: 5,
  bankMaxBonus: 25,
};

/** @param {number} unspentCoins */
export function bankBonusForgeXp(unspentCoins) {
  if (unspentCoins <= 0) return 0;
  return Math.min(
    ECONOMY.bankMaxBonus,
    Math.floor(unspentCoins / ECONOMY.bankCoinDivisor)
  );
}
