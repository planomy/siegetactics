import { ECONOMY } from './economy.js';
import { GATE } from './training-gate.js';
import { difficultyTrainingTag } from './difficulty.js';
import { sanitizeQuestionOptions } from './question-options.js?v=20260819b';

/** @typedef {import('./difficulty.js').DifficultyLevel} DifficultyLevel */

export const LENGTH_LAB = {
  questionsPerSession: 10,
  xpPerCorrect: 4,
  unitId: 'measurement-length-lab',
  topicId: 'measurement-length',
};

/** @param {DifficultyLevel} level */
function sessionSize(level) {
  return 10;
}

/**
 * @param {DifficultyLevel} level
 * @returns {{ prompt: string, answer: number, options: { label: string, value: number }[] }}
 */
export function makeLengthQuestion(level) {
  if (level === 1) {
    const kind = pick(['compare-cm-small', 'compare-m-whole', 'longer-or-shorter', 'join-lengths', 'metre-to-cm']);
    if (kind === 'compare-m-whole') {
      const a = pick([1, 2, 3]);
      const b = a + pick([1, 2]);
      const longer = Math.max(a, b);
      const shorter = Math.min(a, b);
      return {
        prompt: `Which is longer: ${shorter} m or ${longer} m?`,
        answer: longer,
        options: shuffle([
          { label: `${shorter} m`, value: shorter },
          { label: `${longer} m`, value: longer },
        ]),
      };
    }
    if (kind === 'longer-or-shorter') {
      const items = pick([
        [{ name: 'pencil', cm: 12 }, { name: 'ruler', cm: 30 }],
        [{ name: 'book', cm: 22 }, { name: 'eraser', cm: 5 }],
        [{ name: 'stick', cm: 45 }, { name: 'coin', cm: 2 }],
      ]);
      const longer = items[0].cm > items[1].cm ? items[0] : items[1];
      return {
        prompt: `Which is longer — the ${items[0].name} (${items[0].cm} cm) or the ${items[1].name} (${items[1].cm} cm)?`,
        answer: longer.cm,
        options: shuffle([
          { label: `${items[0].name} (${items[0].cm} cm)`, value: items[0].cm },
          { label: `${items[1].name} (${items[1].cm} cm)`, value: items[1].cm },
        ]),
      };
    }
    if (kind === 'join-lengths') {
      const first = pick([10, 15, 20, 25, 30]);
      const second = pick([5, 10, 15, 20]);
      const answer = first + second;
      return {
        prompt: `Two ribbons are ${first} cm and ${second} cm long. How long are they altogether?`,
        answer,
        options: shuffle([
          { label: `${answer} cm`, value: answer },
          { label: `${Math.abs(first - second)} cm`, value: Math.abs(first - second) },
          { label: `${answer + 10} cm`, value: answer + 10 },
        ]),
      };
    }
    if (kind === 'metre-to-cm') {
      return {
        prompt: '1 metre equals how many centimetres?',
        answer: 100,
        options: shuffle([
          { label: '100 cm', value: 100 },
          { label: '10 cm', value: 10 },
          { label: '1000 cm', value: 1000 },
        ]),
      };
    }
    const a = pick([8, 12, 15, 18, 22, 25]);
      const b = a + pick([3, 5, 7]);
      const longer = Math.max(a, b);
      const shorter = Math.min(a, b);
      const askLonger = Math.random() > 0.5;
      const answer = askLonger ? longer : shorter;
      const prompt = askLonger
        ? `Which is longer: ${shorter} cm or ${longer} cm?`
        : `Which is shorter: ${shorter} cm or ${longer} cm?`;
      return {
        prompt,
        answer,
        options: shuffle([
          { label: `${shorter} cm`, value: shorter },
          { label: `${longer} cm`, value: longer },
        ]),
      };
  }

  if (level === 2) {
    const kind = pick(['compare-cm', 'compare-m', 'convert-simple', 'mm-to-cm']);
    if (kind === 'compare-cm') {
      const a = pick([25, 34, 45, 56, 67]);
      const b = a + pick([8, 11, 14]);
      const longer = Math.max(a, b);
      const shorter = Math.min(a, b);
      const askLonger = Math.random() > 0.5;
      const answer = askLonger ? longer : shorter;
      const prompt = askLonger
        ? `Which is longer: ${shorter} cm or ${longer} cm?`
        : `Which is shorter: ${shorter} cm or ${longer} cm?`;
      return {
        prompt,
        answer,
        options: shuffle([
          { label: `${shorter} cm`, value: shorter },
          { label: `${longer} cm`, value: longer },
        ]),
      };
    }
    if (kind === 'compare-m') {
      const a = pick([2, 3, 4, 5]);
      const b = a + pick([1, 2]);
      const longer = Math.max(a, b);
      const shorter = Math.min(a, b);
      return {
        prompt: `Which is longer: ${shorter} m or ${longer} m?`,
        answer: longer,
        options: shuffle([
          { label: `${shorter} m`, value: shorter },
          { label: `${longer} m`, value: longer },
        ]),
      };
    }
    if (kind === 'mm-to-cm') {
      const cm = pick([2, 3, 4, 5, 6]);
      const mm = cm * 10;
      return {
        prompt: `${mm} mm = ? cm`,
        answer: cm,
        options: shuffle([
          { label: `${cm} cm`, value: cm },
          { label: `${cm + 1} cm`, value: cm + 1 },
          { label: `${Math.max(1, cm - 1)} cm`, value: Math.max(1, cm - 1) },
        ]),
      };
    }
    const metres = pick([1, 2, 3, 4]);
    const cm = metres * 100;
    const wrong1 = cm + pick([10, 20]);
    const wrong2 = Math.max(10, cm - pick([10, 25]));
    return {
      prompt: `${metres} m = ? cm`,
      answer: cm,
      options: shuffle([
        { label: `${cm} cm`, value: cm },
        { label: `${wrong1} cm`, value: wrong1 },
        { label: `${wrong2} cm`, value: wrong2 },
      ]),
    };
  }

  if (level === 3) {
    const kind = pick(['convert-mixed', 'convert-hard', 'perimeter-rect', 'add-lengths', 'mm-to-cm']);
    if (kind === 'convert-mixed') {
      const metres = pick([1, 2, 3, 4, 5]);
      const extraCm = pick([15, 25, 40, 50, 75]);
      const answer = metres * 100 + extraCm;
      return {
        prompt: `${metres} m ${extraCm} cm = ? cm`,
        answer,
        options: shuffle([
          { label: `${answer} cm`, value: answer },
          { label: `${metres * 100} cm`, value: metres * 100 },
          { label: `${metres * 10 + extraCm} cm`, value: metres * 10 + extraCm },
          { label: `${answer + 100} cm`, value: answer + 100 },
        ]),
      };
    }
    if (kind === 'convert-hard') {
      const cm = pick([150, 225, 250, 350, 475, 550]);
      const metres = cm / 100;
      return {
        prompt: `${cm} cm = ? m`,
        answer: metres,
        options: shuffle([
          { label: `${metres} m`, value: metres },
          { label: `${metres + 1} m`, value: metres + 1 },
          { label: `${cm / 10} m`, value: cm / 10 },
          { label: `${cm / 1000} m`, value: cm / 1000 },
        ]),
      };
    }
    if (kind === 'perimeter-rect') {
      const w = pick([5, 6, 7, 8, 9, 12]);
      const h = pick([3, 4, 5, 6, 7]);
      const p = 2 * (w + h);
      return {
        prompt: `A rectangle is ${w} cm long and ${h} cm wide. What is its perimeter?`,
        answer: p,
        options: shuffle([
          { label: `${p} cm`, value: p },
          { label: `${w * h} cm`, value: w * h },
          { label: `${w + h} cm`, value: w + h },
          { label: `${p + 4} cm`, value: p + 4 },
        ]),
      };
    }
    if (kind === 'add-lengths') {
      const a = pick([125, 150, 175, 225, 250]);
      const b = pick([50, 75, 100, 125]);
      return {
        prompt: `Two cables are ${a} cm and ${b} cm long. What is their total length in centimetres?`,
        answer: a + b,
        options: shuffle([
          { label: `${a + b} cm`, value: a + b },
          { label: `${Math.abs(a - b)} cm`, value: Math.abs(a - b) },
          { label: `${a + b + 100} cm`, value: a + b + 100 },
          { label: `${a + b - 25} cm`, value: a + b - 25 },
        ]),
      };
    }
    const mm = pick([125, 240, 350, 475, 620]);
    const cm = mm / 10;
    return {
      prompt: `${mm} mm = ? cm`,
      answer: cm,
      options: shuffle([
        { label: `${cm} cm`, value: cm },
        { label: `${mm} cm`, value: mm },
        { label: `${mm / 100} cm`, value: mm / 100 },
        { label: `${cm + 10} cm`, value: cm + 10 },
      ]),
    };
  }

  const kind = pick(['kilometres', 'decimal-metres', 'area-rect', 'fence-gap', 'mixed-compare']);
  if (kind === 'kilometres') {
    const km = pick([2, 3, 4, 6, 8, 12]);
    return {
      prompt: `${km} km = ? m`,
      answer: km * 1000,
      options: shuffle([
        { label: `${km * 1000} m`, value: km * 1000 },
        { label: `${km * 100} m`, value: km * 100 },
        { label: `${km * 10} m`, value: km * 10 },
        { label: `${km + 1000} m`, value: km + 1000 },
      ]),
    };
  }
  if (kind === 'decimal-metres') {
    const metres = pick([1.25, 1.5, 2.4, 2.75, 3.6]);
    const cm = metres * 100;
    return {
      prompt: `${metres} m = ? cm`,
      answer: cm,
      options: shuffle([
        { label: `${cm} cm`, value: cm },
        { label: `${metres * 10} cm`, value: metres * 10 },
        { label: `${metres * 1000} cm`, value: metres * 1000 },
        { label: `${cm + 100} cm`, value: cm + 100 },
      ]),
    };
  }
  if (kind === 'area-rect') {
    const w = pick([8, 9, 12, 15, 18]);
    const h = pick([5, 6, 7, 8, 10]);
    const area = w * h;
    return {
      prompt: `A rectangular mat is ${w} m by ${h} m. What is its area in square metres?`,
      answer: area,
      options: shuffle([
        { label: `${area} m²`, value: area },
        { label: `${2 * (w + h)} m²`, value: 2 * (w + h) },
        { label: `${w + h} m²`, value: w + h },
        { label: `${area + w} m²`, value: area + w },
      ]),
    };
  }
  if (kind === 'fence-gap') {
    const w = pick([12, 15, 18, 20]);
    const h = pick([8, 10, 12]);
    const gate = pick([2, 3, 4]);
    const fence = 2 * (w + h) - gate;
    return {
      prompt: `A ${w} m by ${h} m yard needs fencing, except for a ${gate} m gate. How many metres of fence are needed?`,
      answer: fence,
      options: shuffle([
        { label: `${fence} m`, value: fence },
        { label: `${2 * (w + h)} m`, value: 2 * (w + h) },
        { label: `${w * h - gate} m`, value: w * h - gate },
        { label: `${w + h - gate} m`, value: w + h - gate },
      ]),
    };
  }
  const firstCm = pick([125, 175, 225, 275, 350]);
  const secondM = pick([1.5, 2, 2.5, 3, 4]);
  const secondCm = secondM * 100;
  const answer = Math.max(firstCm, secondCm);
  return {
    prompt: `Which is longer: ${firstCm} cm or ${secondM} m?`,
    answer,
    options: shuffle([
      { label: `${firstCm} cm`, value: firstCm },
      { label: `${secondM} m`, value: secondCm },
    ]),
  };
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
 *   onAwardXp: (amount: number) => void,
 *   onSessionComplete: (result: { accuracy: number, passed: boolean }) => void,
 *   onHome: () => void,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 *   unitDone: boolean,
 * }} callbacks
 * @returns {() => void}
 */
export function initMeasurementLength(host, callbacks) {
  /** @type {'quiz'|'done'} */
  let phase = 'quiz';
  /** @type {{ prompt: string, answer: number, options: { label: string, value: number }[] }[]} */
  let deck = [];
  let index = 0;
  let correct = 0;
  let sessionXp = 0;
  let answered = false;
  let sessionReported = false;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let answerTimer = null;
  let lastDone = { accuracy: 0, passed: false };
  let disposed = false;

  function clearAnswerTimer() {
    if (answerTimer != null) {
      clearTimeout(answerTimer);
      answerTimer = null;
    }
  }

  function goHome() {
    if (disposed) return;
    clearAnswerTimer();
    disposed = true;
    callbacks.onHome();
  }

  function startSession() {
    clearAnswerTimer();
    sessionReported = false;
    deck = [];
    const count = sessionSize(callbacks.difficultyLevel);
    const usedPrompts = new Set();
    let guard = 0;
    while (deck.length < count && guard++ < count * 40) {
      const question = sanitizeQuestionOptions(makeLengthQuestion(callbacks.difficultyLevel));
      if (usedPrompts.has(question.prompt)) continue;
      usedPrompts.add(question.prompt);
      deck.push(question);
    }
    index = 0;
    correct = 0;
    sessionXp = 0;
    phase = 'quiz';
    answered = false;
    render();
  }

  function render() {
    if (phase === 'done') renderDone(lastDone.accuracy, lastDone.passed);
    else renderQuiz();
  }

  function renderQuiz() {
    const q = deck[index];
    const opts = q.options
      .map(
        (o) =>
          `<button type="button" class="times-answer-btn length-opt" data-value="${o.value}">${o.label}</button>`
      )
      .join('');

    host.innerHTML = `
      <div class="panel times-panel length-panel">
        <button type="button" class="btn btn-ghost btn-sm times-back" id="length-home">← Home</button>
        <p class="mission-tag">Measurement · Length · ${difficultyTrainingTag(callbacks.difficultyLevel)}</p>
        <h2 class="panel-title">Length Lab</h2>
        <div class="times-quiz-header">
          <span class="times-quiz-tag">Compare & convert</span>
          <span class="times-quiz-progress">${index + 1} / ${deck.length}</span>
        </div>
        <div class="times-question-wrap">
          <p class="times-question length-question">${q.prompt}</p>
        </div>
        <div class="times-answers" id="length-answers">${opts}</div>
        <p class="times-session-xp">Session XP: <strong id="length-session-xp">${sessionXp}</strong></p>
      </div>
    `;

    host.querySelector('#length-home')?.addEventListener('click', goHome);

    host.querySelectorAll('.length-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (answered || disposed) return;
        answered = true;
        const picked = Number(btn.getAttribute('data-value'));
        const right = picked === q.answer;
        btn.classList.add(right ? 'is-correct' : 'is-wrong');
        host.querySelectorAll('.length-opt').forEach((b) => {
          if (Number(b.getAttribute('data-value')) === q.answer) b.classList.add('is-correct');
          b.disabled = true;
        });

        if (right) {
          correct += 1;
          sessionXp += LENGTH_LAB.xpPerCorrect;
          callbacks.onAwardXp(LENGTH_LAB.xpPerCorrect);
          const xpEl = host.querySelector('#length-session-xp');
          if (xpEl) xpEl.textContent = String(sessionXp);
        } else {
          callbacks.showToast(`Correct: ${q.options.find((o) => o.value === q.answer)?.label ?? q.answer}`, {
            variant: 'shop',
          });
        }

        clearAnswerTimer();
        answerTimer = setTimeout(() => {
          answerTimer = null;
          if (disposed) return;
          index += 1;
          if (index >= deck.length) finishSession();
          else {
            answered = false;
            render();
          }
        }, right ? 650 : 950);
      });
    });
  }

  function finishSession() {
    if (sessionReported || disposed || deck.length === 0) return;
    sessionReported = true;
    clearAnswerTimer();
    const accuracy = correct / deck.length;
    const passed = accuracy >= GATE.passAccuracy;
    callbacks.onSessionComplete({ accuracy, passed });
    lastDone = { accuracy, passed };
    phase = 'done';
    renderDone(accuracy, passed);
  }

  /** @param {number} accuracy @param {boolean} passed */
  function renderDone(accuracy, passed) {
    const pct = Math.round(accuracy * 100);
    const gateNote = passed
      ? callbacks.unitDone
        ? 'Already bought time this cycle.'
        : 'Length Lab pushed the attack back!'
      : `Need ${Math.round(GATE.passAccuracy * 100)}%+ to push the attack back.`;
    host.innerHTML = `
      <div class="panel times-panel times-done">
        <p class="mission-tag">Session complete</p>
        <h2 class="panel-title">${correct} / ${deck.length} correct</h2>
        <p class="granny-line">${pct}% on Length Lab. ${gateNote}</p>
        <div class="times-done-xp">
          <span class="times-done-xp-num">+${sessionXp}</span>
          <span class="times-done-xp-label">${ECONOMY.forgeXpLabel}</span>
        </div>
        <div class="times-done-actions">
          <button type="button" class="btn btn-primary" id="length-again">Try again</button>
          <button type="button" class="btn btn-ghost" id="length-home-done">Home</button>
        </div>
      </div>
    `;
    host.querySelector('#length-again')?.addEventListener('click', startSession);
    host.querySelector('#length-home-done')?.addEventListener('click', goHome);
  }

  startSession();

  return () => {
    disposed = true;
    clearAnswerTimer();
  };
}
