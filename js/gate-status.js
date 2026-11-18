/**
 * The end-of-drill line about the siege. Drills import this instead of guessing,
 * so they never say the siege is ready when it is not.
 */

/** @type {() => number} Right answers still needed before the siege opens. */
let remainingProvider = () => 0;

/** @param {() => number} fn */
export function setGateRemainingProvider(fn) {
  remainingProvider = fn;
}

/** Right answers still needed before the siege opens. */
export function gateRemaining() {
  return Math.max(0, remainingProvider());
}

/**
 * End-of-set nudge. Keeps it short: another set of these, or however many rights are still needed.
 * @param {number} [setSize=10] Questions in one round of this topic.
 */
export function gateNote(setSize = 10) {
  const remaining = gateRemaining();
  if (remaining === 0) return 'Defences fully charged. Your siege is ready at HQ!';
  const next = Math.max(1, Math.min(Math.max(1, setSize | 0) || 10, remaining));
  return next === 1 ? 'Answer 1 more of these.' : `Answer ${next} more of these.`;
}
