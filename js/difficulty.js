/** @typedef {1|2|3} DifficultyLevel */

export const DIFFICULTY = {
  min: 1,
  max: 3,
  default: 3,
  /** @type {Record<DifficultyLevel, number>} Forge XP multiplier per training level. */
  xpMultiplier: {
    1: 1,
    2: 1.5,
    3: 2,
  },
  /** @type {Record<DifficultyLevel, { grade: string, title: string }>} */
  labels: {
    1: { grade: 'Year 3', title: 'Level 1' },
    2: { grade: 'Year 4', title: 'Level 2' },
    3: { grade: 'Years 5–6', title: 'Level 3' },
  },
};

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
  return m === 1 ? '1× XP' : m === 2 ? '2× XP' : `${m}× XP`;
}

/** @param {DifficultyLevel} level — tag shown during training sessions. */
export function difficultyTrainingTag(level) {
  return `Level ${level} · ${xpMultiplierLabel(level)}`;
}

/** @param {unknown} raw @returns {DifficultyLevel} */
export function normalizeDifficultyLevel(raw) {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return DIFFICULTY.default;
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
