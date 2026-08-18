import { initDrillSession } from './drill-session.js';

const MODULES = {
  operations: { title: 'Operations HQ', tag: 'Number · Operations', quiz: 'Calculate & reason' },
  'decimals-percent': { title: 'Decimals & %', tag: 'Number · Rational numbers', quiz: 'Decimals, percentages & ratio' },
  time: { title: 'Time Command', tag: 'Measurement · Time', quiz: 'Clocks, duration & timetables' },
  'mass-capacity': { title: 'Supply Depot', tag: 'Measurement · Units', quiz: 'Mass, capacity & volume' },
};

/** @param {number} min @param {number} max */
function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** @param {number} value */
function tidy(value) {
  return Number(value.toFixed(2));
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

/** @param {string} prompt @param {number} answer @param {number[]} [wrongs] */
function q(prompt, answer, wrongs = []) {
  const candidates = [answer, ...wrongs, tidy(answer + 1), tidy(Math.max(0, answer - 1)), tidy(answer * 2)];
  const values = [...new Set(candidates)].slice(0, 4);
  while (values.length < 3) values.push(tidy(answer + values.length + 2));
  return {
    prompt,
    answer,
    options: shuffle(values.map((value) => ({ label: String(value), value }))),
  };
}

/** @param {number} level */
function operationsQuestion(level) {
  const limit = [0, 100, 1000, 10000, 100000][level];
  const kind = rand(0, level >= 4 ? 7 : level >= 3 ? 6 : 4);
  if (kind === 0) {
    const a = rand(Math.floor(limit / 10), Math.floor(limit * 0.65));
    const b = rand(5, Math.floor(limit * 0.3));
    return q(`${a} + ${b} = ?`, a + b, [a + b + 10, a + b - 10, Math.abs(a - b)]);
  }
  if (kind === 1) {
    const a = rand(Math.floor(limit * 0.55), limit);
    const b = rand(5, Math.floor(a * 0.55));
    return q(`${a} − ${b} = ?`, a - b, [a - b + 10, a - b - 10, a + b]);
  }
  if (kind === 2) {
    const a = rand(2, level === 1 ? 5 : level === 2 ? 10 : 15);
    const b = rand(2, level === 1 ? 10 : level === 2 ? 12 : 25);
    return q(`${a} × ${b} = ?`, a * b, [a + b, a * b + a, a * b - a]);
  }
  if (kind === 3) {
    const divisor = rand(2, level === 1 ? 5 : 12);
    const answer = rand(2, level === 1 ? 10 : 25);
    return q(`${divisor * answer} ÷ ${divisor} = ?`, answer, [answer + divisor, answer - 1, divisor]);
  }
  if (kind === 4) {
    const a = rand(3, 15);
    const b = rand(2, 9);
    const c = rand(2, 8);
    const answer = level >= 3 ? a + b * c : (a + b) * c;
    const prompt = level >= 3 ? `${a} + ${b} × ${c} = ?` : `(${a} + ${b}) × ${c} = ?`;
    return q(prompt, answer, [(a + b) * c, a + b + c, a * b + c]);
  }
  if (kind === 5) {
    const a = rand(12, 49);
    const b = rand(3, 9);
    return q(`${a} × ${b} = ?`, a * b, [a * b + b, a * b - b, a + b]);
  }
  if (kind === 6) {
    const factor = rand(3, 12);
    const other = rand(4, 15);
    return q(`What is the missing factor? ${factor} × ? = ${factor * other}`, other, [factor, other + 1, other - 1]);
  }
  const a = rand(10, 30);
  const b = rand(10, 30);
  return q(`${a} × ${b} = ?`, a * b, [a * b + 10, a * b - 10, a + b]);
}

/** @param {number} level */
function decimalQuestion(level) {
  if (level === 1) {
    const dollars = rand(2, 20);
    const cents = rand(1, 9) * 10;
    const kind = rand(0, 2);
    if (kind === 0) return q(`$${dollars}.${cents} is how many cents?`, dollars * 100 + cents);
    if (kind === 1) return q(`How many tenths make one whole?`, 10, [1, 5, 100]);
    return q(`Half of ${dollars * 2} is ?`, dollars);
  }
  const a = tidy(rand(10, 99) / 10);
  const b = tidy(rand(1, 49) / 10);
  const kind = rand(0, level >= 4 ? 7 : level >= 3 ? 6 : 3);
  if (kind === 0) return q(`${a} + ${b} = ?`, tidy(a + b), [tidy(a + b + 0.1), tidy(a + b - 0.1), tidy(a + b + 1)]);
  if (kind === 1) {
    const high = Math.max(a, b);
    const low = Math.min(a, b);
    return q(`${high} − ${low} = ?`, tidy(high - low), [tidy(high - low + 0.1), tidy(high - low + 1), tidy(high + low)]);
  }
  if (kind === 2) {
    const n = rand(1, 9);
    return q(`What is the value of ${n} in 4.${n}7?`, tidy(n / 10), [n, tidy(n / 100), n * 10]);
  }
  if (kind === 3) {
    const n = rand(12, 98);
    return q(`${n / 100} × 100 = ?`, n, [n / 10, n * 10, n + 1]);
  }
  if (kind === 4) {
    const base = rand(2, 12) * 20;
    return q(`25% of ${base} = ?`, base / 4, [base / 2, base / 10, base * 0.25 + 5]);
  }
  if (kind === 5) {
    const base = rand(2, 18) * 10;
    return q(`10% of ${base} = ?`, base / 10, [base / 5, base / 100, base - 10]);
  }
  if (kind === 6) {
    const unit = rand(3, 12);
    return q(`${unit * 5} supplies are shared in the ratio 2:3. How many go to the first group?`, unit * 2, [unit * 3, unit * 5, unit]);
  }
  const price = rand(20, 120);
  return q(`A $${price} item is reduced by 20%. How many dollars is the discount?`, price * 0.2, [price * 0.8, price * 0.1, price - 20]);
}

/** @param {number} level */
function timeQuestion(level) {
  const kind = rand(0, level >= 4 ? 6 : 4);
  const hour = rand(1, 9);
  const minutes = [0, 15, 30, 45][rand(0, 3)];
  if (kind === 0) {
    const hours = level === 1 ? 3 : rand(2, 8);
    return q(`${hours} hours equals how many minutes?`, hours * 60);
  }
  if (kind === 1) {
    const duration = rand(2, 6) * 15;
    return q(`A patrol starts at ${hour}:${String(minutes).padStart(2, '0')} and lasts ${duration} minutes. How many minutes long is it?`, duration);
  }
  if (kind === 2) {
    const duration = rand(2, 5);
    return q(`Training starts at ${hour}:00 and finishes at ${hour + duration}:00. How many hours?`, duration);
  }
  if (kind === 3) {
    const duration = rand(2, 8) * 10;
    return q(`${duration} minutes after 9:00 is how many minutes after the hour?`, duration);
  }
  if (kind === 4) {
    const h = rand(13, 22);
    return q(`${h}:00 in 12-hour time has what hour number?`, h - 12, [h, h - 11, h - 13]);
  }
  if (kind === 5) {
    const start = rand(7, 10) * 60 + rand(0, 3) * 15;
    const finish = start + rand(3, 8) * 15;
    return q(`A mission runs from ${Math.floor(start / 60)}:${String(start % 60).padStart(2, '0')} to ${Math.floor(finish / 60)}:${String(finish % 60).padStart(2, '0')}. How many minutes?`, finish - start);
  }
  const extraHours = rand(2, 10);
  return q(`2 days and ${extraHours} hours equals how many hours?`, 48 + extraHours);
}

/** @param {number} level */
function supplyQuestion(level) {
  const kind = rand(0, level >= 3 ? 6 : 4);
  const unit = rand(2, 9);
  if (kind === 0) return q(`${unit} kg equals how many grams?`, unit * 1000, [unit * 100, unit * 10, unit]);
  if (kind === 1) return q(`${unit} L equals how many millilitres?`, unit * 1000, [unit * 100, unit * 10, unit]);
  if (kind === 2) {
    const grams = rand(2, 9) * 100;
    return q(`${grams} g equals how many kilograms?`, grams / 1000, [grams / 100, grams / 10, grams]);
  }
  if (kind === 3) {
    const ml = rand(2, 9) * 250;
    return q(`${ml} mL equals how many litres?`, ml / 1000, [ml / 100, ml / 10, ml]);
  }
  if (kind === 4) {
    const packs = rand(2, 8);
    const grams = rand(2, 9) * 100;
    return q(`${packs} packs each weigh ${grams} g. What is the total mass in grams?`, packs * grams);
  }
  if (kind === 5) {
    const l = rand(2, 8);
    const w = rand(2, 7);
    const h = rand(2, 6);
    return q(`A crate is ${l} cm × ${w} cm × ${h} cm. What is its volume in cm³?`, l * w * h);
  }
  const bottles = rand(2, 8);
  const ml = rand(2, 6) * 250;
  return q(`${bottles} bottles hold ${ml} mL each. What is the total in millilitres?`, bottles * ml);
}

/** @param {string} topicId @param {number} level */
export function makeExpandedQuestion(topicId, level) {
  if (topicId === 'operations') return operationsQuestion(level);
  if (topicId === 'decimals-percent') return decimalQuestion(level);
  if (topicId === 'time') return timeQuestion(level);
  return supplyQuestion(level);
}

export function initExpandedMath(host, callbacks) {
  const module = MODULES[callbacks.topicId];
  return initDrillSession(host, {
    title: module.title,
    missionTag: module.tag,
    quizTag: module.quiz,
    difficultyLevel: callbacks.difficultyLevel,
    sessionSize: 10,
    xpPerCorrect: 4,
    makeQuestion: (level) => makeExpandedQuestion(callbacks.topicId, level),
    onAwardXp: callbacks.onAwardXp,
    onSessionComplete: callbacks.onSessionComplete,
    onHome: callbacks.onHome,
    showToast: callbacks.showToast,
    optionClass: 'expanded-opt',
  });
}
