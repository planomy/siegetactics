/** Real-time siege length (seconds). Game-speed buttons do not affect this clock. */
export const SIEGE_DURATION_SEC = 60;

/** Future reward: bonus seconds added to the siege timer. */
export const BONUS_TIME_SEC = 30;

/** Wave incoming bar length (seconds) — field stays visible; place turrets while it fills. */
export const ANNOUNCE_SPLASH_SEC = 2;

/**
 * @typedef {import('./enemies-data.js').GruntSpriteKey} GruntSpriteKey
 * @typedef {'mothership'|'granddaddy'} BossKind
 */

/**
 * @typedef {Object} WaveSquad
 * @property {GruntSpriteKey} unit
 * @property {number} count
 */

/**
 * @typedef {Object} SpawnSlot
 * @property {GruntSpriteKey|BossKind} unit
 * @property {boolean} [isBoss]
 */

/**
 * @typedef {Object} WaveBlueprint
 * @property {string} codename
 * @property {WaveSquad[]} squads
 * @property {BossKind[]} [command]
 * @property {number} spawnIntervalSec
 * @property {number} clumpAt
 * @property {number} burstSize
 * @property {number} burstGap
 * @property {number} speedMul
 * @property {number} [hpRamp]
 */

/**
 * @typedef {Object} WaveDef
 * @property {string} codename
 * @property {SpawnSlot[]} spawnQueue
 * @property {number} totalSpawns
 * @property {number} hpScale
 * @property {number} hpRamp
 * @property {number} spawnIntervalSec
 * @property {number} clumpAt
 * @property {number} burstSize
 * @property {number} burstGap
 * @property {number} speedMul
 */

/** General's battle plan — each wave sends specific troop types before the full assault. */
const WAVE_BLUEPRINTS = /** @type {WaveBlueprint[]} */ ([
  {
    codename: 'Probe Swarm',
    squads: [{ unit: 'monster1', count: 30 }],
    spawnIntervalSec: 0.46,
    clumpAt: 18,
    burstSize: 6,
    burstGap: 1.5,
    speedMul: 1.06,
    hpRamp: 0.018,
  },
  {
    codename: 'Skirmish Line',
    squads: [
      { unit: 'monster1', count: 10 },
      { unit: 'monster2', count: 14 },
      { unit: 'monster3', count: 8 },
    ],
    command: ['mothership'],
    spawnIntervalSec: 0.52,
    clumpAt: 22,
    burstSize: 5,
    burstGap: 1.65,
    speedMul: 1.02,
    hpRamp: 0.022,
  },
  {
    codename: 'Twin Pincer',
    squads: [
      { unit: 'monster2', count: 12 },
      { unit: 'monster3', count: 14 },
      { unit: 'monster1', count: 8 },
    ],
    command: ['mothership'],
    spawnIntervalSec: 0.5,
    clumpAt: 24,
    burstSize: 5,
    burstGap: 1.55,
    speedMul: 1.04,
    hpRamp: 0.024,
  },
  {
    codename: 'Heavy Push',
    squads: [
      { unit: 'monster3', count: 10 },
      { unit: 'monster4', count: 12 },
      { unit: 'monster2', count: 8 },
    ],
    command: ['mothership'],
    spawnIntervalSec: 0.48,
    clumpAt: 22,
    burstSize: 4,
    burstGap: 1.45,
    speedMul: 1.06,
    hpRamp: 0.026,
  },
  {
    codename: 'Combined Arms',
    squads: [
      { unit: 'monster1', count: 10 },
      { unit: 'monster3', count: 10 },
      { unit: 'monster4', count: 10 },
      { unit: 'monster5', count: 8 },
    ],
    command: ['mothership'],
    spawnIntervalSec: 0.44,
    clumpAt: 26,
    burstSize: 5,
    burstGap: 1.35,
    speedMul: 1.08,
    hpRamp: 0.028,
  },
  {
    codename: 'Full Assault',
    squads: [
      { unit: 'monster1', count: 8 },
      { unit: 'monster2', count: 10 },
      { unit: 'monster3', count: 10 },
      { unit: 'monster4', count: 10 },
      { unit: 'monster5', count: 10 },
    ],
    command: ['mothership', 'mothership'],
    spawnIntervalSec: 0.4,
    clumpAt: 28,
    burstSize: 6,
    burstGap: 1.2,
    speedMul: 1.1,
    hpRamp: 0.03,
  },
]);

/**
 * @param {WaveBlueprint} bp
 * @param {number} extraTier
 * @param {{ spawnGranddaddy?: boolean }} opts
 * @returns {SpawnSlot[]}
 */
function buildSpawnQueue(bp, extraTier, opts) {
  const countMul = 1 + extraTier * 0.2;
  /** @type {SpawnSlot[]} */
  const queue = [];

  for (const squad of bp.squads) {
    const count = Math.max(1, Math.round(squad.count * countMul));
    for (let i = 0; i < count; i++) {
      queue.push({ unit: squad.unit });
    }
  }

  if (bp.command) {
    for (const boss of bp.command) {
      queue.push({ unit: boss, isBoss: true });
    }
  }

  if (opts.spawnGranddaddy) {
    queue.push({ unit: 'granddaddy', isBoss: true });
  }

  return queue;
}

/**
 * Escalating wave config for timed sieges (wave 1, 2, 3… until the clock runs out).
 * @param {number} waveNum 1-based wave index
 * @param {{ spawnGranddaddy?: boolean }} [opts]
 * @returns {WaveDef}
 */
export function waveConfigFor(waveNum, opts = {}) {
  const tier = Math.max(0, waveNum - 1);
  const blueprintIdx = Math.min(tier, WAVE_BLUEPRINTS.length - 1);
  const extraTier = Math.max(0, tier - WAVE_BLUEPRINTS.length + 1);
  const bp = WAVE_BLUEPRINTS[blueprintIdx];

  const spawnQueue = buildSpawnQueue(bp, extraTier, {
    spawnGranddaddy: Boolean(opts.spawnGranddaddy && waveNum >= 5),
  });

  const hpScale = 1 + tier * 0.13 + extraTier * 0.1;

  return {
    codename: extraTier > 0 ? `${bp.codename} +${extraTier}` : bp.codename,
    spawnQueue,
    totalSpawns: spawnQueue.length,
    hpScale,
    hpRamp: bp.hpRamp ?? 0.02,
    spawnIntervalSec: Math.max(0.32, bp.spawnIntervalSec - extraTier * 0.035),
    clumpAt: bp.clumpAt + extraTier * 3,
    burstSize: bp.burstSize + Math.min(extraTier, 2),
    burstGap: Math.max(1.0, bp.burstGap - extraTier * 0.08),
    speedMul: bp.speedMul + extraTier * 0.04,
  };
}

/** @deprecated use waveConfigFor */
export const DEFAULT_WAVES = [waveConfigFor(1), waveConfigFor(2), waveConfigFor(3)];
