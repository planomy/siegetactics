/** Alien types and the timeline of a Homeland run. */

/**
 * @typedef {{ hp: number, speed: number, size: number, damage: number, gems: number, sprite: string, glow?: string }} EnemyType
 * @type {Record<'swarmer'|'grunt'|'leaper'|'spitter'|'splitter'|'tank', EnemyType>}
 */
export const ENEMY_TYPES = {
  swarmer: { hp: 1, speed: 2.4, size: 0.3, damage: 6, gems: 1, sprite: 'monster1' },
  grunt: { hp: 3, speed: 1.5, size: 0.42, damage: 10, gems: 1, sprite: 'monster2' },
  leaper: { hp: 3, speed: 1.3, size: 0.42, damage: 12, gems: 2, sprite: 'monster4', glow: '#ffd23a' },
  spitter: { hp: 4, speed: 1.1, size: 0.44, damage: 8, gems: 2, sprite: 'monster5', glow: '#7bff3a' },
  splitter: { hp: 5, speed: 1.2, size: 0.5, damage: 12, gems: 2, sprite: 'monster3', glow: '#c86bff' },
  tank: { hp: 18, speed: 0.75, size: 0.9, damage: 22, gems: 6, sprite: 'granddaddy' },
};

/** Run length, in seconds, before the mothership rises over the horizon. */
export const BOSS_TIME = 165;
export const BOSS_HP = 450;
/** Seconds into the run when a horde pours over the horizon. */
export const HORDE_TIMES = [40, 85, 130];
export const MAX_ALIENS = 220;

/** Seconds between single alien spawns, getting busier as the run goes on. @param {number} t */
export function spawnInterval(t) {
  return Math.max(0.2, 1.05 - t * 0.0055);
}

/** @param {number} t @param {() => number} rand @returns {keyof typeof ENEMY_TYPES} */
export function pickEnemyType(t, rand = Math.random) {
  const table = /** @type {[keyof typeof ENEMY_TYPES, number][]} */ ([
    ['swarmer', 30],
    ['grunt', 40],
    ['leaper', t > 20 ? 14 : 0],
    ['spitter', t > 55 ? 10 : 0],
    ['splitter', t > 70 ? 9 : 0],
    ['tank', t > 60 ? 5 : 0],
  ]);
  let roll = rand() * table.reduce((sum, [, w]) => sum + w, 0);
  for (const [type, weight] of table) {
    roll -= weight;
    if (roll < 0) return type;
  }
  return 'grunt';
}

/** How many aliens are in the horde at each horde time. @param {number} index */
export function hordeSize(index) {
  return 34 + index * 14;
}
