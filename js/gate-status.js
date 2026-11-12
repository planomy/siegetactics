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

export function gateNote() {
  const remaining = Math.max(0, remainingProvider());
  if (remaining === 0) return 'Defences fully charged. Your siege is ready at HQ!';
  return `${remaining} more right answer${remaining === 1 ? '' : 's'} to charge Granny’s defences.`;
}
