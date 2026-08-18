import { initDrillSession } from './drill-session.js';

/** @typedef {import('./difficulty.js').DifficultyLevel} DifficultyLevel */

export const ANGLES_LAB = {
  unitId: 'angles-shapes-lab',
  topicId: 'angles',
  xpPerCorrect: 4,
};

/** @param {DifficultyLevel} level */
export function sessionSize(level) {
  return 10;
}

/** @param {DifficultyLevel} level */
export function makeAnglesQuestion(level) {
  if (level === 1) {
    const kind = pick([
      'shape-sides',
      'right-angle',
      'square-properties',
      'triangle-type',
      'rectangle-vs-square',
    ]);
    if (kind === 'shape-sides') {
      const shapes = [
        { name: 'triangle', sides: 3 },
        { name: 'square', sides: 4 },
        { name: 'pentagon', sides: 5 },
        { name: 'hexagon', sides: 6 },
        { name: 'heptagon', sides: 7 },
        { name: 'octagon', sides: 8 },
      ];
      const s = pick(shapes);
      return {
        prompt: `How many sides does a ${s.name} have?`,
        answer: s.sides,
        options: shuffleNumeric([s.sides, s.sides + 1, Math.max(3, s.sides - 1), s.sides + 2]),
      };
    }
    if (kind === 'right-angle') {
      return {
        prompt: 'How many degrees in a right angle?',
        answer: 90,
        options: shuffleNumeric([90, 45, 180, 360]),
      };
    }
    if (kind === 'square-properties') {
      return {
        prompt: 'How many equal sides does a square have?',
        answer: 4,
        options: shuffleNumeric([4, 2, 3, 6]),
      };
    }
    if (kind === 'triangle-type') {
      return {
        prompt: 'A shape with 3 sides and 3 angles is a __',
        answer: 'triangle',
        options: shuffle([
          { label: 'Triangle', value: 'triangle' },
          { label: 'Square', value: 'square' },
          { label: 'Rectangle', value: 'rectangle' },
        ]),
      };
    }
    return {
      prompt: 'Which shape has 4 equal sides AND 4 right angles?',
      answer: 'square',
      options: shuffle([
        { label: 'Square', value: 'square' },
        { label: 'Rectangle', value: 'rectangle' },
        { label: 'Rhombus', value: 'rhombus' },
      ]),
    };
  }

  if (level === 2) {
    const kind = pick([
      'acute-or-obtuse',
      'angle-sum-triangle',
      'parallel-lines',
      'quadrilateral-angles',
      'protractor-read',
    ]);
    if (kind === 'acute-or-obtuse') {
      const angle = pick([35, 45, 60, 120, 130, 150]);
      const type = angle < 90 ? 'acute' : 'obtuse';
      return {
        prompt: `A ${angle}° angle is __`,
        answer: type,
        options: shuffle([
          { label: 'Acute', value: 'acute' },
          { label: 'Right', value: 'right' },
          { label: 'Obtuse', value: 'obtuse' },
        ]),
      };
    }
    if (kind === 'angle-sum-triangle') {
      const a = pick([40, 50, 60, 70]);
      const b = pick([40, 50, 60]);
      const c = 180 - a - b;
      if (c <= 0) return makeAnglesQuestion(level);
      return {
        prompt: `Two angles in a triangle are ${a}° and ${b}°. What is the third angle?`,
        answer: c,
        options: shuffleNumeric([c, c + 10, Math.max(10, c - 10), 180 - c]),
      };
    }
    if (kind === 'parallel-lines') {
      return {
        prompt: 'When a line crosses two parallel lines, matching (corresponding) angles are __',
        answer: 'equal',
        options: shuffle([
          { label: 'Equal', value: 'equal' },
          { label: 'Double', value: 'double' },
          { label: 'Always 90°', value: 'right' },
        ]),
      };
    }
    if (kind === 'quadrilateral-angles') {
      return {
        prompt: 'What is the sum of angles in any quadrilateral?',
        answer: 360,
        options: shuffleNumeric([360, 180, 270, 90]),
      };
    }
    const angle = pick([30, 45, 60, 75]);
    return {
      prompt: `Granny's protractor shows ${angle}°. What type of angle is this?`,
      answer: 'acute',
      options: shuffle([
        { label: 'Acute', value: 'acute' },
        { label: 'Right', value: 'right' },
        { label: 'Obtuse', value: 'obtuse' },
      ]),
    };
  }

  const kind = pick([
    'straight-line',
    'full-turn',
    'missing-quadrilateral',
    'reflex',
    'symmetry',
  ]);
  if (kind === 'straight-line') {
    const a = pick([35, 42, 55, 68, 72]);
    const b = 180 - a;
    return {
      prompt: `Two angles on a straight line are ${a}° and ?°. What is the missing angle?`,
      answer: b,
      options: shuffleNumeric([b, b + 10, Math.max(10, b - 10), 180]),
    };
  }
  if (kind === 'full-turn') {
    return {
      prompt: 'How many degrees in a full turn?',
      answer: 360,
      options: shuffleNumeric([360, 180, 270, 90]),
    };
  }
  if (kind === 'missing-quadrilateral') {
    const a = pick([80, 90, 100]);
    const b = pick([70, 85, 95]);
    const c = pick([60, 75, 90]);
    const d = 360 - a - b - c;
    if (d <= 0 || d >= 180) return makeAnglesQuestion(level);
    return {
      prompt: `Three angles in a quadrilateral are ${a}°, ${b}° and ${c}°. What is the fourth?`,
      answer: d,
      options: shuffleNumeric([d, d + 15, Math.max(10, d - 15), 360 - d]),
    };
  }
  if (kind === 'reflex') {
    return {
      prompt: 'An angle greater than 180° but less than 360° is called __',
      answer: 'reflex',
      options: shuffle([
        { label: 'Reflex', value: 'reflex' },
        { label: 'Acute', value: 'acute' },
        { label: 'Obtuse', value: 'obtuse' },
      ]),
    };
  }
  const shape = pick(['square', 'equilateral triangle', 'regular hexagon']);
  const lines = shape === 'square' ? 4 : shape === 'equilateral triangle' ? 3 : 6;
  return {
    prompt: `How many lines of symmetry does a ${shape} have?`,
    answer: lines,
    options: shuffleNumeric([lines, lines + 1, Math.max(1, lines - 1), lines + 2]),
  };
}

/** @param {number[]} nums */
function shuffleNumeric(nums) {
  const uniq = [...new Set(nums.filter((n) => n > 0))];
  while (uniq.length < 3) uniq.push(uniq[0] + uniq.length);
  return shuffle(uniq.slice(0, 4).map((n) => ({ label: String(n), value: n })));
}

/** @param {unknown[]} arr */
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** @param {unknown[]} arr */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   difficultyLevel: DifficultyLevel,
 *   onAwardXp: (amount: number) => number|void,
 *   onSessionComplete?: (accuracy: number) => void,
 *   onHome: () => void,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 * }} callbacks
 * @returns {() => void}
 */
export function initAnglesShapes(host, callbacks) {
  return initDrillSession(host, {
    title: 'Angles & Shapes',
    missionTag: 'Space · Geometry',
    quizTag: 'Angles, sides & symmetry',
    difficultyLevel: callbacks.difficultyLevel,
    sessionSize: sessionSize(callbacks.difficultyLevel),
    xpPerCorrect: ANGLES_LAB.xpPerCorrect,
    makeQuestion: makeAnglesQuestion,
    onAwardXp: callbacks.onAwardXp,
    onSessionComplete({ accuracy }) {
      callbacks.onSessionComplete?.(accuracy);
    },
    onHome: callbacks.onHome,
    showToast: callbacks.showToast,
    optionClass: 'angles-opt',
  });
}
