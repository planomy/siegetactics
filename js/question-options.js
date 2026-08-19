/** @param {number|string} value */
function optionKey(value) {
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return `n:${Number(numeric.toFixed(9))}`;
  return `s:${String(value).trim().toLowerCase()}`;
}

/** @param {number|string} a @param {number|string} b */
export function valuesMatch(a, b) {
  return optionKey(a) === optionKey(b);
}

/**
 * Removes repeated answer choices and guarantees that the correct answer is
 * represented exactly once. It deliberately preserves each generator's own
 * labels and distractor style.
 * @template T
 * @param {T & { answer: number|string, options?: { label: string, value: number|string }[] }} question
 * @returns {T}
 */
export function sanitizeQuestionOptions(question) {
  if (!Array.isArray(question.options)) return question;
  const seen = new Set();
  const options = question.options.filter((option) => {
    const key = optionKey(option.value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const answerKey = optionKey(question.answer);
  if (!seen.has(answerKey)) {
    options.push({ label: String(question.answer), value: question.answer });
  }
  return { ...question, options };
}
