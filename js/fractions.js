import { initDrillSession } from './drill-session.js';

/** @typedef {import('./difficulty.js').DifficultyLevel} DifficultyLevel */

export const FRACTIONS_LAB = {
  unitId: 'fractions-fence',
  topicId: 'fractions',
  xpPerCorrect: 4,
};

/** @param {DifficultyLevel} level */
export function sessionSize(level) {
  return 10;
}

/** @param {number} n @param {number} d */
function frac(n, d) {
  return `${n}/${d}`;
}

/** @param {number} n @param {number} d */
function fracVal(n, d) {
  return n / d;
}

/**
 * @param {{ n: number, d: number }} a
 * @param {{ n: number, d: number }} b
 */
function compareFracs(a, b) {
  return fracVal(a.n, a.d) >= fracVal(b.n, b.d) ? a : b;
}

/** @param {DifficultyLevel} level */
export function makeFractionQuestion(level) {
  if (level === 1) {
    const kind = pick([
      'half-vs-quarter',
      'unit-compare-same-denom',
      'half-of-number',
      'quarter-of-number',
      'shaded-parts',
    ]);
    if (kind === 'half-vs-quarter') {
      const bigger = compareFracs({ n: 1, d: 2 }, { n: 1, d: 4 });
      return {
        prompt: 'Which is larger: 1/2 or 1/4?',
        answer: frac(bigger.n, bigger.d),
        options: shuffle([
          { label: '1/2', value: '1/2' },
          { label: '1/4', value: '1/4' },
        ]),
      };
    }
    if (kind === 'unit-compare-same-denom') {
      const d = pick([4, 6, 8]);
      const a = pick([1, 2]);
      const b = a + pick([1, 2]);
      if (b >= d) return makeFractionQuestion(level);
      const bigger = compareFracs({ n: a, d }, { n: b, d });
      return {
        prompt: `Which is larger: ${frac(a, d)} or ${frac(b, d)}?`,
        answer: frac(bigger.n, bigger.d),
        options: shuffle([
          { label: frac(a, d), value: frac(a, d) },
          { label: frac(b, d), value: frac(b, d) },
        ]),
      };
    }
    if (kind === 'half-of-number') {
      const n = pick([4, 6, 8, 10, 12, 16, 20]);
      return {
        prompt: `What is half of ${n}?`,
        answer: n / 2,
        options: shuffleNumeric([n / 2, n / 2 + 1, Math.max(1, n / 2 - 1), n / 4]),
      };
    }
    if (kind === 'quarter-of-number') {
      const n = pick([8, 12, 16, 20, 24]);
      return {
        prompt: `What is one quarter of ${n}?`,
        answer: n / 4,
        options: shuffleNumeric([n / 4, n / 2, n / 4 + 1, Math.max(1, n / 4 - 1)]),
      };
    }
    const total = pick([2, 3, 4, 6, 8]);
    const shaded = pick([1, total - 1]);
    const optionValues = [
      frac(shaded, total),
      frac(total, shaded),
      frac(Math.max(1, total - shaded), total),
      frac(shaded, total + 1),
    ];
    const seen = new Set();
    return {
      prompt: `A bar is split into ${total} equal parts. ${shaded} part${shaded > 1 ? 's are' : ' is'} shaded. What fraction is shaded?`,
      answer: frac(shaded, total),
      options: shuffle(optionValues
        .filter((value) => {
          if (seen.has(value)) return false;
          seen.add(value);
          return true;
        })
        .map((value) => ({ label: value, value }))),
    };
  }

  if (level === 2) {
    const kind = pick([
      'equivalent',
      'same-denom-add',
      'compare-same-denom',
      'third-of-number',
      'missing-numerator',
    ]);
    if (kind === 'equivalent') {
      const pairs = [
        { num: 1, den: 2, eq: 2, eqDen: 4 },
        { num: 1, den: 2, eq: 3, eqDen: 6 },
        { num: 2, den: 4, eq: 1, eqDen: 2 },
        { num: 3, den: 4, eq: 6, eqDen: 8 },
      ];
      const p = pick(pairs);
      return {
        prompt: `${frac(p.num, p.den)} = ?/${p.eqDen}`,
        answer: p.eq,
        options: shuffleNumeric([p.eq, p.eq + 1, Math.max(1, p.eq - 1), p.num]),
      };
    }
    if (kind === 'same-denom-add') {
      const d = pick([4, 5, 6, 8]);
      const a = pick([1, 2]);
      const b = pick([1, 2]);
      if (a + b >= d) return makeFractionQuestion(level);
      return {
        prompt: `${frac(a, d)} + ${frac(b, d)} = ?/${d}`,
        answer: a + b,
        options: shuffleNumeric([a + b, a + b + 1, Math.max(1, a + b - 1), a + b + 2]),
      };
    }
    if (kind === 'compare-same-denom') {
      const d = pick([5, 6, 8, 10]);
      const a = pick([1, 2, 3]);
      const b = a + pick([1, 2]);
      if (b >= d) return makeFractionQuestion(level);
      const bigger = compareFracs({ n: a, d }, { n: b, d });
      return {
        prompt: `Which is larger: ${frac(a, d)} or ${frac(b, d)}?`,
        answer: frac(bigger.n, bigger.d),
        options: shuffle([
          { label: frac(a, d), value: frac(a, d) },
          { label: frac(b, d), value: frac(b, d) },
        ]),
      };
    }
    if (kind === 'third-of-number') {
      const n = pick([9, 12, 15, 18, 21, 24]);
      return {
        prompt: `What is one third of ${n}?`,
        answer: n / 3,
        options: shuffleNumeric([n / 3, n / 2, n / 3 + 1, Math.max(1, n / 3 - 1)]),
      };
    }
    const d = pick([4, 6, 8]);
    const num = pick([1, 2, 3]);
    return {
      prompt: `Which fraction equals ${frac(num, d)}?`,
      answer: frac(num * 2, d * 2),
      options: shuffle([
        { label: frac(num * 2, d * 2), value: frac(num * 2, d * 2) },
        { label: frac(num, d * 2), value: frac(num, d * 2) },
        { label: frac(num + 1, d), value: frac(num + 1, d) },
      ]),
    };
  }

  if (level === 4) {
    const kind = pick([
      'add-related-denom',
      'subtract-related-denom',
      'fraction-of-quantity',
      'order-fractions',
      'mixed-number',
    ]);
    if (kind === 'add-related-denom') {
      const problem = pick([
        { prompt: '1/2 + 1/4 = ?', answer: '3/4', wrongs: ['2/6', '2/4', '1/8'] },
        { prompt: '2/3 + 1/6 = ?', answer: '5/6', wrongs: ['3/9', '3/6', '4/6'] },
        { prompt: '3/4 + 1/8 = ?', answer: '7/8', wrongs: ['4/12', '4/8', '5/8'] },
        { prompt: '2/5 + 3/10 = ?', answer: '7/10', wrongs: ['5/15', '5/10', '6/10'] },
      ]);
      return fractionChoice(problem.prompt, problem.answer, problem.wrongs);
    }
    if (kind === 'subtract-related-denom') {
      const problem = pick([
        { prompt: '3/4 − 1/2 = ?', answer: '1/4', wrongs: ['2/2', '2/4', '1/2'] },
        { prompt: '5/6 − 1/3 = ?', answer: '1/2', wrongs: ['4/3', '4/6', '2/6'] },
        { prompt: '7/8 − 1/4 = ?', answer: '5/8', wrongs: ['6/4', '6/8', '3/8'] },
      ]);
      return fractionChoice(problem.prompt, problem.answer, problem.wrongs);
    }
    if (kind === 'fraction-of-quantity') {
      const problem = pick([
        { n: 5, d: 6, qty: 42 },
        { n: 7, d: 8, qty: 48 },
        { n: 3, d: 5, qty: 75 },
        { n: 4, d: 9, qty: 81 },
      ]);
      const answer = (problem.n / problem.d) * problem.qty;
      return {
        prompt: `What is ${problem.n}/${problem.d} of ${problem.qty}?`,
        answer,
        options: shuffleNumeric([answer, answer + problem.qty / problem.d, answer - problem.qty / problem.d, problem.qty / problem.d]),
      };
    }
    if (kind === 'order-fractions') {
      return fractionChoice(
        'Which list is ordered from smallest to largest?',
        '1/4, 1/2, 3/4',
        ['3/4, 1/2, 1/4', '1/2, 1/4, 3/4', '1/4, 3/4, 1/2']
      );
    }
    return fractionChoice('1 1/2 + 3/4 = ?', '2 1/4', ['1 4/6', '1 3/4', '2 3/4']);
  }

  const kind = pick([
    'compare-diff-denom',
    'add-same-denom',
    'fraction-of-quantity',
    'order-on-numberline',
    'subtract-same-denom',
  ]);
  if (kind === 'compare-diff-denom') {
    const pairs = [
      [{ n: 1, d: 2 }, { n: 3, d: 8 }],
      [{ n: 2, d: 3 }, { n: 3, d: 5 }],
      [{ n: 3, d: 4 }, { n: 2, d: 3 }],
      [{ n: 1, d: 3 }, { n: 1, d: 4 }],
    ];
    const [a, b] = pick(pairs);
    const bigger = compareFracs(a, b);
    return {
      prompt: `Which is larger: ${frac(a.n, a.d)} or ${frac(b.n, b.d)}?`,
      answer: frac(bigger.n, bigger.d),
      options: shuffle([
        { label: frac(a.n, a.d), value: frac(a.n, a.d) },
        { label: frac(b.n, b.d), value: frac(b.n, b.d) },
      ]),
    };
  }
  if (kind === 'add-same-denom') {
    const d = pick([6, 8, 10, 12]);
    const a = pick([1, 2, 3]);
    const b = pick([1, 2, 3]);
    if (a + b >= d) return makeFractionQuestion(level);
    return {
      prompt: `${frac(a, d)} + ${frac(b, d)} = ?/${d}`,
      answer: a + b,
      options: shuffleNumeric([a + b, a + b + 1, a + b - 1, a + b + 2]),
    };
  }
  if (kind === 'fraction-of-quantity') {
    const fracs = [
      { n: 1, d: 4, qty: 20 },
      { n: 3, d: 4, qty: 24 },
      { n: 2, d: 5, qty: 25 },
      { n: 3, d: 5, qty: 30 },
    ];
    const f = pick(fracs);
    const ans = (f.n / f.d) * f.qty;
    return {
      prompt: `What is ${frac(f.n, f.d)} of ${f.qty}?`,
      answer: ans,
      options: shuffleNumeric([ans, ans + f.qty / f.d, ans - f.qty / f.d, ans + 2]),
    };
  }
  if (kind === 'order-on-numberline') {
    const d = 8;
    const a = 3;
    const b = 5;
    return {
      prompt: `Which is closer to 1: ${frac(a, d)} or ${frac(b, d)}?`,
      answer: frac(b, d),
      options: shuffle([
        { label: frac(a, d), value: frac(a, d) },
        { label: frac(b, d), value: frac(b, d) },
      ]),
    };
  }
  const d = pick([6, 8, 12]);
  const a = pick([3, 4, 5]);
  const b = pick([1, 2]);
  if (a <= b) return makeFractionQuestion(level);
  return {
    prompt: `${frac(a, d)} − ${frac(b, d)} = ?/${d}`,
    answer: a - b,
    options: shuffleNumeric([a - b, a - b + 1, a - b - 1, a - b + 2]),
  };
}

/** @param {string} prompt @param {string} answer @param {string[]} wrongs */
function fractionChoice(prompt, answer, wrongs) {
  return {
    prompt,
    answer,
    options: shuffle([answer, ...wrongs].map((value) => ({ label: value, value }))),
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
 * @param {Parameters<typeof initDrillSession>[1]} callbacks
 * @returns {() => void}
 */
export function initFractions(host, callbacks) {
  return initDrillSession(host, {
    title: 'Fractions',
    missionTag: 'Number · Fractions',
    quizTag: 'Compare, order & operate',
    difficultyLevel: callbacks.difficultyLevel,
    sessionSize: sessionSize(callbacks.difficultyLevel),
    xpPerCorrect: FRACTIONS_LAB.xpPerCorrect,
    makeQuestion: makeFractionQuestion,
    onAwardXp: callbacks.onAwardXp,
    onSessionComplete({ accuracy }) {
      callbacks.onSessionComplete?.(accuracy);
    },
    onHome: callbacks.onHome,
    showToast: callbacks.showToast,
    optionClass: 'fractions-opt',
  });
}
