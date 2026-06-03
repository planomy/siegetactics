import { TURRET_ORDER } from './turrets-data.js';

/**
 * Ammo sprite art direction in unrotated PNG (canvas coords: 0 = east, π/2 = south).
 * @typedef {Object} AmmoDef
 * @property {string} sprite
 * @property {number} [forwardAngle] - Omit for radial bolts (no rotation)
 * @property {number} size - Draw height in px at 1× field scale
 */

/** @type {Record<string, AmmoDef>} */
export const AMMO = {
  'granny-blaster': { sprite: 'assets/ammo/granny-blaster.png', forwardAngle: 0, size: 22 },
  'zap-sprinkler': { sprite: 'assets/ammo/zap-sprinkler.png', size: 24 },
  'boom-gnome': { sprite: 'assets/ammo/boom-gnome.png', forwardAngle: -Math.PI / 4, size: 26 },
  'plasma-daisy': { sprite: 'assets/ammo/plasma-daisy.png', forwardAngle: -Math.PI / 4, size: 24 },
  'rocket-rooster': { sprite: 'assets/ammo/rocket-rooster.png', forwardAngle: -Math.PI / 4, size: 28 },
  'sonic-slicer': { sprite: 'assets/ammo/sonic-slicer.png', forwardAngle: 0, size: 26 },
  'slime-spitter': { sprite: 'assets/ammo/slime-spitter.png', forwardAngle: Math.PI / 2, size: 22 },
  'meteor-mortar': { sprite: 'assets/ammo/meteor-mortar.png', forwardAngle: Math.PI / 4, size: 28 },
  'laser-lantern': { sprite: 'assets/ammo/laser-lantern.png', size: 24 },
  'thunder-bucket': { sprite: 'assets/ammo/thunder-bucket.png', forwardAngle: Math.PI / 2, size: 26 },
  'freeze-fridge': { sprite: 'assets/ammo/slime-spitter.png', forwardAngle: Math.PI / 2, size: 20 },
};

/**
 * @returns {Promise<Record<string, HTMLImageElement>>}
 */
export function loadAmmoSprites() {
  return Promise.all(
    TURRET_ORDER.map(
      (id) =>
        new Promise((resolve, reject) => {
          const def = AMMO[id];
          if (!def) {
            resolve([id, null]);
            return;
          }
          const img = new Image();
          img.onload = () => resolve([id, img]);
          img.onerror = () => reject(new Error(`Failed to load ${def.sprite}`));
          img.src = def.sprite;
        })
    )
  ).then((entries) => Object.fromEntries(entries));
}
