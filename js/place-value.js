/**
 * Place Value — ten multiple-choice questions, same pattern as Length Lab
 * and Fractions (not the old one-puzzle forge).
 */

import { initDrillSession } from './drill-session.js?v=20261119c1';
import { makePlaceValueVariant } from './missions-data.js?v=20261114v1';
import { sanitizeQuestionOptions } from './question-options.js?v=20260819b';
import { labelQuestion } from './maths-skills.js';

export const PLACE_VALUE_LAB = {
  questionsPerSession: 10,
  xpPerCorrect: 4,
};

const ROLE_MULT = {
  Ones: 1,
  Tens: 10,
  Hundreds: 100,
  Thousands: 1000,
  'Ten-thousands': 10000,
  'Hundred-thousands': 100000,
  Millions: 1000000,
  'Ten-millions': 10000000,
};

/** @param {unknown[]} values */
function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** @param {number} n */
function fmt(n) {
  return Number(n).toLocaleString();
}

/**
 * @param {import('./difficulty.js?v=20261114k1').DifficultyLevel} level
 * @returns {{ prompt: string, answer: number|string, options: { label: string, value: number|string }[], key?: string }}
 */
export function makePlaceValueQuestion(level) {
  const mission = makePlaceValueVariant(level);
  const slots = mission.slots;
  const total = mission.lockIn.value;
  const parts = slots.map((slot) => Number(slot.options[slot.correctIndex]));
  const kind = Math.floor(Math.random() * 4);

  if (kind === 0) {
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const answer = Number(slot.options[slot.correctIndex]);
    return labelQuestion({
      prompt: `In ${fmt(total)}, what is the value of the ${slot.role.toLowerCase()} digit?`,
      answer,
      options: shuffle(slot.options.map((value) => ({ label: fmt(Number(value)), value: Number(value) }))),
      key: `pv-value:${total}:${slot.role}:${answer}`,
    }, 'place-value-siege', 'digit-value');
  }

  if (kind === 1) {
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const placeValue = Number(slot.options[slot.correctIndex]);
    const mult = ROLE_MULT[slot.role] ?? 1;
    const digit = placeValue / mult;
    const wrongs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== digit)).slice(0, 3);
    return labelQuestion({
      prompt: `In ${fmt(total)}, which digit is in the ${slot.role.toLowerCase()} place?`,
      answer: digit,
      options: shuffle([digit, ...wrongs].map((value) => ({ label: String(value), value }))),
      key: `pv-digit:${total}:${slot.role}:${digit}`,
    }, 'place-value-siege', 'digit-value');
  }

  if (kind === 2) {
    const wrongs = shuffle([
      total + parts[0],
      Math.max(0, total - parts[0]),
      total * 10,
      Math.floor(total / 10),
      total + 10,
      Math.max(0, total - 100),
    ].filter((n) => n !== total)).slice(0, 3);
    return labelQuestion({
      prompt: `Add these place values: ${parts.map(fmt).join(' + ')}. What is the total?`,
      answer: total,
      options: shuffle([total, ...wrongs].map((value) => ({ label: fmt(value), value }))),
      key: `pv-total:${total}`,
    }, 'place-value-siege', 'total');
  }

  const expanded = parts.map(fmt).join(' + ');
  const wrongs = shuffle([
    total + parts[0],
    Math.max(0, total - (parts[1] || 10)),
    total + 11,
    total * 10,
  ].filter((n) => n !== total)).slice(0, 3);
  return labelQuestion({
    prompt: `Which number is ${expanded}?`,
    answer: total,
    options: shuffle([total, ...wrongs].map((value) => ({ label: fmt(value), value }))),
    key: `pv-expand:${total}`,
  }, 'place-value-siege', 'total');
}

/**
 * @param {HTMLElement} host
 * @param {Parameters<typeof initDrillSession>[1]} callbacks
 * @returns {() => void}
 */
export function initPlaceValue(host, callbacks) {
  return initDrillSession(host, {
    title: 'Place Value',
    missionTag: 'Number · Place value',
    quizTag: 'Digits, places & totals',
    difficultyLevel: callbacks.difficultyLevel,
    sessionSize: PLACE_VALUE_LAB.questionsPerSession,
    xpPerCorrect: PLACE_VALUE_LAB.xpPerCorrect,
    makeQuestion: (level) => sanitizeQuestionOptions(makePlaceValueQuestion(level)),
    onAwardXp: callbacks.onAwardXp,
    onAnswer: callbacks.onAnswer,
    onSessionComplete({ accuracy, passed }) {
      callbacks.onSessionComplete?.({ accuracy, passed });
    },
    onHome: callbacks.onHome,
    siegeReady: callbacks.siegeReady,
    gateNote: callbacks.gateNote,
    onAction: callbacks.onAction,
    showToast: callbacks.showToast,
    resume: callbacks.resume,
    onProgress: callbacks.onProgress,
    optionClass: 'place-value-opt',
  });
}
