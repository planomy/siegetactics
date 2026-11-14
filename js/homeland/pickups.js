/**
 * Crystals and power-ups.
 *
 * Kills drop loose gems that fill the level bar. Crystal deposits sit on the battlefield and burst
 * into gems when shot. Power-ups drop now and then from kills and from the richest deposits.
 */

/** Loose gems, biggest first. Height is in world units. */
export const GEMS = [
  { name: 'gem-large', value: 4, h: 0.24 },
  { name: 'gem-medium', value: 2, h: 0.19 },
  { name: 'gem-small', value: 1, h: 0.14 },
];

/**
 * Gems for a kill worth `total` crystals: as few pickups as possible.
 * @param {number} total
 */
export function gemsFor(total) {
  const out = [];
  let left = total;
  for (const gem of GEMS) {
    while (left >= gem.value) {
      out.push(gem);
      left -= gem.value;
    }
  }
  return out;
}

/**
 * Shootable crystal deposits. `prize` ones always hide a power-up and a crate of ammo.
 * @typedef {{ name: string, w: number, hp: number, crystals: number, colour: string, prize?: boolean }} DepositType
 * @type {DepositType[]}
 */
export const DEPOSITS = [
  { name: 'crystal-sprout', w: 0.42, hp: 4, crystals: 3, colour: '#a98bff' },
  { name: 'crystal-cluster', w: 0.5, hp: 8, crystals: 6, colour: '#8a9bff' },
  { name: 'crystal-spires', w: 0.55, hp: 10, crystals: 8, colour: '#7ab8ff' },
  { name: 'crystal-chunks', w: 0.6, hp: 10, crystals: 8, colour: '#8a7bff' },
  { name: 'crystal-teal', w: 0.6, hp: 8, crystals: 6, colour: '#2de2c8' },
  { name: 'crystal-pink', w: 0.6, hp: 8, crystals: 6, colour: '#ff4fd8' },
  { name: 'crystal-green', w: 0.6, hp: 10, crystals: 8, colour: '#7bff3a' },
  { name: 'crystal-geode', w: 0.6, hp: 14, crystals: 6, colour: '#d05aff', prize: true },
  { name: 'crystal-gold', w: 0.65, hp: 18, crystals: 12, colour: '#ffd23a', prize: true },
];

/**
 * @typedef {'boost'|'shield'|'magnet'|'nuke'|'energy'|'rapid'|'health'|'crystal'|'mystery'|'radar'|'coins'|'cupcakes'} PowerId
 * `time` is how long a timed power-up lasts; instant ones have none.
 * @type {Record<PowerId, { name: string, time?: number, colour: string }>}
 */
export const POWERS = {
  boost: { name: 'SPEED BOOST', time: 8, colour: '#5ae0ff' },
  shield: { name: 'FORCE FIELD', time: 7, colour: '#5ab8ff' },
  magnet: { name: 'CRYSTAL MAGNET', time: 10, colour: '#ff5a5a' },
  nuke: { name: 'NUKE READY!', colour: '#9dff3a' },
  energy: { name: 'POWER SURGE', time: 10, colour: '#5ae0ff' },
  rapid: { name: 'RAPID FIRE', time: 10, colour: '#ffd23a' },
  health: { name: '+40 HEALTH', colour: '#ff5a6a' },
  crystal: { name: 'LEVEL UP!', colour: '#c78bff' },
  mystery: { name: 'MYSTERY BOX', colour: '#ffb02e' },
  radar: { name: 'ALIEN JAMMER', time: 6, colour: '#7bff6a' },
  coins: { name: 'TREASURE!', colour: '#ffd23a' },
  cupcakes: { name: 'CUPCAKE BARRAGE', colour: '#ff7ae8' },
};

/** How often each power-up turns up. Rarer ones are the strongest. @type {[PowerId, number][]} */
const POWER_WEIGHTS = [
  ['boost', 10], ['shield', 7], ['magnet', 10], ['nuke', 3], ['energy', 8], ['rapid', 10],
  ['health', 9], ['crystal', 3], ['mystery', 6], ['radar', 6], ['coins', 7], ['cupcakes', 7],
];

/**
 * A random power-up. The mystery box rolls again from everything else.
 * @param {{ hurt?: boolean, mystery?: boolean }} [opts] `hurt` makes health likelier.
 * @returns {PowerId}
 */
export function rollPower({ hurt = false, mystery = false } = {}) {
  const pool = POWER_WEIGHTS.filter(([id]) => !(mystery && id === 'mystery')).map(([id, w]) => ({ id, w: id === 'health' && hurt ? w * 3 : w }));
  let roll = Math.random() * pool.reduce((sum, p) => sum + p.w, 0);
  for (const p of pool) {
    roll -= p.w;
    if (roll <= 0) return p.id;
  }
  return pool[0].id;
}

/** @type {Map<string, HTMLImageElement>} */
const images = new Map();

/** @param {string} name */
export function pickupImage(name) {
  let img = images.get(name);
  if (!img) {
    img = new Image();
    img.src = `assets/homeland/pickups/${name}.webp`;
    images.set(name, img);
  }
  return img;
}

for (const gem of GEMS) pickupImage(gem.name);
for (const d of DEPOSITS) pickupImage(d.name);
for (const id of Object.keys(POWERS)) pickupImage(`power-${id}`);
