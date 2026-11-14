import { noteType } from './maths-skills.js';

/**
 * Questions for the two levels outside the original four:
 * Level 1 (Year 2) and Level 6 (Year 7). Levels 2–5 reuse each topic's
 * existing generator (see legacyLevel in difficulty.js).
 *
 * Questions may carry `visual` (inline SVG drawn above the prompt) and `key`
 * (used instead of the prompt to avoid repeats when several picture
 * questions share the same wording).
 */

/** @typedef {{ prompt: string, answer: number|string, options: { label: string, value: number|string }[], visual?: string, key?: string }} Question */

/** @param {number} min @param {number} max */
function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** @template T @param {T[]} items @returns {T} */
function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

/** @template T @param {T[]} items @returns {T[]} */
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** @param {number} value */
function tidy(value) {
  return Number(value.toFixed(3));
}

/**
 * Number answer with four options; extra wrong answers are filled from near misses.
 * @param {string} prompt @param {number} answer @param {number[]} [wrongs] @param {Partial<Question>} [extra]
 * @returns {Question}
 */
function num(prompt, answer, wrongs = [], extra = {}) {
  const values = [];
  for (const v of [answer, ...wrongs, answer + 1, answer - 1, answer + 2, answer + 10, answer - 2]) {
    const t = tidy(v);
    if (!values.includes(t) && (t >= 0 || answer < 0)) values.push(t);
    if (values.length === 4) break;
  }
  return { prompt, answer: tidy(answer), options: shuffle(values.map((value) => ({ label: String(value), value }))), ...extra };
}

/**
 * Text answer with the given wrong answers.
 * @param {string} prompt @param {string} answer @param {string[]} wrongs @param {Partial<Question>} [extra]
 * @returns {Question}
 */
function text(prompt, answer, wrongs, extra = {}) {
  const values = [...new Set([answer, ...wrongs])].slice(0, 4);
  return { prompt, answer, options: shuffle(values.map((value) => ({ label: value, value }))), ...extra };
}

/** @param {number} n */
function sup(n) {
  return String(n).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join('');
}

/** @param {number} a @param {number} b */
function gcd(a, b) {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** @param {number} n @param {number} d */
function fracText(n, d) {
  const g = gcd(n, d);
  const sn = n / g;
  const sd = d / g;
  return sd === 1 ? String(sn) : `${sn}/${sd}`;
}

/* ---------- Pictures for Year 2 ---------- */

const INK = '#2a1240';
const FILL = '#7ee33a';

/** Analogue clock face. @param {number} hour 1–12 @param {number} minute */
function clockSvg(hour, minute) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const r1 = i % 3 === 0 ? 38 : 41;
    return `<line x1="${50 + Math.sin(a) * r1}" y1="${50 - Math.cos(a) * r1}" x2="${50 + Math.sin(a) * 45}" y2="${50 - Math.cos(a) * 45}" stroke="${INK}" stroke-width="${i % 3 === 0 ? 3 : 1.5}" stroke-linecap="round"/>`;
  }).join('');
  const numbers = [12, 3, 6, 9].map((n, i) => {
    const a = (i * Math.PI) / 2;
    return `<text x="${50 + Math.sin(a) * 29}" y="${50 - Math.cos(a) * 29 + 5}" font-size="13" font-weight="700" text-anchor="middle" fill="${INK}" font-family="sans-serif">${n}</text>`;
  }).join('');
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;
  return `<svg viewBox="0 0 100 100" role="img" aria-label="Clock face">
    <circle cx="50" cy="50" r="47" fill="#fff8e6" stroke="${INK}" stroke-width="4"/>${ticks}${numbers}
    <line x1="50" y1="50" x2="50" y2="26" stroke="${INK}" stroke-width="5" stroke-linecap="round" transform="rotate(${hourAngle} 50 50)"/>
    <line x1="50" y1="50" x2="50" y2="12" stroke="#c8161f" stroke-width="3" stroke-linecap="round" transform="rotate(${minuteAngle} 50 50)"/>
    <circle cx="50" cy="50" r="4" fill="${INK}"/></svg>`;
}

/** A bar or a circle split into equal parts with some shaded. @param {'bar'|'circle'} kind @param {number} parts @param {number} shaded */
function fractionSvg(kind, parts, shaded) {
  if (kind === 'bar') {
    const w = 150 / parts;
    const cells = Array.from({ length: parts }, (_, i) =>
      `<rect x="${5 + i * w}" y="20" width="${w}" height="50" fill="${i < shaded ? FILL : '#fff8e6'}" stroke="${INK}" stroke-width="3"/>`).join('');
    return `<svg viewBox="0 0 160 90" role="img" aria-label="Fraction bar">${cells}</svg>`;
  }
  const slices = Array.from({ length: parts }, (_, i) => {
    const a0 = (i / parts) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / parts) * Math.PI * 2 - Math.PI / 2;
    const large = 1 / parts > 0.5 ? 1 : 0;
    return `<path d="M50 50 L${50 + 44 * Math.cos(a0)} ${50 + 44 * Math.sin(a0)} A44 44 0 ${large} 1 ${50 + 44 * Math.cos(a1)} ${50 + 44 * Math.sin(a1)} Z" fill="${i < shaded ? FILL : '#fff8e6'}" stroke="${INK}" stroke-width="3"/>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" role="img" aria-label="Fraction circle">${slices}</svg>`;
}

/** @param {number} sides */
function polygonPoints(sides, rx = 42, ry = 42) {
  return Array.from({ length: sides }, (_, i) => {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2 + (sides % 2 === 0 ? Math.PI / sides : 0);
    return `${(50 + rx * Math.cos(a)).toFixed(1)},${(52 + ry * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

const SHAPES = {
  circle: { sides: 0, corners: 0 },
  triangle: { sides: 3, corners: 3 },
  square: { sides: 4, corners: 4 },
  rectangle: { sides: 4, corners: 4 },
  pentagon: { sides: 5, corners: 5 },
  hexagon: { sides: 6, corners: 6 },
  octagon: { sides: 8, corners: 8 },
};

/** @param {keyof typeof SHAPES} name */
function shapeSvg(name) {
  const style = `fill="#ffd84a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"`;
  let body;
  if (name === 'circle') body = `<circle cx="50" cy="50" r="42" ${style}/>`;
  else if (name === 'square') body = `<rect x="14" y="14" width="72" height="72" ${style}/>`;
  else if (name === 'rectangle') body = `<rect x="4" y="26" width="92" height="50" ${style}/>`;
  else body = `<polygon points="${polygonPoints(SHAPES[name].sides)}" ${style}/>`;
  return `<svg viewBox="0 0 100 100" role="img" aria-label="Shape">${body}</svg>`;
}

/* ---------- Year 2 (Level 1) ---------- */

const year2 = {
  operations() {
    const kind = rand(0, 8);
    noteType(['y2-make-ten', 'y2-make-twenty', 'y2-add-within-20', 'y2-subtract-from-teens', 'y2-add-ones', 'y2-add-tens', 'y2-double', 'y2-equal-groups', 'y2-skip-count'][kind]);
    if (kind === 0) { const a = rand(1, 9); return num(`${a} + ? = 10`, 10 - a); }
    if (kind === 1) { const a = rand(3, 17); return num(`${a} + ? = 20`, 20 - a); }
    if (kind === 2) { const a = rand(3, 12); const b = rand(2, 20 - a); return num(`${a} + ${b} = ?`, a + b); }
    if (kind === 3) { const a = rand(11, 20); const b = rand(2, 9); return num(`${a} − ${b} = ?`, a - b); }
    if (kind === 4) { const a = rand(2, 8) * 10 + rand(1, 5); const b = rand(2, 4); return num(`${a} + ${b} = ?`, a + b); }
    if (kind === 5) { const a = rand(1, 5) * 10; const b = rand(1, 4) * 10; return num(`${a} + ${b} = ?`, a + b, [a + b + 10, a + b - 10]); }
    if (kind === 6) { const a = rand(3, 10); return num(`Double ${a} is ?`, a * 2, [a + 2, a * 2 + 1]); }
    if (kind === 7) {
      const g = rand(2, 5); const n = pick([2, 5, 10]);
      return num(`${g} groups of ${n} aliens. How many aliens altogether?`, g * n, [g + n, g * n + n]);
    }
    const s = pick([2, 5, 10]); const k = rand(1, 6);
    return num(`Count by ${s}s: ${s * k}, ${s * (k + 1)}, ${s * (k + 2)}, ?`, s * (k + 3), [s * (k + 2) + 1, s * (k + 4)]);
  },

  fractions() {
    const kind = rand(0, 3);
    noteType(['y2-shaded-shape', 'y2-shaded-shape', 'y2-half-of-number', 'y2-parts-in-whole'][kind]);
    if (kind <= 1) {
      const parts = pick([2, 4, 8]);
      const shaded = parts === 2 ? 1 : pick([1, 1, parts / 2]);
      const shape = pick(['bar', 'circle']);
      const answer = fracText(shaded, parts);
      const wrongs = ['1/2', '1/4', '1/8', '1/3', '3/4'].filter((f) => f !== answer);
      return text('What fraction of the shape is green?', answer, shuffle(wrongs).slice(0, 3), {
        visual: fractionSvg(shape, parts, shaded),
        key: `frac-${shape}-${parts}-${shaded}`,
      });
    }
    if (kind === 2) { const n = rand(2, 10); return num(`What is half of ${n * 2}?`, n, [n * 2, n + 2]); }
    const parts = pick([2, 4, 8]);
    const name = { 2: 'halves', 4: 'quarters', 8: 'eighths' }[parts];
    return num(`How many ${name} make one whole?`, parts, [parts === 2 ? 4 : 2, parts + 1]);
  },

  angles() {
    const names = /** @type {(keyof typeof SHAPES)[]} */ (Object.keys(SHAPES));
    const kind = rand(0, 3);
    noteType(['y2-name-shape', 'y2-name-shape', 'y2-count-corners', 'y2-shape-facts'][kind]);
    if (kind <= 1) {
      const name = pick(names);
      return text('What is this shape called?', name, shuffle(names.filter((n) => n !== name)).slice(0, 3), {
        visual: shapeSvg(name),
        key: `shape-name-${name}`,
      });
    }
    if (kind === 2) {
      const name = pick(names.filter((n) => n !== 'circle'));
      return num('How many corners does this shape have?', SHAPES[name].corners, [SHAPES[name].corners + 1, SHAPES[name].corners - 1], {
        visual: shapeSvg(name),
        key: `shape-corners-${name}`,
      });
    }
    return pick([
      () => (noteType('y2-quarter-turns'), num('How many quarter turns make a full turn?', 4, [2, 3, 1])),
      () => (noteType('y2-quarter-turns'), num('How many quarter turns make a half turn?', 2, [1, 4, 3])),
      () => text('Which shape has no corners?', 'circle', ['square', 'triangle', 'hexagon']),
      () => text('Which shape has 3 sides?', 'triangle', ['square', 'pentagon', 'circle']),
    ])();
  },

  time() {
    const kind = rand(0, 3);
    noteType(['y2-read-clock', 'y2-read-clock', 'y2-hour-later', 'y2-time-facts'][kind]);
    if (kind <= 1) {
      const hour = rand(1, 12);
      const minute = pick([0, 30, 15, 45]);
      const next = (hour % 12) + 1;
      const say = {
        0: `${hour} o'clock`,
        30: `half past ${hour}`,
        15: `quarter past ${hour}`,
        45: `quarter to ${next}`,
      };
      const answer = say[minute];
      const wrongs = [say[0], say[30], say[15], say[45], `${next} o'clock`].filter((s) => s !== answer);
      return text('What time does the clock show?', answer, shuffle(wrongs).slice(0, 3), {
        visual: clockSvg(hour, minute),
        key: `clock-${hour}-${minute}`,
      });
    }
    if (kind === 2) {
      const h = rand(1, 11);
      return text(`What time is it 1 hour after ${h} o'clock?`, `${h + 1} o'clock`, [`${h} o'clock`, `${((h + 1) % 12) + 1} o'clock`, `half past ${h}`]);
    }
    return pick([
      () => num('How many minutes are in one hour?', 60, [30, 100, 12]),
      () => num('How many minutes are in half an hour?', 30, [15, 50, 60]),
      () => num('How many days are in a week?', 7, [5, 10, 12]),
      () => num('How many months are in a year?', 12, [10, 7, 52]),
      () => num('How many hours are in a day?', 24, [12, 60, 7]),
    ])();
  },

  length() {
    const kind = rand(0, 4);
    noteType(['y2-longest', 'y2-join-ribbons', 'y2-difference', 'y2-choose-unit', 'y2-cm-in-metre'][kind]);
    if (kind === 0) {
      const lengths = shuffle([rand(2, 6), rand(7, 11), rand(12, 16), rand(17, 25)]);
      const longest = Math.max(...lengths);
      return text('Which is the longest?', `${longest} cm`, lengths.filter((l) => l !== longest).map((l) => `${l} cm`));
    }
    if (kind === 1) { const a = rand(3, 15); const b = rand(2, 12); return num(`A ribbon is ${a} cm long. Another is ${b} cm. How long are they together, in cm?`, a + b); }
    if (kind === 2) { const a = rand(9, 20); const b = rand(2, a - 2); return num(`One worm is ${a} cm long and another is ${b} cm. How many cm longer is the first worm?`, a - b); }
    if (kind === 3) {
      const [thing, unit] = pick([['a pencil', 'cm'], ['a door', 'm'], ['a crayon', 'cm'], ['a swimming pool', 'm'], ['a ladybird', 'cm'], ['a bus', 'm']]);
      return text(`Which unit would you use to measure ${thing}?`, unit, [unit === 'cm' ? 'm' : 'cm', 'kg', 'L']);
    }
    return num('How many centimetres are in 1 metre?', 100, [10, 1000, 50]);
  },

  mass() {
    const kind = rand(0, 4);
    noteType(['y2-heaviest', 'y2-holds-most', 'y2-jugs-to-cups', 'y2-add-kg', 'y2-choose-unit'][kind]);
    if (kind === 0) {
      const set = pick([['an elephant', 'a dog', 'an apple', 'a feather'], ['a car', 'a bike', 'a book', 'a leaf'], ['a horse', 'a cat', 'a shoe', 'a pencil']]);
      return text('Which is the heaviest?', set[0], set.slice(1));
    }
    if (kind === 1) {
      const set = pick([['a bathtub', 'a bucket', 'a cup', 'a spoon'], ['a swimming pool', 'a sink', 'a mug', 'an egg cup'], ['a fish tank', 'a jug', 'a glass', 'a bottle cap']]);
      return text('Which holds the most water?', set[0], set.slice(1));
    }
    if (kind === 2) { const n = rand(2, 5); const k = rand(2, 3); return num(`A jug fills ${n} cups. How many cups do ${k} jugs fill?`, n * k, [n + k, n * k + 1]); }
    if (kind === 3) { const a = rand(2, 9); const b = rand(1, 8); return num(`A bag has ${a} kg of potatoes. Granny adds ${b} kg more. How many kg now?`, a + b); }
    const [thing, unit] = pick([['how heavy a dog is', 'kg'], ['how much water is in a bucket', 'L'], ['how heavy a watermelon is', 'kg'], ['how much juice is in a jug', 'L']]);
    return text(`Which unit measures ${thing}?`, unit, [unit === 'kg' ? 'L' : 'kg', 'cm', 'm']);
  },

  money() {
    const kind = rand(0, 4);
    noteType(['y2-coins-in-dollar', 'y2-add-coins', 'y2-change', 'y2-double-price', 'y2-worth-most'][kind]);
    if (kind === 0) { const [coin, count] = pick([[10, 10], [20, 5], [50, 2]]); return num(`How many ${coin}c coins make $1?`, count, [count + 1, count * 2]); }
    if (kind === 1) {
      const coins = [pick([50, 20]), pick([20, 10]), pick([10, 5])];
      const total = coins.reduce((s, c) => s + c, 0);
      return num(`${coins.map((c) => `${c}c`).join(' + ')} = how many cents?`, total, [total + 10, total - 5]);
    }
    if (kind === 2) { const have = rand(4, 10); const spend = rand(1, have - 1); return num(`Granny has $${have} and spends $${spend}. How many dollars are left?`, have - spend); }
    if (kind === 3) { const price = pick([20, 30, 40, 50]); return num(`A lolly costs ${price}c. How many cents do 2 lollies cost?`, price * 2, [price + 2, price * 3]); }
    return text('Which is worth the most?', '$2', ['$1', '50c', '20c']);
  },
};

/* ---------- Year 7 (Level 6) ---------- */

const year7 = {
  operations() {
    const kind = rand(0, 8);
    noteType(['y7-add-negative', 'y7-subtract-below-zero', 'y7-multiply-negative', 'y7-square-then-multiply', 'y7-square-root', 'y7-solve-equation', 'y7-substitute', 'y7-powers', 'y7-hcf'][kind]);
    if (kind === 0) { const a = -rand(3, 15); const b = rand(5, 20); return num(`${a} + ${b} = ?`, a + b, [-(a + b), a - b]); }
    if (kind === 1) { const a = rand(3, 10); const b = rand(11, 20); return num(`${a} − ${b} = ?`, a - b, [b - a, a + b]); }
    if (kind === 2) {
      const a = rand(2, 9); const b = rand(2, 9); const neg = Math.random() < 0.5;
      return neg ? num(`−${a} × ${b} = ?`, -a * b, [a * b, -(a + b)]) : num(`−${a} × −${b} = ?`, a * b, [-a * b, a + b]);
    }
    if (kind === 3) { const a = rand(2, 9); const b = rand(2, 6); const c = rand(2, 9); return num(`${a}² + ${b} × ${c} = ?`, a * a + b * c, [(a * a + b) * c, a * 2 + b * c]); }
    if (kind === 4) { const n = rand(4, 15); return num(`√${n * n} = ?`, n, [n * 2, n + 1, n * n]); }
    if (kind === 5) {
      const n = rand(2, 12); const a = rand(2, 9); const b = rand(1, 20);
      return num(`${a}n + ${b} = ${a * n + b}. What is n?`, n, [n + 1, a * n, Math.max(1, n - 2)]);
    }
    if (kind === 6) { const x = rand(2, 9); const a = rand(2, 8); const b = rand(1, 15); return num(`If x = ${x}, what is ${a}x − ${b}?`, a * x - b, [a + x - b, a * x + b]); }
    if (kind === 7) { const base = pick([2, 3, 5, 10]); const p = base === 10 ? rand(2, 4) : rand(2, base === 2 ? 6 : 3); return num(`${base}${sup(p)} = ?`, base ** p, [base * p, base ** (p - 1)]); }
    const [a, b, h] = pick([[12, 18, 6], [16, 24, 8], [15, 25, 5], [14, 21, 7], [20, 30, 10], [18, 27, 9]]);
    return num(`What is the highest common factor of ${a} and ${b}?`, h, [h / 2 >= 1 ? h / 2 : 1, h * 2, a - b > 0 ? a - b : b - a].filter((v) => v !== h));
  },

  fractions() {
    const kind = rand(0, 4);
    noteType(['y7-add-subtract-unlike', 'y7-add-subtract-unlike', 'y7-multiply', 'y7-improper-to-mixed', 'y7-fraction-to-percent'][kind]);
    if (kind <= 1) {
      let b = rand(2, 8); let d = rand(2, 8);
      while (d === b) d = rand(2, 8);
      const a = rand(1, b - 1); const c = rand(1, d - 1);
      const add = kind === 0 || a * d <= c * b;
      const top = add ? a * d + c * b : a * d - c * b;
      const answer = fracText(top, b * d);
      const wrongs = [`${add ? a + c : Math.abs(a - c)}/${b + d}`, `${add ? a + c : Math.abs(a - c)}/${b * d}`, fracText(top + 1, b * d)];
      return text(`${a}/${b} ${add ? '+' : '−'} ${c}/${d} = ?`, answer, wrongs.filter((w) => w !== answer));
    }
    if (kind === 2) {
      const a = rand(1, 5); const b = rand(a + 1, 8); const c = rand(1, 5); const d = rand(c + 1, 9);
      const answer = fracText(a * c, b * d);
      return text(`${a}/${b} × ${c}/${d} = ?`, answer, [`${a + c}/${b + d}`, fracText(a * d, b * c), `${a * c}/${b + d}`].filter((w) => w !== answer));
    }
    if (kind === 3) {
      const d = pick([3, 4, 5, 6, 8]); const whole = rand(1, 4); const n = rand(1, d - 1);
      const answer = `${whole} ${n}/${d}`;
      return text(`Write ${whole * d + n}/${d} as a mixed number.`, answer, [`${whole + 1} ${n}/${d}`, `${whole} ${n + 1 < d ? n + 1 : n - 1}/${d}`, `${n} ${whole}/${d}`].filter((w) => w !== answer));
    }
    const [f, p] = pick([['3/4', 75], ['2/5', 40], ['7/20', 35], ['9/25', 36], ['3/8', 37.5], ['1/8', 12.5], ['4/5', 80]]);
    return num(`${f} as a percentage is ?%`, p, [p + 5, p - 5, p * 2 > 100 ? p / 2 : p * 2]);
  },

  angles() {
    const kind = rand(0, 5);
    noteType(['y7-exterior-angle', 'y7-co-interior', 'y7-alternate', 'y7-polygon-angle-sum', 'y7-regular-polygon-angle', 'y7-isosceles-base'][kind]);
    if (kind === 0) { const a = rand(35, 70); const b = rand(30, 75); return num(`Two angles of a triangle are ${a}° and ${b}°. What is the exterior angle at the third corner, in degrees?`, a + b, [180 - a - b, 360 - a - b]); }
    if (kind === 1) { const a = rand(50, 130); return num(`Two parallel lines are cut by a transversal. One co-interior angle is ${a}°. What is the other, in degrees?`, 180 - a, [a, 360 - a]); }
    if (kind === 2) { const a = rand(35, 140); return num(`Two parallel lines are cut by a transversal. One angle is ${a}°. What is its alternate angle, in degrees?`, a, [180 - a, 90 + (a % 30)]); }
    if (kind === 3) { const n = rand(5, 10); return num(`What do the interior angles of a ${n}-sided polygon add to, in degrees?`, (n - 2) * 180, [n * 180, (n - 1) * 180]); }
    if (kind === 4) {
      const [n, each, name] = pick([[5, 108, 'pentagon'], [6, 120, 'hexagon'], [8, 135, 'octagon'], [10, 144, 'decagon']]);
      return num(`Each interior angle of a regular ${name} is how many degrees?`, each, [360 / n, each - 15, each + 15]);
    }
    const apex = pick([20, 30, 40, 50, 60, 70, 80, 100]);
    return num(`An isosceles triangle has a ${apex}° angle between its equal sides. What is each base angle, in degrees?`, (180 - apex) / 2, [180 - apex, apex, 90 - apex / 4]);
  },

  time() {
    const kind = rand(0, 4);
    noteType(['y7-time-zone', 'y7-distance', 'y7-travel-time', 'y7-overnight-duration', 'y7-decimal-hours'][kind]);
    if (kind === 0) {
      const hour = rand(2, 11);
      const back = hour - 2;
      return text(`It is ${hour}:00 pm in Sydney. Perth is 2 hours behind. What time is it in Perth?`, `${back === 0 ? 12 : back}:00 pm`, [`${hour + 2 > 12 ? hour - 10 : hour + 2}:00 pm`, `${hour - 1}:00 pm`, `${back === 0 ? 12 : back}:00 am`]);
    }
    if (kind === 1) { const s = pick([40, 60, 80, 120]); const t = pick([1.5, 2, 2.5, 3]); return num(`A drone flies at ${s} km/h for ${t} hours. How many km does it travel?`, s * t, [s + t, s * Math.floor(t)]); }
    if (kind === 2) { const s = pick([30, 50, 60, 90]); const t = pick([2, 3, 4]); return num(`A convoy travels ${s * t} km at ${s} km/h. How many hours does it take?`, t, [t + 1, s * t / 10]); }
    if (kind === 3) {
      const startH = rand(21, 23); const startM = pick([10, 20, 40, 50]); const len = pick([95, 125, 155, 185]);
      const end = (startH * 60 + startM + len) % 1440;
      const endText = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
      return num(`A night patrol runs from ${startH}:${startM} to ${endText}. How many minutes is that?`, len, [len - 60, len + 60]);
    }
    const [h, m] = pick([[2.25, 135], [1.75, 105], [3.5, 210], [0.75, 45], [1.2, 72]]);
    return num(`${h} hours is how many minutes?`, m, [Math.round(h * 100), m + 15]);
  },

  length() {
    const kind = rand(0, 4);
    noteType(['y7-triangle-area', 'y7-parallelogram-area', 'y7-composite-area', 'y7-convert-metric', 'y7-map-scale'][kind]);
    if (kind === 0) { const b = rand(3, 12) * 2; const h = rand(3, 12); return num(`A triangle has a base of ${b} cm and a height of ${h} cm. What is its area in cm²?`, (b * h) / 2, [b * h, b + h]); }
    if (kind === 1) { const b = rand(4, 15); const h = rand(3, 10); return num(`A parallelogram has a base of ${b} m and a height of ${h} m. What is its area in m²?`, b * h, [(b * h) / 2, 2 * (b + h)]); }
    if (kind === 2) {
      const L = rand(8, 14); const W = rand(5, 9); const l = rand(2, 4); const w = rand(2, 3);
      return num(`A ${L} m × ${W} m garden has a ${l} m × ${w} m corner paved over. What area of grass is left, in m²?`, L * W - l * w, [L * W, L * W - l - w]);
    }
    if (kind === 3) {
      return pick([
        () => { const km = rand(12, 49) / 10; return num(`${km} km = how many metres?`, km * 1000, [km * 100, km * 10000]); },
        () => { const mm = rand(11, 49) * 100; return num(`${mm} mm = how many metres?`, mm / 1000, [mm / 100, mm / 10]); },
        () => { const m = rand(15, 95) / 100; return num(`${m} m = how many millimetres?`, m * 1000, [m * 100, m * 10]); },
      ])();
    }
    const cm = rand(2, 9);
    return num(`A map has a scale of 1 : 50 000. Two towers are ${cm} cm apart on the map. How many km apart are they really?`, cm / 2, [cm * 5, cm * 50]);
  },

  mass() {
    const kind = rand(0, 4);
    noteType(['y7-tank-litres', 'y7-price-per-kg', 'y7-better-value', 'y7-convert-units', 'y7-cans-to-litres'][kind]);
    if (kind === 0) {
      const [l, w, h] = pick([[50, 40, 30], [20, 20, 25], [40, 25, 20], [30, 30, 20], [60, 20, 25]]);
      return num(`A tank is ${l} cm × ${w} cm × ${h} cm. How many litres does it hold? (1000 cm³ = 1 L)`, (l * w * h) / 1000, [l * w * h / 100, l + w + h]);
    }
    if (kind === 1) { const kg = pick([1.5, 2, 2.5, 4]); const per = pick([2, 4, 6]); return num(`${kg} kg of rice costs $${kg * per}. What is the price per kg, in dollars?`, per, [kg * per / 2, per + 1]); }
    if (kind === 2) {
      return pick([
        () => text('Which is better value?', '1 kg for $5', ['500 g for $3', '250 g for $2', '750 g for $4.50']),
        () => text('Which is better value?', '2 L for $3', ['1 L for $2', '500 mL for $1', '1.5 L for $2.70']),
      ])();
    }
    if (kind === 3) {
      return pick([
        () => { const kg = rand(11, 95) / 100; return num(`${kg} kg = how many grams?`, kg * 1000, [kg * 100, kg * 10]); },
        () => { const ml = rand(21, 89) * 50; return num(`${ml} mL = how many litres?`, ml / 1000, [ml / 100, ml / 10]); },
        () => { const t = rand(11, 35) / 10; return num(`${t} tonnes = how many kg?`, t * 1000, [t * 100, t * 10]); },
      ])();
    }
    const cans = pick([6, 12, 24]); const ml = pick([250, 375, 500]);
    return num(`A box holds ${cans} cans of ${ml} mL. How many litres is that altogether?`, (cans * ml) / 1000, [cans * ml / 100, cans + ml / 1000]);
  },

  decimals() {
    const kind = rand(0, 6);
    noteType(['y7-percent-of', 'y7-percent-increase', 'y7-sale-price', 'y7-share-ratio', 'y7-simplify-ratio', 'y7-multiply-decimals', 'y7-fraction-to-decimal'][kind]);
    if (kind === 0) { const p = pick([15, 35, 45, 60, 85]); const n = rand(2, 9) * 20; return num(`What is ${p}% of ${n}?`, (p * n) / 100, [p + n / 10, (p * n) / 10]); }
    if (kind === 1) { const price = rand(4, 16) * 20; const up = pick([10, 15, 20, 25]); return num(`A $${price} game goes up by ${up}%. What is the new price, in dollars?`, price * (1 + up / 100), [price + up, price * (1 - up / 100)]); }
    if (kind === 2) { const price = rand(3, 12) * 20; const off = pick([20, 25, 30, 40]); return num(`A $${price} jacket is ${off}% off. What is the sale price, in dollars?`, price * (1 - off / 100), [price - off, price * off / 100]); }
    if (kind === 3) { const a = rand(2, 5); const b = rand(a + 1, 8); const u = rand(3, 9); return num(`Share ${(a + b) * u} supplies in the ratio ${a}:${b}. How many are in the larger share?`, b * u, [a * u, (a + b) * u / 2]); }
    if (kind === 4) {
      const [x, y] = pick([[12, 18], [15, 25], [16, 24], [21, 28], [18, 30], [20, 35]]);
      const g = gcd(x, y);
      return text(`Simplify the ratio ${x}:${y}.`, `${x / g}:${y / g}`, [`${y / g}:${x / g}`, `${x / 2}:${y / 2}`, `${x - g}:${y - g}`].filter((r) => r !== `${x / g}:${y / g}`));
    }
    if (kind === 5) { const [a, b] = pick([[0.4, 0.3], [1.5, 0.2], [0.6, 0.5], [2.5, 0.4], [0.7, 0.8]]); return num(`${a} × ${b} = ?`, a * b, [a * b * 10, a + b]); }
    const [f, dec] = pick([['3/8', 0.375], ['5/8', 0.625], ['7/20', 0.35], ['1/8', 0.125], ['9/20', 0.45]]);
    return num(`Write ${f} as a decimal.`, dec, [dec * 10, Number(f.split('/')[0]) / 10]);
  },
};

const TOPIC_KEYS = {
  operations: 'operations',
  fractions: 'fractions',
  angles: 'angles',
  time: 'time',
  'measurement-length': 'length',
  'mass-capacity': 'mass',
  'decimals-percent': 'decimals',
};

/**
 * A question for Level 1 (Year 2) or Level 6 (Year 7).
 * @param {string} topicId @param {1|6} level
 * @returns {Question}
 */
export function extraLevelQuestion(topicId, level) {
  const key = TOPIC_KEYS[topicId] ?? 'operations';
  if (level === 1) {
    const make = key === 'decimals' ? year2.money : key === 'length' ? year2.length : key === 'mass' ? year2.mass : year2[key];
    return make();
  }
  return year7[key]();
}
