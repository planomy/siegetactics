/** @typedef {'monster1'|'monster2'|'monster3'|'monster4'|'monster5'|'monster6'|'monster7'|'monster8'|'monster9'|'monster10'|'monster11'|'monster12'|'monster13'|'monster14'|'monster15'|'monster16'|'monster17'|'monster18'|'monster19'|'monster20'|'monster21'|'monster22'|'monster23'|'mothership'|'mothership2'|'mothership3'|'mothership4'|'granddaddy'} EnemySpriteKey */

/** @type {Record<EnemySpriteKey, string>} */
export const ENEMY_SPRITE_SRC = {
  monster1: 'assets/enemies/monster1.png',
  monster2: 'assets/enemies/monster2.png',
  monster3: 'assets/enemies/monster3.png',
  monster4: 'assets/enemies/monster4.png',
  monster5: 'assets/enemies/monster5.png',
  monster6: 'assets/enemies/monster6.png?v=2',
  monster7: 'assets/enemies/monster7.png?v=2',
  monster8: 'assets/enemies/monster8.png?v=2',
  monster9: 'assets/enemies/monster9.png?v=2',
  monster10: 'assets/enemies/monster10.png?v=2',
  monster11: 'assets/enemies/monster11.png?v=2',
  monster12: 'assets/enemies/monster12.png?v=1',
  monster13: 'assets/enemies/monster13.png?v=1',
  monster14: 'assets/enemies/monster14.png?v=1',
  monster15: 'assets/enemies/monster15.png?v=1',
  monster16: 'assets/enemies/monster16.png?v=1',
  monster17: 'assets/enemies/monster17.png?v=1',
  monster18: 'assets/enemies/monster18.png?v=1',
  monster19: 'assets/enemies/monster19.png?v=1',
  monster20: 'assets/enemies/monster20.png?v=1',
  monster21: 'assets/enemies/monster21.png?v=1',
  monster22: 'assets/enemies/monster22.png?v=1',
  monster23: 'assets/enemies/monster23.png?v=1',
  mothership: 'assets/enemies/mothership.png',
  mothership2: 'assets/enemies/mothership2.png',
  mothership3: 'assets/enemies/mothership3.png',
  mothership4: 'assets/enemies/mothership4.png',
  granddaddy: 'assets/enemies/granddaddy.png',
};

/** @typedef {'monster1'|'monster2'|'monster3'|'monster4'|'monster5'|'monster6'|'monster7'|'monster8'|'monster9'|'monster10'|'monster11'|'monster12'|'monster13'|'monster14'|'monster15'|'monster16'|'monster17'|'monster18'|'monster19'|'monster20'|'monster21'|'monster22'|'monster23'} GruntSpriteKey */

/**
 * Per-alien combat stats — each ship class has its own HP, pace, and arcade score.
 * Arcade score for the HUD, debrief, and friend-challenge codes.
 */
export const GRUNT_STATS = {
  monster1: { hp: 30, speed: 0.052, codename: 'Scout Skiff', score: 50 },
  monster2: { hp: 51, speed: 0.047, codename: 'Skirmisher', score: 70 },
  monster3: { hp: 78, speed: 0.043, codename: 'Raider', score: 100 },
  monster4: { hp: 119, speed: 0.038, codename: 'Bruiser', score: 130 },
  monster5: { hp: 173, speed: 0.033, codename: 'Heavy Cruiser', score: 180 },
  // Ground machines — early / mid / late bands (mirrored to face porch).
  monster6: { hp: 48, speed: 0.05, codename: 'Lime Claw', score: 60 },
  monster7: { hp: 62, speed: 0.048, codename: 'Cyclops Crawler', score: 75 },
  monster8: { hp: 98, speed: 0.042, codename: 'Siege Beetle', score: 100 },
  monster9: { hp: 118, speed: 0.04, codename: 'Neon Rover', score: 120 },
  monster10: { hp: 168, speed: 0.035, codename: 'Neon Tank', score: 160 },
  monster11: { hp: 210, speed: 0.031, codename: 'Crown Saucer', score: 200 },
  // Flyer craft — wave 3+ flanks (face right toward porch).
  monster12: { hp: 72, speed: 0.046, codename: 'Cyclops Hover', score: 110 },
  monster13: { hp: 84, speed: 0.044, codename: 'Armoured Hover', score: 120 },
  monster14: { hp: 90, speed: 0.042, codename: 'Saucer Tank', score: 130 },
  monster15: { hp: 80, speed: 0.047, codename: 'Crimson Manta', score: 115 },
  monster16: { hp: 88, speed: 0.043, codename: 'Saucer Drone', score: 125 },
  monster17: { hp: 102, speed: 0.04, codename: 'Dreadnought', score: 150 },
  // Elite flyer craft — mid/late flanks (shipped L→R already).
  monster18: { hp: 110, speed: 0.041, codename: 'Cyclops Boss', score: 170 },
  monster19: { hp: 118, speed: 0.04, codename: 'Neon Hover Boss', score: 180 },
  monster20: { hp: 124, speed: 0.039, codename: 'Grin Ship', score: 190 },
  monster21: { hp: 132, speed: 0.037, codename: 'Armoured Blimp', score: 210 },
  monster22: { hp: 128, speed: 0.038, codename: 'Beetle Flyer', score: 200 },
  monster23: { hp: 115, speed: 0.042, codename: 'Neon UFO', score: 175 },
};

export const BOSS_STATS = {
  mothership: { hp: 567, speed: 0.028, codename: 'Mothership', score: 750 },
  granddaddy: { hp: 972, speed: 0.025, codename: 'Granddaddy', score: 2000 },
};

/** Rare mothership bonus on top of the mothership base score. */
const RARE_SCORE_BONUS = { rare: 400, legendary: 900 };

/**
 * Arcade points for blasting this alien.
 * @param {{ spriteKey?: string|null, bossKind?: string|null, rare?: { tier?: string }|null }} enemy
 */
export function scoreForEnemy(enemy) {
  let base = 80;
  if (enemy.bossKind === 'granddaddy') base = BOSS_STATS.granddaddy.score;
  else if (enemy.bossKind === 'mothership') base = BOSS_STATS.mothership.score;
  else if (enemy.spriteKey && GRUNT_STATS[/** @type {GruntSpriteKey} */ (enemy.spriteKey)]) {
    base = GRUNT_STATS[/** @type {GruntSpriteKey} */ (enemy.spriteKey)].score;
  }
  if (!enemy.rare) return base;
  const tier = enemy.rare.tier === 'legendary' ? 'legendary' : 'rare';
  return base + RARE_SCORE_BONUS[tier];
}

/**
 * @param {GruntSpriteKey|'mothership'|'granddaddy'} key
 * @param {number} waveScale
 * @param {number} [ramp]
 */
export function scaledHp(key, waveScale, ramp = 1) {
  const base = GRUNT_STATS[key]?.hp ?? BOSS_STATS[key]?.hp ?? 30;
  return Math.round(base * waveScale * ramp);
}

/**
 * @param {GruntSpriteKey|'mothership'|'granddaddy'} key
 * @param {number} speedMul
 * @param {number} [rushMul]
 */
export function scaledSpeed(key, speedMul, rushMul = 1) {
  const base = GRUNT_STATS[key]?.speed ?? BOSS_STATS[key]?.speed ?? 0.042;
  return base * speedMul * rushMul;
}

/** Random mothership art picked per boss spawn. */
export const MOTHERSHIP_SPRITE_KEYS = /** @type {EnemySpriteKey[]} */ ([
  'mothership',
  'mothership2',
  'mothership3',
  'mothership4',
]);

/** Each dirt path gets its own ship design (wraps if path count exceeds art). */
const PATH_SHIPS = /** @type {EnemySpriteKey[]} */ ([
  'monster1',
  'monster2',
  'monster3',
  'monster4',
  'monster5',
  'monster6',
  'monster7',
  'monster8',
  'monster9',
  'monster10',
  'monster11',
]);

/** @returns {EnemySpriteKey} */
export function pickMothershipSprite() {
  return MOTHERSHIP_SPRITE_KEYS[Math.floor(Math.random() * MOTHERSHIP_SPRITE_KEYS.length)];
}

/**
 * @param {{ path: number, bossKind?: string|null, mothershipSprite?: EnemySpriteKey|null, spriteKey?: EnemySpriteKey|null }} enemy
 * @returns {EnemySpriteKey}
 */
export function spriteKeyForEnemy(enemy) {
  if (enemy.spriteKey && ENEMY_SPRITE_SRC[enemy.spriteKey]) return enemy.spriteKey;
  if (enemy.bossKind === 'granddaddy') return 'granddaddy';
  if (enemy.bossKind === 'mothership') {
    return enemy.mothershipSprite && ENEMY_SPRITE_SRC[enemy.mothershipSprite]
      ? enemy.mothershipSprite
      : 'mothership';
  }
  return PATH_SHIPS[enemy.path % PATH_SHIPS.length] ?? 'monster1';
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
