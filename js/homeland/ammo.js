/**
 * Granny's ammo. The blaster never runs out; everything else comes in crates with a limited number
 * of rounds, and Granny carries up to three kinds at once on her ammo rack.
 *
 * Sprites point straight up. Size is the sprite height in world units, speed is world units a
 * second and gap is seconds between shots.
 */

/**
 * @typedef {'blaster'|'pie'|'shark'|'fireball'|'ice'|'saw'|'zap'|'glove'|'chicken'|'nuke'|'twister'} AmmoId
 * @typedef {{
 *   name: string, sprite: string, colour: string, size: number, speed: number, gap: number, dmg: number,
 *   rounds: number, sound: string, fan?: number, splash?: number, pierce?: number, slow?: number,
 *   chain?: number, push?: number, spin?: number, life?: number, rehit?: number, pull?: number, whirl?: boolean,
 * }} AmmoType
 * `rehit` lets one shot hit the same alien again after that many seconds; `pull` drags nearby aliens
 * in; `whirl` shots stand on the ground and spin like a tornado.
 * @type {Record<AmmoId, AmmoType>}
 */
export const AMMO = {
  blaster: { name: 'Granny Blaster', sprite: 'shot-blaster', colour: '#5ae0ff', size: 0.2, speed: 12, gap: 0.2, dmg: 1, rounds: Infinity, sound: 'lazer1' },
  pie: { name: 'Cherry Pies', sprite: 'ammo-pie', colour: '#ff9a3a', size: 0.26, speed: 7.5, gap: 0.42, dmg: 3, splash: 0.65, spin: 5, rounds: 40, sound: 'slime' },
  shark: { name: 'Shark Rockets', sprite: 'ammo-shark', colour: '#ff4f4f', size: 0.32, speed: 10, gap: 0.32, dmg: 5, splash: 0.5, rounds: 50, sound: 'missile' },
  fireball: { name: 'Fireballs', sprite: 'ammo-fireball', colour: '#ff7a1a', size: 0.26, speed: 13, gap: 0.15, dmg: 2, pierce: 3, rounds: 100, sound: 'lazer1' },
  ice: { name: 'Freeze Shards', sprite: 'ammo-ice', colour: '#8ae8ff', size: 0.24, speed: 13, gap: 0.22, dmg: 1, fan: 3, slow: 3, rounds: 80, sound: 'electro' },
  saw: { name: 'Saw Blades', sprite: 'ammo-saw', colour: '#d8e2ec', size: 0.26, speed: 9, gap: 0.34, dmg: 3, pierce: 99, spin: 22, rounds: 45, sound: 'electro' },
  zap: { name: 'Lightning', sprite: 'ammo-zap', colour: '#7ad8ff', size: 0.3, speed: 16, gap: 0.22, dmg: 2, chain: 3, rounds: 80, sound: 'electro' },
  glove: { name: 'Boxing Gloves', sprite: 'ammo-glove', colour: '#ff4a4a', size: 0.26, speed: 11, gap: 0.26, dmg: 3, push: 1.1, rounds: 60, sound: 'missile' },
  chicken: { name: 'Rubber Chickens', sprite: 'ammo-chicken', colour: '#ffd23a', size: 0.26, speed: 10, gap: 0.32, dmg: 2, fan: 5, spin: 3, rounds: 50, sound: 'slime' },
  nuke: { name: 'Mini Nukes', sprite: 'ammo-nuke', colour: '#9dff3a', size: 0.36, speed: 7, gap: 0.8, dmg: 12, splash: 1.3, rounds: 12, sound: 'missile' },
  twister: {
    name: 'Twisters', sprite: 'ammo-twister', colour: '#a8b8ff', size: 0.7, speed: 3.2, gap: 0.85, dmg: 4, pierce: 999, rehit: 0.2, pull: 0.85,
    whirl: true, spin: 26, life: 3.4, rounds: 15, sound: 'electro',
  },
};

/** Ammo that turns up in crates (everything but the blaster). */
export const CRATE_AMMO = /** @type {AmmoId[]} */ (Object.keys(AMMO).filter((id) => id !== 'blaster'));

/** Granny's rack: the blaster plus this many special ammo kinds. */
export const RACK_SLOTS = 3;

/** @type {Map<string, HTMLImageElement>} */
const images = new Map();

/** @param {string} name */
export function ammoImage(name) {
  let img = images.get(name);
  if (!img) {
    img = new Image();
    img.src = `assets/homeland/ammo/${name}.webp`;
    images.set(name, img);
  }
  return img;
}

for (const a of Object.values(AMMO)) ammoImage(a.sprite);
for (const name of ['alien-slime', 'alien-spore', 'alien-virus', 'alien-skull', 'alien-urchin', 'alien-lava', 'alien-egg', 'alien-tentacle', 'alien-eye', 'alien-worm']) {
  ammoImage(name);
}
