/**
 * Three small goals a day, the same for every player on the same date, plus surprise
 * "lucky drops" on right answers. Every reward comes from doing maths or defending
 * Granny, never from waiting or paying.
 */

/** @typedef {'right'|'right-topic'|'right-level2'|'siege-won'|'siege-won-3'|'siege-kills'|'boss'|'quest80'|'nuke'} ChallengeEvent */
/** @typedef {{ id: string, text: string, event: ChallengeEvent, need: number, topic?: string, xp: number, max?: boolean }} DailyChallenge */
/** @typedef {{ day: string|null, progress: Record<string, number>, done: string[], chest: boolean, luckyCrystals: number }} DailySave */

export const DAILY_CHEST_XP = 50;

export const LUCKY = {
  /** Chance that a right answer triggers a lucky drop. */
  chance: 1 / 16,
  /** Share of lucky drops that are a crystal rather than bonus XP. */
  crystalShare: 0.25,
  maxCrystalsPerDay: 2,
  xp: 25,
};

const TOPICS = [
  { id: 'times-tables', title: 'times tables' },
  { id: 'fractions', title: 'fractions' },
  { id: 'measurement-length', title: 'length' },
  { id: 'angles', title: 'angles and shapes' },
  { id: 'mass-capacity', title: 'mass and capacity' },
  { id: 'operations', title: 'operations' },
  { id: 'decimals-percent', title: 'decimals and percentages' },
  { id: 'time', title: 'time' },
];

/** @type {DailyChallenge[]} */
const MATHS = [
  { id: 'right-15', text: 'Get 15 maths questions right', event: 'right', need: 15, xp: 30 },
  { id: 'right-25', text: 'Get 25 maths questions right', event: 'right', need: 25, xp: 45 },
  { id: 'right-l2', text: 'Get 10 right on Level 2 or higher', event: 'right-level2', need: 10, xp: 40 },
  { id: 'quest80', text: 'Score 80% or better on a Maths Quest', event: 'quest80', need: 1, xp: 40 },
];

/** @type {DailyChallenge[]} */
const BATTLE = [
  { id: 'siege-won', text: 'Win a siege', event: 'siege-won', need: 1, xp: 30 },
  { id: 'siege-won-3', text: 'Win a siege with 3 or fewer aliens getting through', event: 'siege-won-3', need: 1, xp: 45 },
  { id: 'kills-60', text: 'Blast 60 aliens in one siege', event: 'siege-kills', need: 60, xp: 35, max: true },
  { id: 'kills-90', text: 'Blast 90 aliens in one siege', event: 'siege-kills', need: 90, xp: 50, max: true },
  { id: 'boss', text: 'Defeat a boss alien', event: 'boss', need: 1, xp: 35 },
  { id: 'nuke', text: 'Fire Granny’s nukes', event: 'nuke', need: 1, xp: 30 },
];

/** Small, repeatable random numbers from the date, so everyone gets the same challenges. @param {string} seed */
function seededRandom(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** @param {string} day @returns {DailyChallenge[]} */
export function challengesFor(day) {
  const rand = seededRandom(`granny-${day}`);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const topic = pick(TOPICS);
  const topicChallenge = {
    id: `topic-${topic.id}`,
    text: `Get 8 ${topic.title} questions right`,
    event: /** @type {ChallengeEvent} */ ('right-topic'),
    need: 8,
    topic: topic.id,
    xp: 35,
  };
  const first = rand() < 0.5 ? topicChallenge : pick(MATHS);
  const second = pick(BATTLE);
  const pool = [...MATHS, ...BATTLE, topicChallenge].filter((c) => c.id !== first.id && c.id !== second.id);
  return [first, second, pick(pool)];
}

/** @param {any} raw @param {string} today @returns {DailySave} */
export function normalizeDaily(raw, today) {
  if (!raw || raw.day !== today) return { day: today, progress: {}, done: [], chest: false, luckyCrystals: 0 };
  return {
    day: today,
    progress: raw.progress && typeof raw.progress === 'object' ? { ...raw.progress } : {},
    done: Array.isArray(raw.done) ? raw.done.filter((id) => typeof id === 'string') : [],
    chest: Boolean(raw.chest),
    luckyCrystals: Math.max(0, Math.floor(Number(raw.luckyCrystals) || 0)),
  };
}

/**
 * @param {DailySave} daily
 * @param {ChallengeEvent} event
 * @param {{ amount?: number, topic?: string, level?: number }} [info]
 * @returns {{ daily: DailySave, completed: DailyChallenge[], chestOpened: boolean }}
 */
export function recordChallengeEvent(daily, event, info = {}) {
  const next = { ...daily, progress: { ...daily.progress }, done: [...daily.done] };
  const completed = [];
  for (const c of challengesFor(next.day ?? '')) {
    if (next.done.includes(c.id)) continue;
    let hit = c.event === event;
    if (c.event === 'right-topic') hit = event === 'right' && info.topic === c.topic;
    if (c.event === 'right-level2') hit = event === 'right' && (info.level ?? 1) >= 2;
    if (!hit) continue;
    const amount = info.amount ?? 1;
    next.progress[c.id] = c.max ? Math.max(next.progress[c.id] ?? 0, amount) : (next.progress[c.id] ?? 0) + amount;
    if (next.progress[c.id] >= c.need) {
      next.done.push(c.id);
      completed.push(c);
    }
  }
  let chestOpened = false;
  if (!next.chest && next.done.length >= 3) {
    next.chest = true;
    chestOpened = true;
  }
  return { daily: next, completed, chestOpened };
}

/**
 * @param {DailySave} daily
 * @param {() => number} [random]
 * @returns {null | { kind: 'xp', amount: number } | { kind: 'crystal' }}
 */
export function rollLuckyDrop(daily, random = Math.random) {
  if (random() >= LUCKY.chance) return null;
  if (daily.luckyCrystals < LUCKY.maxCrystalsPerDay && random() < LUCKY.crystalShare) return { kind: 'crystal' };
  return { kind: 'xp', amount: LUCKY.xp };
}
