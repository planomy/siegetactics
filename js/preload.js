/** @type {HTMLImageElement|null} */
let fieldCache = null;
/** @type {Promise<HTMLImageElement>|null} */
let fieldPromise = null;

export const FIELD_SRC = 'assets/field.png';

/** Start loading the field art as early as possible. */
export function preloadField() {
  if (fieldCache) return Promise.resolve(fieldCache);
  if (fieldPromise) return fieldPromise;
  fieldPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      fieldCache = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load ${FIELD_SRC}`));
    img.src = FIELD_SRC;
  });
  return fieldPromise;
}

/** @returns {HTMLImageElement|null} */
export function getFieldImage() {
  return fieldCache;
}

/** Kick off field load immediately when this module loads. */
preloadField();

/**
 * Load gameplay sprites in the background while the player is in forge / welcome.
 * @param {{ unlocked?: Set<string> }} [opts]
 */
export function preloadDeployAssets(opts = {}) {
  preloadField();
  const unlocked = opts.unlocked ?? new Set();
  import('./turrets-data.js').then(({ TURRETS, STARTER_TURRETS }) => {
    const ids = new Set([...STARTER_TURRETS, ...unlocked]);
    ids.forEach((id) => {
      const src = TURRETS[id]?.sprite;
      if (!src) return;
      const img = new Image();
      img.src = src;
    });
  });
  import('./enemies-data.js').then(({ loadEnemySprites }) => {
    loadEnemySprites().catch(() => {});
  });
}

/**
 * @param {HTMLElement} numEl
 * @returns {Promise<void>}
 */
export function runDeployCountdown(numEl) {
  const steps = ['3', '2', '1', 'Go!'];
  let i = 0;
  numEl.textContent = steps[0];
  return new Promise((resolve) => {
    function tick() {
      i += 1;
      if (i >= steps.length) {
        resolve();
        return;
      }
      numEl.textContent = steps[i];
      setTimeout(tick, i === steps.length - 1 ? 550 : 900);
    }
    setTimeout(tick, 900);
  });
}
