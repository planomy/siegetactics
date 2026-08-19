/**
 * Maths Quest — problem-solving set bank.
 *
 * Add new sets to QUEST_SETS. Each set has exactly 10 problems.
 * Filter by `level` (1 = Year 3, 2 = Year 4, 3 = Year 5, 4 = Year 6).
 *
 * @typedef {1|2|3|4} QuestLevel
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

/** @param {number} min @param {number} max */
function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** @param {unknown[]} values */
function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** @param {string} prompt @param {number|string} answer @param {string} [hint] */
function numeric(prompt, answer, hint) {
  return { prompt, kind: 'numeric', answer, ...(hint ? { hint } : {}) };
}

/** @param {string} prompt @param {number} answer @param {number[]} wrongs @param {string} [hint] */
function numericChoice(prompt, answer, wrongs, hint) {
  const values = [...new Set([answer, ...wrongs])];
  let offset = 1;
  while (values.length < 4) {
    const fallback = answer + offset++;
    if (!values.includes(fallback)) values.push(fallback);
  }
  return {
    prompt,
    kind: 'choice',
    options: shuffle(values.slice(0, 4).map((value) => ({ label: String(value), value }))),
    answer,
    ...(hint ? { hint } : {}),
  };
}

/** @returns {QuestProblem[]} */
function makeLevel1Pool() {
  const a = rand(12, 48);
  const b = rand(6, 35);
  const large = rand(45, 99);
  const small = rand(8, Math.min(39, large - 1));
  const table = rand(2, 5);
  const factor = rand(2, 10);
  const divisor = rand(2, 5);
  const quotient = rand(2, 10);
  const half = rand(4, 20);
  const quarter = rand(2, 12);
  const side = rand(3, 12);
  const dollars = rand(3, 18);
  const hour = rand(1, 10);
  const step = rand(2, 9);
  const start = rand(1, 20);
  const hundreds = rand(2, 9);
  const tens = rand(1, 9);
  const ones = rand(1, 9);
  const metres = rand(1, 8);
  return [
    numeric(`Granny has ${a} bolts and finds ${b} more. How many bolts altogether?`, a + b),
    numeric(`There are ${large} aliens. ${small} retreat. How many remain?`, large - small),
    numericChoice(`${table} squads have ${factor} aliens each. How many aliens?`, table * factor, [table + factor, table * factor + table, table * factor - table]),
    numeric(`${divisor * quotient} cupcakes are shared equally between ${divisor} defenders. How many each?`, quotient),
    numeric(`What is half of ${half * 2}?`, half),
    numericChoice(`What is one quarter of ${quarter * 4}?`, quarter, [quarter * 2, quarter + 4, quarter * 4]),
    numeric(`A square shield has sides of ${side} cm. What is its perimeter in cm?`, side * 4, 'A square has four equal sides.'),
    numeric(`A repair kit costs $${dollars}. Granny buys 3. What is the total cost in dollars?`, dollars * 3),
    numericChoice(`Training starts at ${hour}:00 and lasts 2 hours. What hour does it finish?`, hour + 2, [hour + 1, hour + 3, hour + 4]),
    numeric(`Continue the pattern: ${start}, ${start + step}, ${start + step * 2}, ${start + step * 3}, __`, start + step * 4, `Add ${step} each time.`),
    numeric(`What number has ${hundreds} hundreds, ${tens} tens and ${ones} ones?`, hundreds * 100 + tens * 10 + ones),
    numeric(`${metres} metres equals how many centimetres?`, metres * 100),
  ];
}

/** @returns {QuestProblem[]} */
function makeLevel2Pool() {
  const a = rand(120, 480);
  const b = rand(80, 390);
  const large = rand(500, 999);
  const small = rand(120, 490);
  const table = rand(6, 9);
  const factor = rand(4, 12);
  const divisor = rand(3, 9);
  const quotient = rand(5, 14);
  const fractionDenom = [3, 4, 5][rand(0, 2)];
  const fractionPart = rand(2, 10);
  const width = rand(4, 12);
  const height = rand(3, 9);
  const startHour = rand(1, 8);
  const metres = rand(2, 9);
  const extraCm = rand(1, 9) * 10;
  const roundBase = rand(12, 98) * 10 + rand(1, 9);
  const patternStart = rand(2, 12);
  const patternStep = rand(4, 12);
  return [
    numeric(`${a} defenders join ${b} defenders. How many are there altogether?`, a + b),
    numeric(`${large} aliens were detected. ${small} were stopped. How many remain?`, large - small),
    numericChoice(`${table} rows hold ${factor} traps each. How many traps?`, table * factor, [table + factor, table * factor + table, table * factor - table]),
    numeric(`${divisor * quotient} coins are shared equally among ${divisor} teams. How many per team?`, quotient),
    numeric(`What is 1/${fractionDenom} of ${fractionDenom * fractionPart}?`, fractionPart),
    numericChoice(`Which numerator makes ?/8 equivalent to 1/2?`, 4, [2, 3, 6]),
    numeric(`A rectangle is ${width} m by ${height} m. What is its perimeter in metres?`, 2 * (width + height)),
    numeric(`A supply mat is ${width} m long and ${height} m wide. What is its area in square metres?`, width * height),
    numericChoice(`Patrol begins at ${startHour}:15 and lasts 2 hours 30 minutes. What hour appears in the finish time?`, startHour + 2, [startHour + 1, startHour + 3, startHour + 4], 'The minutes finish at :45.'),
    numeric(`${metres} m ${extraCm} cm equals how many centimetres?`, metres * 100 + extraCm),
    numeric(`Continue the pattern: ${patternStart}, ${patternStart + patternStep}, ${patternStart + patternStep * 2}, __`, patternStart + patternStep * 3),
    numeric(`Round ${roundBase} to the nearest hundred.`, Math.round(roundBase / 100) * 100),
  ];
}

/** @returns {QuestProblem[]} */
function makeLevel3Pool() {
  const whole1 = rand(12, 89);
  const tenths1 = rand(1, 9);
  const whole2 = rand(5, 49);
  const tenths2 = rand(1, 9);
  const percentBase = rand(2, 12) * 20;
  const fractionDenom = [3, 4, 5, 6][rand(0, 3)];
  const fractionNumer = rand(1, fractionDenom - 1);
  const fractionUnit = rand(3, 12);
  const a = rand(4, 15);
  const b = rand(3, 12);
  const c = rand(2, 6);
  const length = rand(5, 14);
  const width = rand(3, 10);
  const height = rand(2, 8);
  const scale = rand(2, 8);
  const mapCm = rand(3, 12);
  const mean = rand(5, 20);
  const offsets = [rand(1, 4), rand(1, 4)];
  const startMinutes = rand(1, 5) * 10;
  const elapsed = rand(3, 8) * 10;
  const finishTotal = 9 * 60 + startMinutes + elapsed;
  const finishTime = `${Math.floor(finishTotal / 60)}:${String(finishTotal % 60).padStart(2, '0')}`;
  const decimalDigit = rand(1, 9);
  const unknown = rand(4, 20);
  const multiplier = rand(2, 6);
  const add = rand(3, 15);
  const itemPrice = rand(8, 20);
  return [
    numeric(`${whole1}.${tenths1} + ${whole2}.${tenths2} = ?`, Number((whole1 + tenths1 / 10 + whole2 + tenths2 / 10).toFixed(1))),
    numeric(`What is 25% of ${percentBase}?`, percentBase / 4),
    numeric(`What is ${fractionNumer}/${fractionDenom} of ${fractionDenom * fractionUnit}?`, fractionNumer * fractionUnit),
    numeric(`Calculate ${a} + ${b} × ${c}.`, a + b * c, 'Multiply before adding.'),
    numeric(`A rectangle is ${length} m by ${width} m. What is its area in square metres?`, length * width),
    numeric(`A crate is ${length} cm long, ${width} cm wide and ${height} cm high. What is its volume in cubic centimetres?`, length * width * height),
    numeric(`Three repair kits cost $${itemPrice} each. How much change is left from $100?`, 100 - itemPrice * 3),
    numeric(`A map uses 1 cm : ${scale} m. Two points are ${mapCm} cm apart. What is the real distance in metres?`, scale * mapCm),
    numeric(`The scores are ${mean - offsets[0]}, ${mean - offsets[1]}, ${mean + offsets[0]} and ${mean + offsets[1]}. What is the mean?`, mean),
    numeric(`A drill starts at 9:${String(startMinutes).padStart(2, '0')} and finishes at ${finishTime}. How many minutes does it last?`, elapsed),
    numericChoice(`In 34.${decimalDigit}2, what is the value of the digit ${decimalDigit}?`, decimalDigit / 10, [decimalDigit, decimalDigit / 100, decimalDigit * 10]),
    numeric(`A number is multiplied by ${multiplier}, then ${add} is added. The result is ${unknown * multiplier + add}. What was the number?`, unknown, `Subtract ${add}, then divide by ${multiplier}.`),
  ];
}

/** @returns {QuestProblem[]} */
function makeLevel4Pool() {
  const startTemp = -rand(1, 8);
  const rise = rand(6, 15);
  const decimalA = rand(12, 45) / 10;
  const decimalB = rand(2, 8);
  const percentBase = rand(4, 18) * 25;
  const a = rand(4, 9);
  const b = rand(6, 15);
  const c = rand(2, 7);
  const d = rand(10, 30);
  const length = rand(8, 18);
  const width = rand(5, 12);
  const ratioA = rand(2, 5);
  const ratioB = rand(2, 5);
  const ratioUnit = rand(4, 12);
  const mean = rand(12, 30);
  const spread = rand(3, 8);
  const startHour = rand(13, 18);
  const startMinute = [0, 10, 20, 30, 40][rand(0, 4)];
  const elapsed = [75, 85, 95, 105, 125][rand(0, 4)];
  const finishTotal = startHour * 60 + startMinute + elapsed;
  const finishTime = `${String(Math.floor(finishTotal / 60)).padStart(2, '0')}:${String(finishTotal % 60).padStart(2, '0')}`;
  const unknown = rand(8, 30);
  const multiplier = rand(3, 8);
  const add = rand(5, 20);
  const decimalDigit = rand(1, 9);
  return [
    numeric(`The temperature is ${startTemp}°C and rises by ${rise}°. What is the new temperature?`, startTemp + rise),
    numeric(`${decimalA} × ${decimalB} = ?`, Number((decimalA * decimalB).toFixed(1))),
    numeric(`What is 20% of ${percentBase}?`, percentBase / 5),
    numericChoice('1/2 + 1/4 is how many quarters?', 3, [2, 4, 6]),
    numeric(`Calculate ${a} × (${b} + ${c}) − ${d}.`, a * (b + c) - d, 'Work inside the brackets first.'),
    numericChoice('Which number is prime?', 29, [27, 33, 39]),
    numeric(`A rectangular defence zone is ${length} m by ${width} m. What is its area in square metres?`, length * width),
    numeric(`${(ratioA + ratioB) * ratioUnit} supplies are shared in the ratio ${ratioA}:${ratioB}. How many go to the first group?`, ratioA * ratioUnit),
    numeric(`The scores are ${mean - spread}, ${mean}, ${mean + spread} and ${mean + spread * 2}. What is the range?`, spread * 3),
    numeric(`A mission starts at ${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')} and finishes at ${finishTime}. How many minutes does it last?`, elapsed),
    numeric(`A number is multiplied by ${multiplier}, then ${add} is added. The result is ${unknown * multiplier + add}. What was the number?`, unknown, `Subtract ${add}, then divide by ${multiplier}.`),
    numericChoice(`In 52.4${decimalDigit}, what is the value of the digit ${decimalDigit}?`, decimalDigit / 100, [decimalDigit, decimalDigit / 10, decimalDigit * 10]),
  ];
}

const QUEST_TITLES = {
  1: ['Fence Sweep', 'Cupcake Convoy', 'Backyard Patrol', 'Bolt Hunt'],
  2: ['Signal Scramble', 'Turret Workshop', 'Alien Intercept', 'Supply Run'],
  3: ['Porch Counterattack', 'Command Bunker', 'Final Defence', 'Night Siege'],
  4: ['Deep Space Defence', 'Command Override', 'Final Frontier', 'Omega Siege'],
};

/**
 * Creates a fresh ten-question mixed set from twelve generators. A template is
 * used at most once per set, so students do not see duplicate question types.
 * @param {QuestLevel} level
 * @returns {QuestSet}
 */
export function createQuestSet(level) {
  const pool = level === 1
    ? makeLevel1Pool()
    : level === 2
      ? makeLevel2Pool()
      : level === 3
        ? makeLevel3Pool()
        : makeLevel4Pool();
  const titleChoices = QUEST_TITLES[level];
  return {
    id: `quest-generated-${level}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    level,
    title: titleChoices[rand(0, titleChoices.length - 1)],
    subtitle: 'Fresh mixed mission · changes every run',
    problems: shuffle(pool).slice(0, 10),
  };
}

/** @param {QuestLevel} level */
export function getQuestSetsForLevel(level) {
  return QUEST_SETS.filter((set) => set.level === level);
}

/** @param {string} id */
export function getQuestSet(id) {
  return QUEST_SETS.find((set) => set.id === id) ?? null;
}
