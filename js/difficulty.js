/** @typedef {1|2|3|4|5|6} DifficultyLevel */

export const DIFFICULTY = {
  min: 1,
  max: 6,
  default: 2,
  /** @type {DifficultyLevel[]} */
  levels: [1, 2, 3, 4, 5, 6],
  /**
   * @type {Record<DifficultyLevel, number>} Forge XP multiplier per level. Kept small so every child
   * earns well at the level that suits them; harder levels only add a little bonus.
   */
  xpMultiplier: {
    1: 1,
    2: 1.05,
    3: 1.1,
    4: 1.15,
    5: 1.2,
    6: 1.25,
  },
  /** @type {Record<DifficultyLevel, { grade: string, title: string }>} Year groups are for teachers; kids see the level number. */
  labels: {
    1: { grade: 'Year 2', title: 'Level 1' },
    2: { grade: 'Year 3', title: 'Level 2' },
    3: { grade: 'Year 4', title: 'Level 3' },
    4: { grade: 'Year 5', title: 'Level 4' },
    5: { grade: 'Year 6', title: 'Level 5' },
    6: { grade: 'Year 7', title: 'Level 6' },
  },
};

/** @param {unknown} n @returns {n is DifficultyLevel} */
export function isDifficultyLevel(n) {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6;
}

/**
 * Levels 2–5 reuse the original four-level generators (Years 3–6).
 * @param {number} level @returns {1|2|3|4}
 */
export function legacyLevel(level) {
  return /** @type {1|2|3|4} */ (Math.min(4, Math.max(1, Math.round(level) - 1)));
}

/** @param {DifficultyLevel} level */
export function xpMultiplierFor(level) {
  return DIFFICULTY.xpMultiplier[level] ?? 1;
}

/** @param {number} base @param {DifficultyLevel} level */
export function scaleTrainingXp(base, level) {
  return Math.round(base * xpMultiplierFor(level));
}

/** @param {DifficultyLevel} level */
export function xpMultiplierLabel(level) {
  const m = xpMultiplierFor(level);
  return m === 1 ? '1× XP' : `+${Math.round((m - 1) * 100)}% XP`;
}

/** @param {DifficultyLevel} level — tag shown during training sessions. */
export function difficultyTrainingTag(level) {
  return `Level ${level} · ${xpMultiplierLabel(level)}`;
}

/** @param {unknown} raw @returns {DifficultyLevel} */
export function normalizeDifficultyLevel(raw) {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return isDifficultyLevel(n) ? n : /** @type {DifficultyLevel} */ (DIFFICULTY.default);
}

/** @param {DifficultyLevel} level */
export function difficultyLabel(level) {
  const info = DIFFICULTY.labels[level];
  return `${info.title} · ${info.grade}`;
}

/** @param {DifficultyLevel} level */
export function difficultyGrade(level) {
  return DIFFICULTY.labels[level].grade;
}
