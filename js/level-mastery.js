import { recordMapPass, MAP_PASS_ACCURACY, MAP_PASSES_REQUIRED, TRAINING_MODULE_IDS } from './map-progress.js';

export { MAP_PASS_ACCURACY, MAP_PASSES_REQUIRED, TRAINING_MODULE_IDS };

/** Perfect score (0–1) needed to earn a level shield. */
export const SHIELD_ACCURACY = 1;

/** One-time bonus when first earning a shield at each level. */
export const FIRST_CLEAR_BONUS = {
  1: 15,
  2: 25,
  3: 40,
};

/** @typedef {Record<string, DifficultyLevel[]>} LevelMasterySave */

/** @returns {LevelMasterySave} */
export function defaultLevelMastery() {
  return {};
}

/** @param {unknown} raw @returns {LevelMasterySave} */
export function normalizeLevelMastery(raw) {
  if (!raw || typeof raw !== 'object') return defaultLevelMastery();
  const out = /** @type {LevelMasterySave} */ ({});
  for (const [moduleId, levels] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
    if (!Array.isArray(levels)) continue;
    const parsed = levels
      .map((l) => Number(l))
      .filter((l) => l === 1 || l === 2 || l === 3);
    if (parsed.length) out[moduleId] = [...new Set(parsed)].sort((a, b) => a - b);
  }
  return out;
}

/** @param {LevelMasterySave} mastery @param {string} moduleId */
export function getQualifiedLevels(mastery, moduleId) {
  return mastery[moduleId] ?? [];
}

/** @param {LevelMasterySave} mastery @param {string} moduleId @param {DifficultyLevel} level */
export function isQualifiedAt(mastery, moduleId, level) {
  return getQualifiedLevels(mastery, moduleId).includes(level);
}

/**
 * @param {LevelMasterySave} mastery
 * @param {string} moduleId
 * @returns {DifficultyLevel}
 */
export function recommendModuleLevel(mastery, moduleId) {
  const q = getQualifiedLevels(mastery, moduleId);
  if (q.includes(2) && !q.includes(3)) return 3;
  if (q.includes(1) && !q.includes(2)) return 2;
  if (q.includes(3)) return 3;
  return 1;
}

/**
 * @param {LevelMasterySave} mastery
 * @returns {DifficultyLevel}
 */
export function recommendGlobalLevel(mastery) {
  let total = 0;
  let count = 0;
  for (const id of TRAINING_MODULE_IDS) {
    total += recommendModuleLevel(mastery, id);
    count += 1;
  }
  if (!count) return 1;
  return /** @type {DifficultyLevel} */ (Math.min(3, Math.max(1, Math.round(total / count))));
}

/**
 * @param {LevelMasterySave} mastery
 * @param {string} moduleId
 * @param {DifficultyLevel} level
 * @param {number} accuracy 0–1
 */
export function recordShieldProgress(mastery, moduleId, level, accuracy) {
  const next = { ...mastery, [moduleId]: [...(mastery[moduleId] ?? [])] };
  const perfect = accuracy >= SHIELD_ACCURACY;
  const already = next[moduleId].includes(level);
  let shieldEarned = false;
  let firstClearBonus = 0;

  if (perfect && !already) {
    next[moduleId] = [...next[moduleId], level].sort((a, b) => a - b);
    shieldEarned = true;
    firstClearBonus = FIRST_CLEAR_BONUS[level] ?? 0;
  }

  return {
    mastery: next,
    perfect,
    shieldEarned,
    firstClearBonus,
    nudge: buildShieldNudge(level, accuracy, shieldEarned),
  };
}

/**
 * @param {LevelMasterySave} mastery
 * @param {import('./map-progress.js').MapProgressSave} mapProgress
 * @param {string} moduleId
 * @param {DifficultyLevel} level
 * @param {number} accuracy
 */
export function recordTrainingProgress(mastery, mapProgress, moduleId, level, accuracy) {
  const shield = recordShieldProgress(mastery, moduleId, level, accuracy);
  const map = recordMapPass(mapProgress, moduleId, accuracy);
  return {
    ...shield,
    mapProgress: map.progress,
    mapPassAdded: map.added,
    mapPasses: map.passes,
    mapPieceEarned: map.pieceEarned,
  };
}

/**
 * @param {DifficultyLevel} level
 * @param {number} accuracy
 * @param {boolean} shieldEarned
 */
function buildShieldNudge(level, accuracy, shieldEarned) {
  if (shieldEarned) {
    if (level >= 3) return 'Perfect run — Level 3 shield earned!';
    const nextLevel = /** @type {DifficultyLevel} */ (level + 1);
    return `Perfect! Level ${level} shield earned. Try Level ${nextLevel} for bigger XP.`;
  }
  if (accuracy >= MAP_PASS_ACCURACY && accuracy < SHIELD_ACCURACY) {
    return 'Solid pass — a perfect run earns the level shield.';
  }
  if (accuracy >= 0.9 && accuracy < SHIELD_ACCURACY) {
    return 'So close — 100% earns the shield.';
  }
  return null;
}

/** Shield art for per-module level qualifications. */
export const LEVEL_SHIELD_SRC = 'assets/badges/level-shield.png';

/** @param {LevelMasterySave} mastery @param {string} moduleId */
export function renderModuleLevelPips(mastery, moduleId) {
  const qualified = new Set(getQualifiedLevels(mastery, moduleId));
  return [1, 2, 3]
    .map(
      (n) => `
        <span
          class="gb-level-shield${qualified.has(n) ? ' is-earned' : ''}"
          title="${qualified.has(n) ? `Perfect at level ${n}` : `Level ${n} — need 100%`}"
        >
          <img class="gb-level-shield-img" src="${LEVEL_SHIELD_SRC}" width="64" height="72" alt="" aria-hidden="true" />
          <span class="gb-level-shield-num">${n}</span>
        </span>`
    )
    .join('');
}
