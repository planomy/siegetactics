/**
 * Daily streak: a day counts once the player gets STREAK_DAILY_GOAL maths answers right.
 * A streak shield (earned every seven days) covers one missed day, so a single sick day
 * never wipes out weeks of effort.
 */

export const STREAK_DAILY_GOAL = 10;
export const STREAK_MAX_SHIELDS = 2;
/** Crystals awarded when the streak reaches these lengths. */
export const STREAK_MILESTONES = /** @type {Record<number, number>} */ ({ 3: 1, 7: 2, 14: 3, 30: 5, 50: 5, 100: 10 });

/** @typedef {{ count: number, best: number, lastDay: string|null, shields: number, todayKey: string|null, todayRight: number }} StreakSave */

/** @param {Date} [now] @returns {string} Local calendar day, e.g. "2026-11-13". */
export function localDayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** @param {string} key */
function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

/** @param {any} raw @returns {StreakSave} */
export function normalizeStreak(raw) {
  const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
  const key = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  return {
    count: n(raw?.count),
    best: Math.max(n(raw?.best), n(raw?.count)),
    lastDay: key(raw?.lastDay),
    shields: Math.min(STREAK_MAX_SHIELDS, n(raw?.shields)),
    todayKey: key(raw?.todayKey),
    todayRight: n(raw?.todayRight),
  };
}

/**
 * The streak as the player should see it today: still alive if the last counted day was
 * today or yesterday, or the day before with a shield to cover the gap.
 * @param {StreakSave} streak @param {Date} [now]
 */
export function streakStatus(streak, now = new Date()) {
  const today = localDayKey(now);
  const todayRight = streak.todayKey === today ? streak.todayRight : 0;
  const doneToday = streak.lastDay === today;
  let alive = false;
  if (streak.lastDay) {
    const gap = dayNumber(today) - dayNumber(streak.lastDay);
    alive = gap <= 1 || (gap === 2 && streak.shields > 0);
  }
  return {
    count: alive ? streak.count : 0,
    doneToday,
    todayRight: Math.min(STREAK_DAILY_GOAL, todayRight),
    toGo: doneToday ? 0 : Math.max(0, STREAK_DAILY_GOAL - todayRight),
    shields: streak.shields,
    best: streak.best,
  };
}

/**
 * Count one right answer. When today's goal is reached for the first time, the streak grows.
 * @param {StreakSave} streak @param {Date} [now]
 * @returns {{ streak: StreakSave, extended: boolean, milestoneCrystals: number, shieldUsed: boolean, shieldEarned: boolean }}
 */
export function recordStreakAnswer(streak, now = new Date()) {
  const today = localDayKey(now);
  const next = { ...streak };
  if (next.todayKey !== today) {
    next.todayKey = today;
    next.todayRight = 0;
  }
  next.todayRight += 1;
  const result = { streak: next, extended: false, milestoneCrystals: 0, shieldUsed: false, shieldEarned: false };
  if (next.lastDay === today || next.todayRight < STREAK_DAILY_GOAL) return result;

  const gap = next.lastDay ? dayNumber(today) - dayNumber(next.lastDay) : Infinity;
  if (gap === 1) {
    next.count += 1;
  } else if (gap === 2 && next.shields > 0) {
    next.shields -= 1;
    next.count += 1;
    result.shieldUsed = true;
  } else {
    next.count = 1;
  }
  next.lastDay = today;
  next.best = Math.max(next.best, next.count);
  if (next.count % 7 === 0 && next.shields < STREAK_MAX_SHIELDS) {
    next.shields += 1;
    result.shieldEarned = true;
  }
  result.extended = true;
  result.milestoneCrystals = STREAK_MILESTONES[next.count] ?? 0;
  return result;
}
