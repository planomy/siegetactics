/**
 * Friend challenges without accounts or a server: a short code holds a siege
 * score, an optional backyard seed, and a check value. Friends type it in and
 * try to beat the score on the same lawn.
 * Every siege uses the same alien waves, so the fight is fair.
 */

/** No 0/O, 1/I/L so kids can read codes off a screen without mix-ups. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const PREFIX = 'GRAN-';
/** Four characters hold arcade siege scores (31⁴). */
export const MAX_SCORE = ALPHABET.length ** 4 - 1;
/** Legacy two-character payload (old kill challenges). */
const LEGACY_MAX_SCORE = ALPHABET.length ** 2 - 1;
/** Three characters hold the backyard seed (31³). */
export const YARD_SEED_MOD = ALPHABET.length ** 3;

/** @param {number} score */
function checkScore(score) {
  return ((score * 7919 + 4243) ^ 0x2a5) % 961;
}

/** @param {number} score @param {number} seed */
function checkScoreSeed(score, seed) {
  return ((score * 7919 + (seed | 0) * 9973 + 4243) ^ 0x2a5) % 961;
}

/** @param {number} value @param {number} digits */
function toChars(value, digits) {
  let out = '';
  let n = Math.max(0, Math.floor(value));
  for (let i = 0; i < digits; i++) {
    out = ALPHABET[n % ALPHABET.length] + out;
    n = Math.floor(n / ALPHABET.length);
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

/**
 * @typedef {{ score: number, yardSeed: number|null }} ChallengePayload
 */

/**
 * @param {number} score Siege arcade score to beat.
 * @param {number|null|undefined} [yardSeed] Shared backyard seed (omit for score-only codes).
 * @returns {string} e.g. "GRAN-7Q4K2AB3C" (with yard) or "GRAN-7Q4K2A" (score only)
 */
export function makeChallengeCode(score, yardSeed) {
  const s = Math.max(0, Math.min(MAX_SCORE, Math.floor(score)));
  if (yardSeed == null || !Number.isFinite(yardSeed)) {
    return `${PREFIX}${toChars(s, 4)}${toChars(checkScore(s), 2)}`;
  }
  const seed = ((Math.floor(yardSeed) % YARD_SEED_MOD) + YARD_SEED_MOD) % YARD_SEED_MOD;
  return `${PREFIX}${toChars(s, 4)}${toChars(seed, 3)}${toChars(checkScoreSeed(s, seed), 2)}`;
}

/**
 * @param {string} input
 * @returns {ChallengePayload|null} Score (+ yard seed when present), or null if fake.
 */
export function readChallengeCode(input) {
  const clean = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^GRAN/, '');

  // Legacy kill codes: 2 score + 2 check.
  if (clean.length === 4) {
    const score = fromChars(clean.slice(0, 2));
    const sum = fromChars(clean.slice(2));
    if (score < 0 || sum < 0 || score > LEGACY_MAX_SCORE || checkScore(score) !== sum) return null;
    return { score, yardSeed: null };
  }

  // Score only: 4 score + 2 check.
  if (clean.length === 6) {
    const score = fromChars(clean.slice(0, 4));
    const sum = fromChars(clean.slice(4));
    if (score < 0 || sum < 0 || score > MAX_SCORE || checkScore(score) !== sum) return null;
    return { score, yardSeed: null };
  }

  // Legacy yard + kills: 2 score + 3 seed + 2 check.
  if (clean.length === 7) {
    const score = fromChars(clean.slice(0, 2));
    const seed = fromChars(clean.slice(2, 5));
    const sum = fromChars(clean.slice(5));
    if (
      score < 0 ||
      seed < 0 ||
      sum < 0 ||
      score > LEGACY_MAX_SCORE ||
      seed >= YARD_SEED_MOD ||
      checkScoreSeed(score, seed) !== sum
    ) {
      return null;
    }
    return { score, yardSeed: seed };
  }

  // Yard + arcade score: 4 score + 3 seed + 2 check.
  if (clean.length === 9) {
    const score = fromChars(clean.slice(0, 4));
    const seed = fromChars(clean.slice(4, 7));
    const sum = fromChars(clean.slice(7));
    if (
      score < 0 ||
      seed < 0 ||
      sum < 0 ||
      score > MAX_SCORE ||
      seed >= YARD_SEED_MOD ||
      checkScoreSeed(score, seed) !== sum
    ) {
      return null;
    }
    return { score, yardSeed: seed };
  }

  return null;
}
