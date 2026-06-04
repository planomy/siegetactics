/**
 * Maths Quest — problem-solving set bank.
 *
 * Add new sets to QUEST_SETS. Each set has exactly 10 problems.
 * Filter by `level` (1 = Year 3, 2 = Year 4, 3 = Years 5–6).
 *
 * @typedef {1|2|3} QuestLevel
 * @typedef {'choice'|'numeric'} QuestKind
 *
 * @typedef {{
 *   prompt: string,
 *   kind: QuestKind,
 *   options?: { label: string, value: number|string }[],
 *   answer: number|string,
 *   hint?: string,
 * }} QuestProblem
 *
 * @typedef {{
 *   id: string,
 *   level: QuestLevel,
 *   title: string,
 *   subtitle: string,
 *   problems: QuestProblem[],
 * }} QuestSet
 */

/** @type {QuestSet[]} */
export const QUEST_SETS = [
  {
    id: 'quest-l1-fence-patrol',
    level: 1,
    title: 'Fence Patrol',
    subtitle: 'Counting & simple logic',
    problems: [
      {
        prompt: 'Granny sees 4 aliens on the left fence and 3 on the right. How many aliens in total?',
        kind: 'choice',
        options: [
          { label: '6', value: 6 },
          { label: '7', value: 7 },
          { label: '8', value: 8 },
          { label: '12', value: 12 },
        ],
        answer: 7,
      },
      {
        prompt: 'What number comes next? 5, 10, 15, 20, __',
        kind: 'numeric',
        answer: 25,
        hint: 'Add the same amount each time.',
      },
      {
        prompt: 'A turret costs 10 coins. You buy 2. How many coins do you spend?',
        kind: 'choice',
        options: [
          { label: '12', value: 12 },
          { label: '20', value: 20 },
          { label: '30', value: 30 },
          { label: '8', value: 8 },
        ],
        answer: 20,
      },
      {
        prompt: 'Which shape has 4 equal sides?',
        kind: 'choice',
        options: [
          { label: 'Triangle', value: 'triangle' },
          { label: 'Square', value: 'square' },
          { label: 'Circle', value: 'circle' },
          { label: 'Pentagon', value: 'pentagon' },
        ],
        answer: 'square',
      },
      {
        prompt: 'Half of 18 is __',
        kind: 'numeric',
        answer: 9,
      },
      {
        prompt: 'Aliens march in pairs. 6 pairs pass the gate. How many aliens?',
        kind: 'choice',
        options: [
          { label: '8', value: 8 },
          { label: '10', value: 10 },
          { label: '12', value: 12 },
          { label: '14', value: 14 },
        ],
        answer: 12,
      },
      {
        prompt: '3 × 4 = ?',
        kind: 'numeric',
        answer: 12,
      },
      {
        prompt: 'You have 15 bolts. Granny gives you 6 more. How many now?',
        kind: 'choice',
        options: [
          { label: '19', value: 19 },
          { label: '20', value: 20 },
          { label: '21', value: 21 },
          { label: '9', value: 9 },
        ],
        answer: 21,
      },
      {
        prompt: 'Odd one out: 2, 4, 6, 9',
        kind: 'choice',
        options: [
          { label: '2', value: 2 },
          { label: '4', value: 4 },
          { label: '6', value: 6 },
          { label: '9', value: 9 },
        ],
        answer: 9,
        hint: 'Three are even; one is not.',
      },
      {
        prompt: 'A fence section is 5 m long. How long are 3 sections end to end?',
        kind: 'numeric',
        answer: 15,
        hint: 'Multiply length by number of sections.',
      },
    ],
  },
  {
    id: 'quest-l2-signal-decode',
    level: 2,
    title: 'Signal Decode',
    subtitle: 'Multi-step & patterns',
    problems: [
      {
        prompt: 'Radar shows 24 aliens split equally into 3 squads. How many per squad?',
        kind: 'numeric',
        answer: 8,
      },
      {
        prompt: 'Pattern: 3, 6, 12, 24, __. What comes next?',
        kind: 'choice',
        options: [
          { label: '30', value: 30 },
          { label: '36', value: 36 },
          { label: '48', value: 48 },
          { label: '72', value: 72 },
        ],
        answer: 48,
        hint: 'Each number doubles.',
      },
      {
        prompt: 'A box holds 8 cupcakes. Granny loads 5 boxes for the nuke cache. Total cupcakes?',
        kind: 'numeric',
        answer: 40,
      },
      {
        prompt: 'Which fraction is the same as 1/2?',
        kind: 'choice',
        options: [
          { label: '2/5', value: '2/5' },
          { label: '3/6', value: '3/6' },
          { label: '1/3', value: '1/3' },
          { label: '2/3', value: '2/3' },
        ],
        answer: '3/6',
      },
      {
        prompt: 'Turret A fires every 4 s. Turret B every 6 s. They fire together now — in how many seconds next?',
        kind: 'numeric',
        answer: 12,
        hint: 'Find a number both 4 and 6 divide into.',
      },
      {
        prompt: 'Perimeter of a square with side 7 cm?',
        kind: 'choice',
        options: [
          { label: '14 cm', value: 14 },
          { label: '21 cm', value: 21 },
          { label: '28 cm', value: 28 },
          { label: '49 cm', value: 49 },
        ],
        answer: 28,
      },
      {
        prompt: '847 − 259 = ?',
        kind: 'numeric',
        answer: 588,
      },
      {
        prompt: 'Three friends share 45 coins equally. Each gets __ coins.',
        kind: 'numeric',
        answer: 15,
      },
      {
        prompt: 'Logic: All scouts wear helmets. Zara is a scout. What must be true?',
        kind: 'choice',
        options: [
          { label: 'Zara wears a helmet', value: 'helmet' },
          { label: 'Zara has no helmet', value: 'no-helmet' },
          { label: 'Only scouts wear helmets', value: 'only' },
          { label: 'Helmets are optional', value: 'optional' },
        ],
        answer: 'helmet',
      },
      {
        prompt: 'A recipe needs 250 mL milk. You make 4 batches. Total milk (mL)?',
        kind: 'numeric',
        answer: 1000,
      },
    ],
  },
  {
    id: 'quest-l3-porch-standoff',
    level: 3,
    title: 'Porch Standoff',
    subtitle: 'Reasoning & tricky problems',
    problems: [
      {
        prompt: 'Alien A arrives every 8 s, Alien B every 12 s. Both spawn at 0 s. Next time together (after 0)?',
        kind: 'numeric',
        answer: 24,
      },
      {
        prompt: 'A number is doubled, then 7 is added. The result is 31. What was the number?',
        kind: 'numeric',
        answer: 12,
        hint: 'Work backwards: subtract 7, then halve.',
      },
      {
        prompt: 'Three turrets in a row: left range 90, middle 110, right 90. An alien walks the centre lane. Which turrets can hit it at the midpoint?',
        kind: 'choice',
        options: [
          { label: 'Left only', value: 'left' },
          { label: 'Middle only', value: 'middle' },
          { label: 'Middle and both sides', value: 'all' },
          { label: 'None', value: 'none' },
        ],
        answer: 'middle',
        hint: 'Only the middle turret sits on the centre lane pad.',
      },
      {
        prompt: '25% of 240 = ?',
        kind: 'numeric',
        answer: 60,
      },
      {
        prompt: 'Sequence: 1, 1, 2, 3, 5, 8, __ (each term is the sum of the two before it)',
        kind: 'numeric',
        answer: 13,
      },
      {
        prompt: 'Four boxes: red, blue, green, yellow. Red is left of blue. Green is right of yellow. Yellow is left of red. Order left → right?',
        kind: 'choice',
        options: [
          { label: 'Yellow, Red, Blue, Green', value: 'yrbg' },
          { label: 'Red, Yellow, Blue, Green', value: 'rybg' },
          { label: 'Yellow, Blue, Red, Green', value: 'ybrg' },
          { label: 'Green, Yellow, Red, Blue', value: 'gyrb' },
        ],
        answer: 'yrbg',
      },
      {
        prompt: '3.45 + 2.7 = ? (give your answer as a decimal)',
        kind: 'numeric',
        answer: 6.15,
      },
      {
        prompt: 'A map scale is 1 cm : 5 m. Two trees are 4 cm apart on the map. Real distance (m)?',
        kind: 'numeric',
        answer: 20,
      },
      {
        prompt: 'Logic: If it rains, practice moves indoors. Practice is outdoors. What can you conclude?',
        kind: 'choice',
        options: [
          { label: 'It is raining', value: 'rain' },
          { label: 'It is not raining', value: 'no-rain' },
          { label: 'Practice is cancelled', value: 'cancel' },
          { label: 'Cannot tell', value: 'unknown' },
        ],
        answer: 'no-rain',
        hint: 'Rain would force indoors — but practice is outside.',
      },
      {
        prompt: 'Place value: 4 thousands, 0 hundreds, 6 tens, 3 ones. The number is __',
        kind: 'numeric',
        answer: 4063,
      },
    ],
  },
];

/** @param {QuestLevel} level */
export function getQuestSetsForLevel(level) {
  return QUEST_SETS.filter((set) => set.level === level);
}

/** @param {string} id */
export function getQuestSet(id) {
  return QUEST_SETS.find((set) => set.id === id) ?? null;
}
