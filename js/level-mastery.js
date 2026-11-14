import { recordMapPass, MAP_PASS_ACCURACY, MAP_PASSES_REQUIRED, TRAINING_MODULE_IDS } from './map-progress.js';

export { MAP_PASS_ACCURACY, MAP_PASSES_REQUIRED, TRAINING_MODULE_IDS };

/** Perfect score (0–1) needed to earn a level shield. */
export const SHIELD_ACCURACY = 1;

/** One-time bonus when first earning a shield at each level. */
export const FIRST_CLEAR_BONUS = {
  1: 25,
  2: 30,
  3: 35,
  4: 40,
  5: 45,
  6: 50,
};

const ALL_LEVELS = [1, 2, 3, 4, 5, 6];

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
      .filter((l) => ALL_LEVELS.includes(l));
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
  if (!q.length) return 1;
  return /** @type {DifficultyLevel} */ (Math.min(6, Math.max(...q) + 1));
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
  return /** @type {DifficultyLevel} */ (Math.min(6, Math.max(1, Math.round(total / count))));
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
    if (level >= 6) return 'Perfect run — Level 6 shield earned!';
    const nextLevel = /** @type {DifficultyLevel} */ (level + 1);
    return `Perfect! Level ${level} shield earned. Ready for Level ${nextLevel}?`;
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
  return ALL_LEVELS
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
