/**
 * Daily HOT TOPIC: one topic a day earns double topic XP. The choice comes from the
 * local date, so every player sees the same hot topic all day and a new one tomorrow.
 */
import { MATH_TOPICS } from './topics-data.js';

export const HOT_TOPIC_MULTIPLIER = 2;

/** @param {Date} [now] */
export function hotTopicId(now = new Date()) {
  const topics = MATH_TOPICS.filter((t) => t.available);
  if (!topics.length) return null;
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  // Step through topics with a stride, so consecutive days rarely land on neighbouring cards.
  return topics[(day * 7) % topics.length].id;
}

/** @param {string} topicId @param {Date} [now] */
export function topicXpMultiplier(topicId, now = new Date()) {
  return topicId === hotTopicId(now) ? HOT_TOPIC_MULTIPLIER : 1;
}
