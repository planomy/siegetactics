import { ENEMY_SPRITE_SRC } from './enemies-data.js';

const ENEMY_KEYS = Object.keys(ENEMY_SPRITE_SRC);

/**
 * A persistent, per-artwork tally for enemies defeated in sieges.
 * Older saves did not keep per-kind histories, so they naturally begin at 0.
 *
 * @param {unknown} raw
 * @returns {Record<string, number>}
 */
export function normalizeEnemyDefeats(raw) {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return Object.fromEntries(ENEMY_KEYS.map((key) => {
    const value = Number(input[key]);
    return [key, Number.isSafeInteger(value) && value >= 0 ? value : 0];
  }));
}

/**
 * @param {Record<string,number>} counts
 * @param {string} key Exact sprite key from the destroyed enemy.
 * @returns {Record<string,number>}
 */
export function recordEnemyDefeat(counts, key) {
  if (!Object.hasOwn(ENEMY_SPRITE_SRC, key)) return counts;
  const current = Number.isSafeInteger(counts?.[key]) && counts[key] >= 0 ? counts[key] : 0;
  return { ...counts, [key]: Math.min(Number.MAX_SAFE_INTEGER, current + 1) };
}

/** @param {Record<string,number>} counts @param {string} key */
export function enemyDefeatCount(counts, key) {
  return Math.max(0, Number(counts?.[key]) || 0);
}
