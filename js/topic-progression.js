import { MATH_TOPICS } from './topics-data.js?v=20261113h1';

/**
 * Topic Rank is an endlessly repeatable *game* progression, separate from
 * the four permanent level-mastery qualifications and the shared Forge XP.
 *
 * Rank rises only from actually answered questions and successful missions,
 * not from just opening a module or repeatedly clicking its card.
 */
export const TOPIC_XP_PER_CORRECT = Object.freeze({ 1: 8, 2: 8, 3: 9, 4: 9, 5: 10, 6: 10 });
export const TOPIC_MISSION_BONUS = 12;
export const TOPIC_RANK_MILESTONE_INTERVAL = 5;
export const TOPIC_RANK_MILESTONE_FORGE_XP = 35;
const MAX_TOPIC_XP = 1_000_000_000;
const TOPIC_IDS = new Set(MATH_TOPICS.map((topic) => topic.id));

/** @typedef {{ xp: number, answered: number, correct: number, missions: number }} TopicRecord */
/** @typedef {Record<string, TopicRecord>} TopicProgressSave */

/** @param {unknown} raw @returns {number} */
function safeCount(raw) {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n >= 0 ? Math.min(MAX_TOPIC_XP, n) : 0;
}

/** @param {number} rank A rank of at least 1. */
export function topicXpForRank(rank) {
  const n = Math.max(0, Math.floor(Number(rank) || 1) - 1);
  return 42 * n + 14 * n * n;
}

/** @param {number} totalXp */
export function topicRankProgress(totalXp) {
  const xp = safeCount(totalXp);
  // Invert 14n² + 42n, where n = rank - 1; protect floating point edges.
  const approx = Math.floor((Math.sqrt(42 * 42 + 56 * xp) - 42) / 28);
  let rank = Math.max(1, approx + 1);
  while (topicXpForRank(rank + 1) <= xp) rank += 1;
  while (rank > 1 && topicXpForRank(rank) > xp) rank -= 1;
  const floor = topicXpForRank(rank);
  const ceiling = topicXpForRank(rank + 1);
  return {
    rank,
    xp,
    current: xp - floor,
    required: ceiling - floor,
    remaining: ceiling - xp,
    percent: Math.max(0, Math.min(100, Math.round((xp - floor) * 100 / (ceiling - floor)))),
    nextRank: rank + 1,
    nextMilestone: Math.ceil((rank + 1) / TOPIC_RANK_MILESTONE_INTERVAL) * TOPIC_RANK_MILESTONE_INTERVAL,
  };
}

/**
 * Saved pre-rank players keep credit for *real confirmed* mastery and
 * charted-map passes. We don't invent historical question counts or Forge XP.
 * This is a one-time starting-rank credit and never pays out bonuses again.
 *
 * @param {unknown} raw
 * @param {Record<string, number[]>} [mastery]
 * @param {Record<string, number>} [mapProgress]
 * @returns {TopicProgressSave}
 */
export function normalizeTopicProgress(raw, mastery = {}, mapProgress = {}) {
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const id of TOPIC_IDS) {
    const existing = data[id];
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      out[id] = {
        xp: safeCount(existing.xp),
        answered: safeCount(existing.answered),
        correct: safeCount(existing.correct),
        missions: safeCount(existing.missions),
      };
      out[id].correct = Math.min(out[id].correct, out[id].answered);
    } else {
      const levels = Array.isArray(mastery?.[id]) ? new Set(mastery[id].filter((n) => [1, 2, 3, 4, 5, 6].includes(n))) : new Set();
      const knownMapPasses = Math.min(10, safeCount(mapProgress?.[id]));
      out[id] = {
        xp: levels.size * 60 + knownMapPasses * 8,
        answered: 0,
        correct: 0,
        missions: 0,
      };
    }
  }
  return out;
}

/** @param {TopicProgressSave} progress @param {string} id */
export function getTopicRecord(progress, id) {
  return progress?.[id] || { xp: 0, answered: 0, correct: 0, missions: 0 };
}

function milestoneRewards(oldRank, newRank) {
  const oldTier = Math.floor(oldRank / TOPIC_RANK_MILESTONE_INTERVAL);
  const newTier = Math.floor(newRank / TOPIC_RANK_MILESTONE_INTERVAL);
  return Math.max(0, newTier - oldTier) * TOPIC_RANK_MILESTONE_FORGE_XP;
}

/**
 * @param {TopicProgressSave} progress
 * @param {string} id
 * @param {1|2|3|4|5|6} level
 * @param {boolean} right
 * @param {number} [multiplier] Topic XP multiplier, e.g. 2 for the daily hot topic.
 */
export function recordTopicAnswer(progress, id, level, right, multiplier = 1) {
  if (!TOPIC_IDS.has(id)) return { progress, addedXp: 0, newRank: 1, rankUp: false, bonusForgeXp: 0 };
  const old = getTopicRecord(progress, id);
  const before = topicRankProgress(old.xp).rank;
  const addedXp = right ? (TOPIC_XP_PER_CORRECT[level] || TOPIC_XP_PER_CORRECT[1]) * multiplier : 0;
  const xp = Math.min(MAX_TOPIC_XP, old.xp + addedXp);
  const record = {
    ...old,
    xp,
    answered: Math.min(MAX_TOPIC_XP, old.answered + 1),
    correct: Math.min(MAX_TOPIC_XP, old.correct + (right ? 1 : 0)),
  };
  const newRank = topicRankProgress(xp).rank;
  return {
    progress: { ...progress, [id]: record },
    addedXp: xp - old.xp,
    newRank,
    rankUp: newRank > before,
    bonusForgeXp: milestoneRewards(before, newRank),
  };
}

/**
 * Completing a proper session is worth one modest topic-XP bonus if
 * accuracy is at least 80%. Answer XP is saved separately as questions land.
 * @param {TopicProgressSave} progress
 * @param {string} id
 * @param {number} accuracy
 * @param {number} [multiplier] Topic XP multiplier, e.g. 2 for the daily hot topic.
 */
export function recordTopicSession(progress, id, accuracy, multiplier = 1) {
  if (!TOPIC_IDS.has(id)) return { progress, addedXp: 0, newRank: 1, rankUp: false, bonusForgeXp: 0 };
  const old = getTopicRecord(progress, id);
  const before = topicRankProgress(old.xp).rank;
  const addedXp = Number.isFinite(accuracy) && accuracy >= .8 ? TOPIC_MISSION_BONUS * multiplier : 0;
  const xp = Math.min(MAX_TOPIC_XP, old.xp + addedXp);
  const record = { ...old, xp, missions: Math.min(MAX_TOPIC_XP, old.missions + 1) };
  const newRank = topicRankProgress(xp).rank;
  return {
    progress: { ...progress, [id]: record },
    addedXp: xp - old.xp,
    newRank,
    rankUp: newRank > before,
    bonusForgeXp: milestoneRewards(before, newRank),
  };
}
