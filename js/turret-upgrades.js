/**
 * Turret upgrades: every owned turret can be raised to level 3 with upgrade cores,
 * which players earn by finishing 10-question missions and ranking up topics and
 * spend on the turrets they choose. Upgrades boost damage, range and fire rate
 * modestly, and the battlefield shows the level with an aura and stars.
 */
import { TURRETS } from './turrets-data.js';

export const TURRET_MAX_LEVEL = 3;

/** Upgrade cores each level costs. */
export const UPGRADE_CORE_COST = { 2: 1, 3: 2 };

/** Stat multipliers per level: power (damage and support effects), reach (range and splash), speed (time between shots). */
const BOOST = {
  1: { power: 1, reach: 1, speed: 1 },
  2: { power: 1.25, reach: 1.08, speed: 0.92 },
  3: { power: 1.55, reach: 1.15, speed: 0.85 },
};

/** @type {Record<string, number>} */
let levels = {};
const cache = new Map();

/** @param {Record<string, number>|undefined|null} saved */
export function normalizeTurretLevels(saved) {
  const out = {};
  for (const [id, level] of Object.entries(saved && typeof saved === 'object' ? saved : {})) {
    const n = Math.floor(Number(level));
    if (TURRETS[id] && n >= 2) out[id] = Math.min(TURRET_MAX_LEVEL, n);
  }
  return out;
}

/** @param {Record<string, number>} saved */
export function setTurretLevels(saved) {
  levels = normalizeTurretLevels(saved);
  cache.clear();
}

/** @param {string} id */
export function turretLevel(id) {
  return levels[id] ?? 1;
}

/**
 * The next level an owned turret can reach, its cost in cores, and whether the player can afford it.
 * @param {string} id @param {number} cores @param {boolean} owned
 */
export function nextUpgrade(id, cores, owned) {
  const current = turretLevel(id);
  if (!owned || current >= TURRET_MAX_LEVEL) return null;
  const level = /** @type {2|3} */ (current + 1);
  const cost = UPGRADE_CORE_COST[level];
  return { level, cost, ready: cores >= cost, short: Math.max(0, cost - cores) };
}

/** Whether the player can afford any upgrade right now. @param {number} cores @param {Set<string>} unlocked */
export function anyUpgradeReady(cores, unlocked) {
  return [...unlocked].some((id) => nextUpgrade(id, cores, true)?.ready);
}

/** @param {unknown} value */
export function normalizeCores(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

/**
 * The turret's stats at its current level. The engine uses this instead of the base TURRETS entry.
 * @param {string} type
 */
export function effectiveTurret(type) {
  const base = TURRETS[/** @type {keyof typeof TURRETS} */ (type)];
  if (!base) return base;
  const level = turretLevel(type);
  if (level === 1) return base;
  const key = `${type}:${level}`;
  if (cache.has(key)) return cache.get(key);
  const b = BOOST[level];
  const def = {
    ...base,
    level,
    damage: Math.round(base.damage * b.power),
    range: Math.round(base.range * b.reach),
    fireRate: +(base.fireRate * b.speed).toFixed(3),
  };
  if (base.aoe) def.aoe = Math.round(base.aoe * b.reach);
  if (base.repairHpPerSec) def.repairHpPerSec = +(base.repairHpPerSec * b.power).toFixed(2);
  if (base.repairRadius) def.repairRadius = Math.round(base.repairRadius * b.reach);
  if (base.magnetRadius) def.magnetRadius = Math.round(base.magnetRadius * b.reach);
  if (base.magnetBonus) def.magnetBonus = base.magnetBonus + (level - 1);
  if (base.slowDuration) def.slowDuration = +(base.slowDuration * (1 + (b.power - 1) / 2)).toFixed(2);
  if (base.freezeDuration) def.freezeDuration = +(base.freezeDuration * (1 + (b.power - 1) / 2)).toFixed(2);
  cache.set(key, def);
  return def;
}
