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
  // 10/10 is only this set. The invasion bar keeps charge across every maths round until the siege opens.
  return `This set is done — invasion still needs ${remaining} more right answer${remaining === 1 ? '' : 's'} across your maths.`;
}
