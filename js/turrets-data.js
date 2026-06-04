/** @typedef {'granny-blaster'|'zap-sprinkler'|'boom-gnome'|'plasma-daisy'|'rocket-rooster'|'sonic-slicer'|'slime-spitter'|'meteor-mortar'|'laser-lantern'|'thunder-bucket'|'glue-goo'|'freeze-fridge'|'decoy-gnome'|'xp-magnet'|'repair-shed'} TurretType */

/**
 * @typedef {Object} TurretDef
 * @property {TurretType} id
 * @property {string} name
 * @property {string} sprite
 * @property {number} unlockXp - Persistent XP to unlock forever (0 = starter)
 * @property {number} placementCost - Siege coins to place one on field
 * @property {string} color
 * @property {string} desc
 * @property {number} damage
 * @property {number} range
 * @property {number} fireRate - Seconds between shots (lower = faster)
 * @property {number} boltSize
 * @property {number} boltSpeed
 * @property {number} [aoe]
 * @property {number} [slow]
 * @property {number} [slowDuration]
 * @property {number} [freezeDuration]
 * @property {boolean} [flipX] - Mirror sprite (face left toward aliens)
 * @property {'decoy'|'magnet'|'repair'|'glue'|'freeze'} [role]
 * @property {number} [magnetRadius]
 * @property {number} [magnetBonus]
 * @property {number} [repairRadius]
 * @property {number} [repairHpPerSec]
 */

/** @type {TurretType[]} */
export const STARTER_TURRETS = ['granny-blaster', 'zap-sprinkler', 'boom-gnome', 'plasma-daisy'];

/** @type {Record<TurretType, TurretDef>} */
export const TURRETS = {
  'granny-blaster': {
    id: 'granny-blaster',
    name: 'Granny Blaster',
    sprite: 'assets/turrets/granny-blaster.png',
    unlockXp: 0,
    placementCost: 15,
    color: '#7cfc00',
    desc: 'Basic rapid shots',
    damage: 11,
    range: 95,
    fireRate: 0.22,
    boltSize: 4,
    boltSpeed: 360,
  },
  'zap-sprinkler': {
    id: 'zap-sprinkler',
    name: 'Zap Sprinkler',
    sprite: 'assets/turrets/zap-sprinkler.png',
    unlockXp: 0,
    placementCost: 18,
    color: '#5ce1ff',
    desc: 'Electric spray bolts',
    damage: 15,
    range: 88,
    fireRate: 0.24,
    boltSize: 4,
    boltSpeed: 380,
  },
  'slime-spitter': {
    id: 'slime-spitter',
    name: 'Slime Spitter',
    sprite: 'assets/turrets/slime-spitter.png',
    flipX: true,
    unlockXp: 300,
    placementCost: 22,
    color: '#7cfc00',
    desc: 'Slows with slime',
    damage: 8,
    range: 78,
    fireRate: 0.48,
    boltSize: 5,
    boltSpeed: 260,
    slow: 0.45,
  },
  'plasma-daisy': {
    id: 'plasma-daisy',
    name: 'Plasma Daisy',
    sprite: 'assets/turrets/plasma-daisy.png',
    unlockXp: 0,
    placementCost: 25,
    color: '#ff6bcb',
    desc: 'Plasma seed bursts',
    damage: 24,
    range: 92,
    fireRate: 0.62,
    boltSize: 5,
    boltSpeed: 340,
  },
  'boom-gnome': {
    id: 'boom-gnome',
    name: 'Boom Gnome',
    sprite: 'assets/turrets/boom-gnome.png',
    unlockXp: 0,
    placementCost: 28,
    color: '#ff6b35',
    desc: 'Explosive pop shots',
    damage: 30,
    range: 72,
    fireRate: 0.95,
    boltSize: 6,
    boltSpeed: 300,
    aoe: 36,
  },
  'sonic-slicer': {
    id: 'sonic-slicer',
    name: 'Sonic Slicer',
    sprite: 'assets/turrets/sonic-slicer.png',
    unlockXp: 1300,
    placementCost: 32,
    color: '#ffd166',
    desc: 'Sound-wave blasts',
    damage: 36,
    range: 82,
    fireRate: 1.05,
    boltSize: 7,
    boltSpeed: 290,
    aoe: 48,
  },
  'thunder-bucket': {
    id: 'thunder-bucket',
    name: 'Thunder Bucket',
    sprite: 'assets/turrets/thunder-bucket.png',
    unlockXp: 1800,
    placementCost: 36,
    color: '#4ecdc4',
    desc: 'Lightning strikes',
    damage: 44,
    range: 90,
    fireRate: 1.2,
    boltSize: 5,
    boltSpeed: 400,
    aoe: 40,
  },
  'rocket-rooster': {
    id: 'rocket-rooster',
    name: 'Rocket Rooster',
    sprite: 'assets/turrets/rocket-rooster.png',
    flipX: true,
    unlockXp: 2500,
    placementCost: 42,
    color: '#ff4444',
    desc: 'Mini rockets',
    damage: 44,
    range: 115,
    fireRate: 1.75,
    boltSize: 6,
    boltSpeed: 320,
  },
  'laser-lantern': {
    id: 'laser-lantern',
    name: 'Laser Lantern',
    sprite: 'assets/turrets/laser-lantern.png',
    unlockXp: 3500,
    placementCost: 48,
    color: '#ffe566',
    desc: 'Beam pulses',
    damage: 66,
    range: 135,
    fireRate: 1.65,
    boltSize: 4,
    boltSpeed: 420,
  },
  'meteor-mortar': {
    id: 'meteor-mortar',
    name: 'Meteor Mortar',
    sprite: 'assets/turrets/meteor-mortar.png',
    unlockXp: 5000,
    placementCost: 55,
    color: '#ff8c42',
    desc: 'Lobs fireballs',
    damage: 72,
    range: 105,
    fireRate: 1.9,
    boltSize: 7,
    boltSpeed: 260,
    aoe: 52,
  },
  'glue-goo': {
    id: 'glue-goo',
    name: 'Glue Goo Pot',
    sprite: 'assets/turrets/glue-goo.png',
    unlockXp: 5500,
    placementCost: 24,
    color: '#b565ff',
    desc: 'Splashes lane — aliens crawl',
    role: 'glue',
    damage: 0,
    range: 88,
    fireRate: 1.65,
    boltSize: 0,
    boltSpeed: 0,
    slowDuration: 3.5,
  },
  'freeze-fridge': {
    id: 'freeze-fridge',
    name: 'Freeze Fridge',
    sprite: 'assets/turrets/freeze-fridge.png',
    unlockXp: 6200,
    placementCost: 26,
    color: '#5ce1ff',
    desc: 'Icy blast — stop right there',
    role: 'freeze',
    damage: 10,
    range: 72,
    fireRate: 2.65,
    boltSize: 5,
    boltSpeed: 260,
    aoe: 32,
    freezeDuration: 1.45,
  },
  'decoy-gnome': {
    id: 'decoy-gnome',
    name: 'Decoy Gnome',
    sprite: 'assets/turrets/decoy-gnome.png',
    unlockXp: 7000,
    placementCost: 20,
    color: '#ff6bcb',
    desc: 'Aliens attack the gnome',
    role: 'decoy',
    damage: 0,
    range: 0,
    fireRate: 999,
    boltSize: 0,
    boltSpeed: 0,
  },
  'xp-magnet': {
    id: 'xp-magnet',
    name: 'XP Magnet Dish',
    sprite: 'assets/turrets/xp-magnet.png',
    unlockXp: 7800,
    placementCost: 30,
    color: '#ffd166',
    desc: 'Extra coins from nearby kills',
    role: 'magnet',
    damage: 0,
    range: 0,
    fireRate: 999,
    boltSize: 0,
    boltSpeed: 0,
    magnetRadius: 115,
    magnetBonus: 1,
  },
  'repair-shed': {
    id: 'repair-shed',
    name: 'Repair Shed',
    sprite: 'assets/turrets/repair-shed.png',
    unlockXp: 8500,
    placementCost: 32,
    color: '#ef233c',
    desc: 'Heals nearby turrets',
    role: 'repair',
    damage: 0,
    range: 0,
    fireRate: 999,
    boltSize: 0,
    boltSpeed: 0,
    repairRadius: 100,
    repairHpPerSec: 6,
  },
};

export const TURRET_ORDER = /** @type {TurretType[]} */ ([
  'granny-blaster',
  'zap-sprinkler',
  'slime-spitter',
  'plasma-daisy',
  'boom-gnome',
  'sonic-slicer',
  'thunder-bucket',
  'rocket-rooster',
  'laser-lantern',
  'meteor-mortar',
  'glue-goo',
  'freeze-fridge',
  'decoy-gnome',
  'xp-magnet',
  'repair-shed',
]);

/** HP before aliens wreck the turret (scales with tier). */
export const TURRET_MAX_HP = /** @type {Record<TurretType, number>} */ ({
  'granny-blaster': 75,
  'zap-sprinkler': 80,
  'slime-spitter': 85,
  'plasma-daisy': 95,
  'boom-gnome': 105,
  'sonic-slicer': 110,
  'thunder-bucket': 115,
  'rocket-rooster': 125,
  'laser-lantern': 135,
  'meteor-mortar': 145,
  'glue-goo': 90,
  'freeze-fridge': 100,
  'decoy-gnome': 130,
  'xp-magnet': 85,
  'repair-shed': 120,
});

/** @param {TurretType} id */
export function wreckedSpritePath(id) {
  return `assets/turrets/wrecked/${id}.png`;
}

/**
 * @returns {Promise<Record<TurretType, HTMLImageElement>>}
 */
export function loadTurretSprites() {
  return Promise.all(
    TURRET_ORDER.map(
      (id) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([id, img]);
          img.onerror = () => reject(new Error(`Failed to load ${TURRETS[id].sprite}`));
          img.src = TURRETS[id].sprite;
        })
    )
  ).then((entries) => Object.fromEntries(entries));
}

/**
 * @returns {Promise<Record<TurretType, HTMLImageElement>>}
 */
export function loadWreckedTurretSprites() {
  return Promise.all(
    TURRET_ORDER.map(
      (id) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([id, img]);
          img.onerror = () => resolve([id, null]);
          img.src = wreckedSpritePath(id);
        })
    )
  ).then((entries) => Object.fromEntries(entries));
}
