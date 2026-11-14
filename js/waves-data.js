/** Real-time siege length (seconds). Game-speed buttons do not affect this clock. */
export const SIEGE_DURATION_SEC = 90;

/** Maximum optional bonus assault after the original 60-second defence. */
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
 * The horde grows with the player's siege rank, never with sieges merely played, so it only gets
 * bigger once a player has shown they can win. Each rank above Recruit makes every wave bigger and
 * sends one tougher squad along with the opening assault.
 */
const RANK_COUNT_STEP = 0.08;
/** @type {WaveSquad[]} Opening-assault reinforcements for Patrol, Defender, Veteran and Marshal. */
const RANK_REINFORCEMENTS = [
  { unit: 'monster2', count: 4 },
  { unit: 'monster3', count: 4 },
  { unit: 'monster4', count: 3 },
  { unit: 'monster5', count: 3 },
];

/** Extra right answers zap Scout Skiffs out of the opening assault, up to this share of it. */
export const ZAP_CAP_SHARE = 0.2;

/** @param {number} rank Siege rank level, 0 (none) to 5 (Marshal). */
function rankCountMul(rank) {
  return 1 + RANK_COUNT_STEP * Math.max(0, rank - 1);
}

/** @param {number} rank */
function rankReinforcements(rank) {
  return RANK_REINFORCEMENTS.slice(0, Math.max(0, rank - 1));
}

/**
 * @param {WaveSquad[]} squads
 * @param {number} countMul
 * @param {{ spawnGranddaddy?: boolean }} opts
 * @param {BossKind[]} [command]
 * @returns {SpawnSlot[]}
 */
function buildSpawnQueue(squads, countMul, opts, command) {
  /** @type {SpawnSlot[]} */
  const queue = [];

  for (const squad of squads) {
    const count = Math.max(1, Math.round(squad.count * countMul));
    for (let i = 0; i < count; i++) {
      queue.push({ unit: squad.unit });
    }
  }

  if (command) {
    for (const boss of command) {
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
 * @param {{ spawnGranddaddy?: boolean, firstSiege?: boolean, rank?: number, zapped?: number }} [opts]
 *   rank: siege rank level; zapped: Scout Skiffs already zapped out of the opening assault.
 * @returns {WaveDef}
 */
export function waveConfigFor(waveNum, opts = {}) {
  const tier = Math.max(0, waveNum - 1);
  const blueprintIdx = Math.min(tier, WAVE_BLUEPRINTS.length - 1);
  const extraTier = Math.max(0, tier - WAVE_BLUEPRINTS.length + 1);
  const bp = WAVE_BLUEPRINTS[blueprintIdx];
  const rank = opts.firstSiege ? 0 : Math.max(0, opts.rank ?? 0);
  const squads = waveNum === 1 ? [...bp.squads, ...rankReinforcements(rank)] : bp.squads;

  const spawnQueue = buildSpawnQueue(squads, (1 + extraTier * 0.2) * rankCountMul(rank), {
    spawnGranddaddy: Boolean(opts.spawnGranddaddy && waveNum >= 5),
  }, bp.command);

  const firstWaveTutorial = Boolean(opts.firstSiege && waveNum === 1);
  const fullQueue = firstWaveTutorial ? spawnQueue.slice(0, 20) : spawnQueue;
  const openingQueue = waveNum === 1 ? zapScouts(fullQueue, opts.zapped ?? 0) : fullQueue;
  const hpScale = firstWaveTutorial ? 0.88 : 1 + tier * 0.13 + extraTier * 0.1;

  return {
    codename: extraTier > 0 ? `${bp.codename} +${extraTier}` : bp.codename,
    spawnQueue: openingQueue,
    totalSpawns: openingQueue.length,
    hpScale,
    hpRamp: bp.hpRamp ?? 0.02,
    spawnIntervalSec: Math.max(0.32, bp.spawnIntervalSec - extraTier * 0.035),
    clumpAt: bp.clumpAt + extraTier * 3,
    burstSize: bp.burstSize + Math.min(extraTier, 2),
    burstGap: Math.max(1.0, bp.burstGap - extraTier * 0.08),
    speedMul: firstWaveTutorial ? 0.88 : bp.speedMul + extraTier * 0.04,
  };
}

/** @param {SpawnSlot[]} queue @param {number} zapped */
function zapScouts(queue, zapped) {
  const cap = Math.floor(queue.length * ZAP_CAP_SHARE);
  let left = Math.max(0, Math.min(cap, Math.floor(zapped)));
  return queue.filter((slot) => {
    if (left > 0 && slot.unit === 'monster1') {
      left -= 1;
      return false;
    }
    return true;
  });
}

/**
 * What the opening assault will send, for the pre-battle intel: troops by type, the bosses, and how
 * many Scout Skiffs extra maths has zapped (and could still zap). Built from the same wave config the
 * siege uses, so the preview always matches the battle.
 * @param {{ firstSiege?: boolean, rank?: number, extraRight?: number }} opts
 */
export function openingHorde(opts = {}) {
  const full = waveConfigFor(1, { firstSiege: opts.firstSiege, rank: opts.rank });
  const zapCap = Math.floor(full.spawnQueue.length * ZAP_CAP_SHARE);
  const zapped = Math.min(zapCap, Math.max(0, Math.floor(opts.extraRight ?? 0)));
  const wave = waveConfigFor(1, { firstSiege: opts.firstSiege, rank: opts.rank, zapped });
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const slot of wave.spawnQueue) counts.set(slot.unit, (counts.get(slot.unit) ?? 0) + 1);
  return {
    troops: [...counts.entries()].map(([unit, count]) => ({ unit, count })),
    total: wave.spawnQueue.length,
    zapped,
    zapCap,
  };
}

/** @deprecated use waveConfigFor */
export const DEFAULT_WAVES = [waveConfigFor(1), waveConfigFor(2), waveConfigFor(3)];
