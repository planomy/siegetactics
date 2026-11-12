import { TURRET_ORDER } from './turrets-data.js';

/**
 * Ammo sprite art direction in unrotated PNG (canvas coords: 0 = east, π/2 = south).
 * @typedef {Object} AmmoDef
 * @property {string} sprite
 * @property {number} [forwardAngle] - Omit for radial bolts (no rotation)
 * @property {number} size - Longest side in px at 1× field scale
 */

const V = '?v=20261112a1';

/** Directional shots are drawn pointing east; the slime blob and bomb stay upright. @type {Record<string, AmmoDef>} */
export const AMMO = {
  'granny-blaster': { sprite: `assets/ammo/granny-blaster.png${V}`, forwardAngle: 0, size: 26 },
  'zap-sprinkler': { sprite: `assets/ammo/zap-sprinkler.png${V}`, forwardAngle: 0, size: 30 },
  'boom-gnome': { sprite: `assets/ammo/boom-gnome.png${V}`, size: 24 },
  'plasma-daisy': { sprite: `assets/ammo/plasma-daisy.png${V}`, forwardAngle: 0, size: 26 },
  'rocket-rooster': { sprite: `assets/ammo/rocket-rooster.png${V}`, forwardAngle: 0, size: 32 },
  'sonic-slicer': { sprite: `assets/ammo/sonic-slicer.png${V}`, forwardAngle: 0, size: 28 },
  'slime-spitter': { sprite: `assets/ammo/slime-spitter.png${V}`, size: 22 },
  'meteor-mortar': { sprite: `assets/ammo/meteor-mortar.png${V}`, forwardAngle: 0, size: 30 },
  'laser-lantern': { sprite: `assets/ammo/laser-lantern.png${V}`, forwardAngle: 0, size: 34 },
  'thunder-bucket': { sprite: `assets/ammo/thunder-bucket.png${V}`, forwardAngle: 0, size: 32 },
  'freeze-fridge': { sprite: `assets/ammo/freeze-fridge.png${V}`, forwardAngle: 0, size: 26 },
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
