/** @typedef {import('./difficulty.js').DifficultyLevel} DifficultyLevel */

/** Modules that track per-level qualifications. */
export const TRAINING_MODULE_IDS = [
  'times-tables',
  'place-value-siege',
  'measurement-length',
  'fractions',
  'angles',
  'maths-quest',
];

/** Accuracy (0–1) needed to qualify at a level. */
export const QUALIFY_ACCURACY = 0.8;

/** One-time bonus when first qualifying at each level. */
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
export function recordLevelQualification(mastery, moduleId, level, accuracy) {
  const next = { ...mastery, [moduleId]: [...(mastery[moduleId] ?? [])] };
  const qualified = accuracy >= QUALIFY_ACCURACY;
  const already = next[moduleId].includes(level);
  let newlyQualified = false;
  let firstClearBonus = 0;

  if (qualified && !already) {
    next[moduleId] = [...next[moduleId], level].sort((a, b) => a - b);
    newlyQualified = true;
    firstClearBonus = FIRST_CLEAR_BONUS[level] ?? 0;
  }

  const nudge = buildNudge(next, moduleId, level, accuracy, newlyQualified);

  return {
    mastery: next,
    qualified,
    newlyQualified,
    firstClearBonus,
    nudge,
  };
}

/**
 * @param {LevelMasterySave} mastery
 * @param {string} moduleId
 * @param {DifficultyLevel} level
 * @param {number} accuracy
 * @param {boolean} newlyQualified
 */
function buildNudge(mastery, moduleId, level, accuracy, newlyQualified) {
  if (accuracy < QUALIFY_ACCURACY) return null;
  if (level >= 3) {
    return newlyQualified
      ? 'Level 3 qualified — top marks, soldier!'
      : null;
  }
  const nextLevel = /** @type {DifficultyLevel} */ (level + 1);
  if (newlyQualified) {
    return `Level ${level} cleared! Bump to Level ${nextLevel} for bigger XP payouts.`;
  }
  if (accuracy >= 0.9 && !isQualifiedAt(mastery, moduleId, nextLevel)) {
    return `Sharp shooting at Level ${level}. Level ${nextLevel} earns more XP per answer.`;
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
          title="${qualified.has(n) ? `Qualified at level ${n}` : `Level ${n} not yet qualified`}"
        >
          <img class="gb-level-shield-img" src="${LEVEL_SHIELD_SRC}" width="64" height="72" alt="" aria-hidden="true" />
          <span class="gb-level-shield-num">${n}</span>
        </span>`
    )
    .join('');
}
