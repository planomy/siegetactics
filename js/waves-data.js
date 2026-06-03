/** Real-time siege length (seconds). Game-speed buttons do not affect this clock. */
export const SIEGE_DURATION_SEC = 60;

/** Future reward: bonus seconds added to the siege timer. */
export const BONUS_TIME_SEC = 30;

/** Wave announce splash length (timer paused). */
export const ANNOUNCE_SPLASH_SEC = 1.4;

/**
 * @typedef {Object} WaveDef
 * @property {number} totalSpawns
 * @property {number} baseHp
 * @property {number} hpRamp
 * @property {number} [toughHp]
 * @property {number} [toughEvery]
 * @property {number} spawnIntervalSec
 * @property {number} clumpAt
 * @property {number} burstSize
 * @property {number} burstGap
 * @property {number} speedMul
 * @property {number} [mothershipAt]
 * @property {number} [granddaddyAt]
 */

/**
 * Escalating wave config for timed sieges (wave 1, 2, 3… until the clock runs out).
 * @param {number} waveNum 1-based wave index
 * @param {{ spawnGranddaddy?: boolean }} [opts]
 * @returns {WaveDef}
 */
export function waveConfigFor(waveNum, opts = {}) {
  const tier = Math.max(0, waveNum - 1);

  /** @type {WaveDef} */
  const cfg = {
    totalSpawns: 10 + tier * 5,
    baseHp: 20 + tier * 9,
    hpRamp: 0.03 + tier * 0.01,
    spawnIntervalSec: Math.max(0.5, 1.15 - tier * 0.1),
    clumpAt: 7 + tier * 2,
    burstSize: 3 + Math.min(tier, 4),
    burstGap: Math.max(1.1, 2.4 - tier * 0.22),
    speedMul: 1 + tier * 0.09,
    mothershipAt: -1,
    granddaddyAt: -1,
  };

  if (tier >= 1) {
    cfg.toughHp = 42 + tier * 14;
    cfg.toughEvery = Math.max(3, 5 - Math.floor(tier / 2));
  }

  if (waveNum >= 2 && waveNum % 2 === 0) {
    cfg.mothershipAt = Math.min(8, 3 + Math.floor(waveNum / 2));
  }

  if (opts.spawnGranddaddy) {
    cfg.granddaddyAt = Math.min(10, 4 + Math.floor(tier / 2));
  }

  return cfg;
}

/** @deprecated use waveConfigFor */
export const DEFAULT_WAVES = [waveConfigFor(1), waveConfigFor(2), waveConfigFor(3)];
