/**
 * Friend challenges without accounts or a server: a short code holds a siege score and a
 * check value, so a friend can type it in and try to beat it in the same battle.
 * Every siege uses the same alien waves, so the fight is fair.
 */

/** No 0/O, 1/I/L so kids can read codes off a screen without mix-ups. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const PREFIX = 'GRAN-';
/** Two characters hold 31 × 31 values. */
const MAX_SCORE = ALPHABET.length * ALPHABET.length - 1;

/** @param {number} score */
function check(score) {
  return ((score * 7919 + 4243) ^ 0x2a5) % 961;
}

/** @param {number} value @param {number} digits */
function toChars(value, digits) {
  let out = '';
  for (let i = 0; i < digits; i++) {
    out = ALPHABET[value % ALPHABET.length] + out;
    value = Math.floor(value / ALPHABET.length);
  }
  return out;
}

/** @param {string} chars */
function fromChars(chars) {
  let value = 0;
  for (const ch of chars) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) return -1;
    value = value * ALPHABET.length + i;
  }
  return value;
}

/** @param {number} score Aliens blasted in the siege. @returns {string} e.g. "GRAN-7Q4K" */
export function makeChallengeCode(score) {
  const s = Math.max(0, Math.min(MAX_SCORE, Math.floor(score)));
  return `${PREFIX}${toChars(s, 2)}${toChars(check(s), 2)}`;
}

/** @param {string} input @returns {number|null} The score to beat, or null if the code is not real. */
export function readChallengeCode(input) {
  const clean = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^GRAN/, '');
  if (clean.length !== 4) return null;
  const score = fromChars(clean.slice(0, 2));
  const sum = fromChars(clean.slice(2));
  if (score < 0 || sum < 0 || score > MAX_SCORE || check(score) !== sum) return null;
  return score;
}
