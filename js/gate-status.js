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

export function gateNote() {
  const remaining = gateRemaining();
  if (remaining === 0) return 'Defences fully charged. Your siege is ready at HQ!';
  // Drill score (e.g. 10/10) is only this set — the invasion bar needs a full charge across all maths.
  return `This drill is done — invasion still needs ${remaining} more right answer${remaining === 1 ? '' : 's'}.`;
}
