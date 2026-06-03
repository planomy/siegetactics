/** @typedef {'monster1'|'monster2'|'monster3'|'monster4'|'monster5'|'mothership'|'granddaddy'} EnemySpriteKey */

/** @type {Record<EnemySpriteKey, string>} */
export const ENEMY_SPRITE_SRC = {
  monster1: 'assets/enemies/monster1.png',
  monster2: 'assets/enemies/monster2.png',
  monster3: 'assets/enemies/monster3.png',
  monster4: 'assets/enemies/monster4.png',
  monster5: 'assets/enemies/monster5.png',
  mothership: 'assets/enemies/mothership.png',
  granddaddy: 'assets/enemies/granddaddy.png',
};

/** Each dirt path gets its own ship design (wraps if path count exceeds art). */
const PATH_SHIPS = /** @type {EnemySpriteKey[]} */ ([
  'monster1',
  'monster2',
  'monster3',
  'monster4',
  'monster5',
  'monster5',
]);

/**
 * @param {{ path: number, bossKind?: string|null }} enemy
 * @returns {EnemySpriteKey}
 */
export function spriteKeyForEnemy(enemy) {
  if (enemy.bossKind === 'granddaddy') return 'granddaddy';
  if (enemy.bossKind === 'mothership') return 'mothership';
  return PATH_SHIPS[enemy.path] ?? 'monster1';
}

/**
 * @param {{ bossKind?: string|null }} enemy
 * @param {number} base - Base pixel size for regular ship
 */
export function spriteSizeForEnemy(enemy, base) {
  if (enemy.bossKind === 'granddaddy') return base * 2.5;
  if (enemy.bossKind === 'mothership') return base * 1.85;
  return base;
}

/**
 * @returns {Promise<Record<EnemySpriteKey, HTMLImageElement>>}
 */
export function loadEnemySprites() {
  return Promise.all(
    Object.entries(ENEMY_SPRITE_SRC).map(
      ([key, src]) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve([/** @type {EnemySpriteKey} */ (key), img]);
          img.onerror = () => reject(new Error(`Failed to load ${src}`));
          img.src = src;
        })
    )
  ).then((entries) => Object.fromEntries(entries));
}
