/**
 * Granny Boom — Siege Tactics
 * Mission definitions (content only — vertical slice uses first mission).
 */

import { SIEGE_DURATION_SEC } from './waves-data.js';
import { normalizeDifficultyLevel } from './difficulty.js';

/** @typedef {import('./difficulty.js').DifficultyLevel} DifficultyLevel */

/** @type {Mission[]} */
export const MISSIONS = [
  {
    id: 'number-place-value-patrol',
    strand: 'number',
    title: 'Place Value Patrol',
    level: 1,
    acCodes: ['AC9M5N01'],
    proficiency: ['problem-solving', 'fluency'],
    opener:
      "Three squads crossed the fence line. Count each group's digits — thousands, then hundreds, then ones — and tell Granny the total headcount before they reach the porch.",
    slots: [
      {
        role: 'Thousands',
        options: ['3', '30', '3000', '300'],
        correctIndex: 2,
      },
      {
        role: 'Hundreds',
        options: ['4', '400', '40', '4000'],
        correctIndex: 1,
      },
      {
        role: 'Ones',
        options: ['7', '70', '707', '700'],
        correctIndex: 0,
      },
    ],
    lockIn: { type: 'exact', value: 3407 },
    rewards: { forgeXp: 40, placementBudget: 90 },
    /** Siege coins earned during combat (not Forge XP). */
    killBudgetXp: 1,
    bossKillBudgetXp: 4,
    waveClearBudgetXp: 10,
    winBonusXp: 60,
    loseBonusXp: 20,
    maxLeaks: 5,
    siegeDurationSec: SIEGE_DURATION_SEC,
    grannyHints: {
      slotWrong: [
        "That digit's in the thousands house — scoot it three places left.",
        'Hundreds sit in the middle. Not tens, not thousands.',
        "Ones are the doorstep digits. Just the 7.",
      ],
      lockInWrong: 'Add your three picks: thousands + hundreds + ones.',
    },
  },
];

/** @type {Record<string, Mission>} */
export const MISSIONS_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

/** Vertical slice entry point */
export const SLICE_MISSION_ID = 'number-place-value-patrol';

export function getMission(id) {
  return MISSIONS_BY_ID[id] ?? null;
}

/**
 * Place Value Patrol forge content scaled by difficulty (Years 3–6).
 * @type {Record<DifficultyLevel, Pick<Mission, 'opener'|'slots'|'lockIn'|'grannyHints'|'rewards'>>}
 */
export const PLACE_VALUE_BY_DIFFICULTY = {
  1: {
    opener:
      'Three squads crossed the fence line. Count each group — hundreds, then tens, then ones — and tell Granny the total headcount.',
    slots: [
      { role: 'Hundreds', options: ['3', '30', '300', '3000'], correctIndex: 0 },
      { role: 'Tens', options: ['4', '40', '400', '4'], correctIndex: 1 },
      { role: 'Ones', options: ['7', '70', '707', '700'], correctIndex: 0 },
    ],
    lockIn: { type: 'exact', value: 347 },
    rewards: { forgeXp: 30, placementBudget: 75 },
    grannyHints: {
      slotWrong: [
        'Hundreds are the middle-big digits — not tens, not thousands.',
        'Tens sit one place left of ones.',
        'Ones are the doorstep digits. Just the 7.',
      ],
      lockInWrong: 'Add your three picks: hundreds + tens + ones.',
    },
  },
  2: {
    opener:
      'Three squads crossed the fence line. Count each group — thousands, then hundreds, then tens — and tell Granny the total headcount.',
    slots: [
      { role: 'Thousands', options: ['3', '30', '3000', '300'], correctIndex: 2 },
      { role: 'Hundreds', options: ['4', '400', '40', '4000'], correctIndex: 1 },
      { role: 'Tens', options: ['5', '50', '500', '5'], correctIndex: 1 },
    ],
    lockIn: { type: 'exact', value: 3450 },
    rewards: { forgeXp: 35, placementBudget: 82 },
    grannyHints: {
      slotWrong: [
        "That digit's in the thousands house — scoot it three places left.",
        'Hundreds sit in the middle. Not tens, not thousands.',
        'Tens are one step left of ones.',
      ],
      lockInWrong: 'Add your three picks: thousands + hundreds + tens.',
    },
  },
  3: {
    opener:
      "Three squads crossed the fence line. Count each group's digits — thousands, then hundreds, then ones — and tell Granny the total headcount before they reach the porch.",
    slots: [
      { role: 'Thousands', options: ['3', '30', '3000', '300'], correctIndex: 2 },
      { role: 'Hundreds', options: ['4', '400', '40', '4000'], correctIndex: 1 },
      { role: 'Ones', options: ['7', '70', '707', '700'], correctIndex: 0 },
    ],
    lockIn: { type: 'exact', value: 3407 },
    rewards: { forgeXp: 40, placementBudget: 90 },
    grannyHints: {
      slotWrong: [
        "That digit's in the thousands house — scoot it three places left.",
        'Hundreds sit in the middle. Not tens, not thousands.',
        "Ones are the doorstep digits. Just the 7.",
      ],
      lockInWrong: 'Add your three picks: thousands + hundreds + ones.',
    },
  },
};

/**
 * @param {string} id
 * @param {DifficultyLevel|unknown} [difficultyLevel]
 */
export function getMissionForDifficulty(id, difficultyLevel) {
  const base = getMission(id);
  if (!base) return null;
  const level = normalizeDifficultyLevel(difficultyLevel);
  if (id !== SLICE_MISSION_ID) return base;
  const variant = PLACE_VALUE_BY_DIFFICULTY[level];
  return { ...base, ...variant, level };
}
