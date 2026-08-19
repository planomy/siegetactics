import { initDrillSession } from './drill-session.js';

const MODULES = {
  operations: { title: 'Operations HQ', tag: 'Number · Operations', quiz: 'Calculate & reason' },
  'decimals-percent': { title: 'Decimals & %', tag: 'Number · Rational numbers', quiz: 'Decimals, percentages & ratio' },
  time: { title: 'Time Command', tag: 'Measurement · Time', quiz: 'Clocks, duration & timetables' },
  'mass-capacity': { title: 'Mass Capacity Volume', tag: 'Measurement · Units', quiz: 'Mass, capacity & volume' },
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
  let offset = 2;
  while (values.length < 4) {
    const fallback = tidy(answer + offset++);
    if (!values.includes(fallback)) values.push(fallback);
  }
  return {
    prompt,
    answer,
    options: shuffle(values.map((value) => ({ label: String(value), value }))),
  };
}

/** @param {string} prompt @param {string} answer @param {string[]} wrongs */
function choice(prompt, answer, wrongs) {
  const values = [...new Set([answer, ...wrongs])];
  return {
    prompt,
    answer,
    options: shuffle(values.map((value) => ({ label: value, value }))),
  };
}

/** @param {number} totalMinutes */
function clock12(totalMinutes) {
  const wrapped = ((totalMinutes % 720) + 720) % 720;
  const hour = Math.floor(wrapped / 60) || 12;
  return `${hour}:${String(wrapped % 60).padStart(2, '0')}`;
}

/** @param {number} totalMinutes */
function clock24(totalMinutes) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/** @param {number} level */
function operationsQuestion(level) {
  const limit = [0, 100, 1000, 10000, 100000][level];
  const kind = rand(0, level === 1 ? 3 : level === 2 ? 4 : level === 3 ? 6 : 8);
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
    const a = rand(2, level === 1 ? 5 : level === 2 ? 10 : level === 3 ? 15 : 30);
    const b = rand(2, level === 1 ? 10 : level === 2 ? 12 : level === 3 ? 25 : 30);
    return q(`${a} × ${b} = ?`, a * b, [a + b, a * b + a, a * b - a]);
  }
  if (kind === 3) {
    const divisor = rand(2, level === 1 ? 5 : 12);
    const answer = rand(2, level === 1 ? 10 : level === 4 ? 50 : 25);
    return q(`${divisor * answer} ÷ ${divisor} = ?`, answer, [answer + divisor, answer - 1, divisor]);
  }
  if (kind === 4) {
    const a = rand(3, 15);
    const b = rand(2, 9);
    const c = rand(2, 8);
    if (level === 2) {
      return q(`${b} boxes hold ${c} bolts each, then Granny adds ${a} more. How many bolts altogether?`, b * c + a, [b * c, (a + b) * c, a + b + c]);
    }
    return q(`${a} + ${b} × ${c} = ?`, a + b * c, [(a + b) * c, a + b + c, a * b + c]);
  }
  if (kind === 5) {
    const a = rand(level === 4 ? 20 : 12, level === 4 ? 99 : 49);
    const b = rand(level === 4 ? 4 : 3, level === 4 ? 12 : 9);
    return q(`${a} × ${b} = ?`, a * b, [a * b + b, a * b - b, a + b]);
  }
  if (kind === 6) {
    const factor = rand(3, 12);
    const other = rand(level === 4 ? 10 : 4, level === 4 ? 25 : 15);
    return q(`What is the missing factor? ${factor} × ? = ${factor * other}`, other, [factor, other + 1, other - 1]);
  }
  if (kind === 7) {
    const a = rand(10, 30);
    const b = rand(10, 30);
    return q(`${a} × ${b} = ?`, a * b, [a * b + 10, a * b - 10, a + b]);
  }
  const a = rand(3, 9);
  const b = rand(4, 12);
  const c = rand(10, 30);
  const d = rand(2, 9);
  return q(`${a} × (${b} + ${d}) − ${c} = ?`, a * (b + d) - c, [a * b + d - c, (a * b) + d, a * (b + d)]);
}

/** @param {number} level */
function decimalQuestion(level) {
  if (level === 1) {
    const dollars = rand(2, 20);
    const cents = rand(1, 9) * 10;
    const kind = rand(0, 2);
    if (kind === 0) return q(`$${dollars}.${cents} is how many cents?`, dollars * 100 + cents);
    if (kind === 1) return q(`${dollars} dollars equals how many cents?`, dollars * 100, [dollars * 10, dollars, dollars * 100 + 10]);
    return q(`Half of ${dollars * 2} is ?`, dollars, [dollars * 2, dollars + 2, Math.max(1, dollars - 2)]);
  }
  if (level === 2) {
    const digit = rand(1, 9);
    const kind = rand(0, 3);
    if (kind === 0) return q(`How many tenths make one whole?`, 10, [1, 5, 100]);
    if (kind === 1) return q(`What is the value of ${digit} in 4.${digit}7?`, tidy(digit / 10), [digit, tidy(digit / 100), digit * 10]);
    if (kind === 2) return q(`What is the value of ${digit} in 3.4${digit}?`, tidy(digit / 100), [digit, tidy(digit / 10), digit * 10]);
    return q(`One half written as a decimal is ?`, 0.5, [0.2, 0.25, 5]);
  }
  const a = tidy(rand(10, 99) / 10);
  const b = tidy(rand(1, 49) / 10);
  const kind = rand(0, level >= 4 ? 7 : 6);
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
    if (level === 3) {
      const base = rand(2, 18) * 10;
      return q(`50% of ${base} = ?`, base / 2, [base / 4, base / 10, base]);
    }
    const unit = rand(3, 12);
    return q(`${unit * 5} supplies are shared in the ratio 2:3. How many go to the first group?`, unit * 2, [unit * 3, unit * 5, unit]);
  }
  const price = rand(20, 120);
  return q(`A $${price} item is reduced by 20%. How many dollars is the discount?`, tidy(price * 0.2), [tidy(price * 0.8), tidy(price * 0.1), price - 20]);
}

/** @param {number} level */
function timeQuestion(level) {
  if (level === 1) {
    const kind = rand(0, 4);
    if (kind === 0) {
      const hours = rand(1, 3);
      return q(`${hours} hour${hours === 1 ? '' : 's'} equals how many minutes?`, hours * 60, [hours * 30, hours * 100, hours * 60 + 30]);
    }
    if (kind === 1) {
      const start = [0, 10, 15, 20][rand(0, 3)];
      const duration = [10, 15, 20, 30][rand(0, 3)];
      const finish = start + duration;
      return q(`A patrol starts at 9:${String(start).padStart(2, '0')} and finishes at 9:${String(finish).padStart(2, '0')}. How many minutes does it last?`, finish - start, [finish, start, finish - start + 10]);
    }
    if (kind === 2) {
      const startHour = rand(1, 7);
      const duration = rand(1, 3);
      return q(`Training starts at ${startHour}:00 and finishes at ${startHour + duration}:00. How many hours does it last?`, duration, [duration + 1, startHour + duration, Math.max(1, duration - 1)]);
    }
    if (kind === 3) return q(`Half an hour is how many minutes?`, 30, [15, 45, 60]);
    return choice('Which duration is longer?', '1 hour', ['45 minutes', '30 minutes', '15 minutes']);
  }

  if (level === 2) {
    const kind = rand(0, 4);
    const start = rand(1, 8) * 60 + [0, 15, 30, 45][rand(0, 3)];
    const duration = [30, 45, 60, 75, 90][rand(0, 4)];
    const finish = start + duration;
    if (kind === 0) return q(`${duration} minutes equals how many quarter-hours?`, duration / 15, [duration / 30, duration / 15 + 1, Math.max(1, duration / 15 - 1)]);
    if (kind === 1) return q(`A patrol starts at ${clock12(start)} and finishes at ${clock12(finish)}. How many minutes does it last?`, duration, [duration + 15, duration - 15, finish % 60]);
    if (kind === 2) return choice(`Training starts at ${clock12(start)} and lasts ${duration} minutes. What time does it finish?`, clock12(finish), [clock12(finish + 15), clock12(finish - 15), clock12(start + duration / 2)]);
    if (kind === 3) return q(`2 hours 30 minutes equals how many minutes?`, 150, [120, 130, 230]);
    const first = [45, 60, 75, 90][rand(0, 3)];
    const second = first + 15;
    return q(`Which is the longer duration in minutes: ${first} minutes or ${second} minutes?`, second, [first, second - 30, second + 15]);
  }

  if (level === 3) {
    const kind = rand(0, 5);
    const hour24 = rand(13, 22);
    if (kind === 0) return choice(`${hour24}:00 in 12-hour time is __`, `${hour24 - 12}:00 pm`, [`${hour24}:00 pm`, `${hour24 - 12}:00 am`, `${hour24 - 11}:00 pm`]);
    if (kind === 1) {
      const pmHour = rand(1, 10);
      return choice(`${pmHour}:30 pm in 24-hour time is __`, `${pmHour + 12}:30`, [`${pmHour}:30`, `${pmHour + 12}:00`, `${pmHour + 11}:30`]);
    }
    const start = rand(7, 10) * 60 + [0, 15, 30, 45][rand(0, 3)];
    const duration = [45, 60, 75, 90, 105][rand(0, 4)];
    const finish = start + duration;
    if (kind === 2) return q(`A mission runs from ${clock12(start)} to ${clock12(finish)}. How many minutes does it last?`, duration, [duration + 15, duration - 15, finish % 60]);
    if (kind === 3) return choice(`A shuttle leaves at ${clock12(start)} and travels for ${duration} minutes. When does it arrive?`, clock12(finish), [clock12(finish + 15), clock12(finish - 15), clock12(start + 30)]);
    if (kind === 4) {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      const durationWords = `${hours} hour${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} minutes` : ''}`;
      return q(`A ${durationWords} mission lasts how many minutes?`, duration, [duration - 15, duration + 15, hours * 100 + minutes]);
    }
    return q(`A timetable shows stops at ${clock12(start)}, ${clock12(start + 30)} and ${clock12(start + 60)}. How many minutes apart are the stops?`, 30, [15, 45, 60]);
  }

  const kind = rand(0, 5);
  const start = rand(7, 20) * 60 + [0, 10, 20, 30, 40, 50][rand(0, 5)];
  const duration = [70, 85, 95, 110, 125][rand(0, 4)];
  const finish = start + duration;
  if (kind === 0) return choice(`${clock24(start)} plus ${duration} minutes is __`, clock24(finish), [clock24(finish + 10), clock24(finish - 10), clock24(start + duration - 60)]);
  if (kind === 1) return q(`A mission runs from ${clock24(start)} to ${clock24(finish)}. How many minutes does it last?`, duration, [duration + 10, duration - 10, duration + 60]);
  if (kind === 2) {
    const leg1 = rand(3, 7) * 10;
    const wait = rand(1, 3) * 10;
    const leg2 = rand(3, 7) * 10;
    return q(`A convoy travels for ${leg1} minutes, waits ${wait} minutes, then travels ${leg2} minutes. How many minutes altogether?`, leg1 + wait + leg2, [leg1 + leg2, leg1 + wait, wait + leg2]);
  }
  if (kind === 3) {
    const extraHours = rand(2, 10);
    return q(`2 days and ${extraHours} hours equals how many hours?`, 48 + extraHours, [24 + extraHours, 48, 50 + extraHours]);
  }
  if (kind === 4) {
    const beforeMidnight = rand(21, 23) * 60 + 30;
    const afterMidnight = beforeMidnight + 90;
    return choice(`A night patrol starts at ${clock24(beforeMidnight)} and lasts 90 minutes. When does it finish?`, clock24(afterMidnight), [clock24(afterMidnight + 30), clock24(afterMidnight - 30), clock24(beforeMidnight + 60)]);
  }
  return q(`A timetable has departures every 25 minutes. The first is at 08:10. How many minutes after 08:10 is the fourth departure?`, 75, [50, 80, 100]);
}

/** @param {number} level */
function supplyQuestion(level) {
  if (level === 1) {
    const kind = rand(0, 4);
    if (kind === 0) {
      const lighter = rand(2, 7) * 100;
      const heavier = lighter + rand(1, 2) * 100;
      return q(`Which mass is heavier in grams: ${lighter} g or ${heavier} g?`, heavier, [lighter, heavier - 50, heavier + 100]);
    }
    if (kind === 1) return choice('Which unit is best for measuring the mass of a school bag?', 'kilograms', ['grams', 'millilitres', 'litres']);
    if (kind === 2) return choice('Which unit is best for measuring water in a drink bottle?', 'millilitres', ['grams', 'kilograms', 'centimetres']);
    if (kind === 3) {
      const bottles = rand(2, 4);
      const ml = rand(2, 4) * 100;
      return q(`${bottles} bottles hold ${ml} mL each. How many millilitres altogether?`, bottles * ml, [bottles + ml, bottles * ml + 100, bottles * ml - 100]);
    }
    const first = rand(2, 6) * 100;
    const second = rand(1, 4) * 100;
    return q(`A container has ${first} mL. Granny adds ${second} mL. How many millilitres now?`, first + second, [first, second, Math.abs(first - second)]);
  }

  if (level === 2) {
    const kind = rand(0, 4);
    const unit = rand(1, 5);
    if (kind === 0) return q(`${unit} kg equals how many grams?`, unit * 1000, [unit * 100, unit * 10, unit]);
    if (kind === 1) return q(`${unit} L equals how many millilitres?`, unit * 1000, [unit * 100, unit * 10, unit]);
    if (kind === 2) {
      const packs = rand(2, 6);
      const grams = rand(1, 5) * 100;
      return q(`${packs} packs each weigh ${grams} g. What is the total mass in grams?`, packs * grams, [packs + grams, packs * grams + 100, packs * grams - 100]);
    }
    if (kind === 3) {
      const bottles = rand(2, 6);
      const ml = rand(1, 4) * 250;
      return q(`${bottles} bottles hold ${ml} mL each. What is the total in millilitres?`, bottles * ml, [bottles + ml, bottles * ml + 250, Math.max(250, bottles * ml - 250)]);
    }
    return q(`Which is heavier in grams: 1 kg or 900 g?`, 1000, [900, 100, 1900]);
  }

  if (level === 3) {
    const kind = rand(0, 5);
    const unit = rand(2, 9);
    if (kind === 0) return q(`${unit} kg equals how many grams?`, unit * 1000, [unit * 100, unit * 10, unit]);
    if (kind === 1) return q(`${unit} L equals how many millilitres?`, unit * 1000, [unit * 100, unit * 10, unit]);
    if (kind === 2) {
      const grams = rand(2, 9) * 100;
      return q(`${grams} g equals how many kilograms?`, grams / 1000, [grams / 100, grams / 10, grams]);
    }
    if (kind === 3) {
      const ml = rand(2, 6) * 250;
      return q(`${ml} mL equals how many litres?`, ml / 1000, [ml / 100, ml / 10, ml]);
    }
    if (kind === 4) {
      const packs = rand(3, 8);
      const grams = rand(2, 9) * 100;
      return q(`${packs} packs each weigh ${grams} g. What is the total mass in grams?`, packs * grams);
    }
    const bottles = rand(3, 8);
    const ml = rand(2, 6) * 250;
    return q(`${bottles} bottles hold ${ml} mL each. What is the total in millilitres?`, bottles * ml);
  }

  const kind = rand(0, 5);
  if (kind === 0) {
    const l = rand(3, 10);
    const w = rand(2, 8);
    const h = rand(2, 6);
    return q(`A crate is ${l} cm × ${w} cm × ${h} cm. What is its volume in cm³?`, l * w * h, [l * w, 2 * (l + w + h), l + w + h]);
  }
  if (kind === 1) {
    const bottles = rand(4, 10);
    const ml = [250, 500, 750][rand(0, 2)];
    return q(`${bottles} bottles hold ${ml} mL each. What is the total in litres?`, tidy((bottles * ml) / 1000), [tidy(bottles * ml / 100), tidy(bottles * ml / 10000), tidy(bottles + ml / 1000)]);
  }
  if (kind === 2) {
    const packs = rand(3, 8);
    const grams = rand(2, 9) * 250;
    return q(`${packs} packs weigh ${grams} g each. What is the total mass in kilograms?`, tidy((packs * grams) / 1000), [tidy(packs * grams / 100), tidy(packs * grams / 10000), tidy(grams / 1000)]);
  }
  if (kind === 3) return q(`A 5 L tank contains 3250 mL. How many millilitres can still be added?`, 1750, [750, 2250, 8250]);
  if (kind === 4) return q(`Three 750 mL bottles hold how many litres altogether?`, 2.25, [1.5, 2.5, 225]);
  return q(`A 2.5 kg supply bag loses 600 g. How many grams remain?`, 1900, [190, 2100, 3100]);
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
