/** Cupcake homing-missile tuning. */
export const CUPCAKE = {
  salvoCount: 4,
  salvoInterval: 0.95,
  speed: 265,
  turnRate: 5.4,
  damage: 52,
  aoe: 58,
  hitRadius: 18,
  /** Unrotated sprite nose points down (+Y). */
  forwardAngle: Math.PI / 2,
  trailMax: 14,
  trailFade: 2.4,
  /** Auto-launch when any alien passes this progress toward the house (0–1). */
  autoFireProgress: 0.4,
  killBurstDuration: 0.45,
  killBurstDurationBoss: 0.58,
};

/**
 * @param {{ progress: number, bossKind?: string|null, hp: number, maxHp: number, id: number }} enemy
 */
export function enemyThreat(enemy) {
  let score = enemy.progress * 100;
  if (enemy.bossKind === 'granddaddy') score += 90;
  else if (enemy.bossKind === 'mothership') score += 65;
  score += (enemy.hp / enemy.maxHp) * 20;
  return score;
}

/**
 * @param {{ progress: number, bossKind?: string|null, hp: number, maxHp: number, id: number }[]} enemies
 * @param {Set<number>} [lockedIds]
 */
export function pickCupcakeTarget(enemies, lockedIds = new Set()) {
  let best = null;
  let bestScore = -1;
  for (const e of enemies) {
    if (lockedIds.has(e.id)) continue;
    const score = enemyThreat(e);
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  if (best) return best;
  if (lockedIds.size === 0 || enemies.length === 0) return null;
  return enemies.reduce((a, b) => (enemyThreat(a) >= enemyThreat(b) ? a : b));
}

/** @param {{ progress: number }[]} enemies */
export function shouldAutoFireCupcakes(enemies) {
  return enemies.some((e) => e.progress >= CUPCAKE.autoFireProgress);
}

/**
 * @param {number} angle
 * @param {number} target
 * @param {number} maxTurn
 */
export function steerAngle(angle, target, maxTurn) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return angle + Math.max(-maxTurn, Math.min(maxTurn, diff));
}
