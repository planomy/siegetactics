import test from 'node:test';
import assert from 'node:assert/strict';
import { MATH_TOPICS } from '../js/topics-data.js';
import {
  TOPIC_XP_PER_CORRECT,
  TOPIC_MISSION_BONUS,
  TOPIC_RANK_MILESTONE_FORGE_XP,
  topicXpForRank,
  topicRankProgress,
  normalizeTopicProgress,
  getTopicRecord,
  recordTopicAnswer,
  recordTopicSession,
} from '../js/topic-progression.js';

test('all ten topics have independently saved, repeatable ranks', () => {
  const progress = normalizeTopicProgress(null);
  assert.deepEqual(new Set(Object.keys(progress)), new Set(MATH_TOPICS.map(t => t.id)));
  assert.ok(Object.values(progress).every(r => r.xp === 0 && r.answered === 0 && r.missions === 0));
  assert.equal(topicRankProgress(0).rank, 1);
  for (let rank = 1; rank <= 80; rank++) {
    const cutoff = topicXpForRank(rank);
    assert.equal(topicRankProgress(cutoff).rank, rank);
    if (rank > 1) assert.equal(topicRankProgress(cutoff - 1).rank, rank - 1);
  }
  assert.ok(topicXpForRank(80) > topicXpForRank(5));
});

test('wrong answers never farm XP; correct answers at higher maths levels earn more', () => {
  const initial = normalizeTopicProgress();
  const wrong = recordTopicAnswer(initial, 'fractions', 4, false);
  assert.equal(wrong.addedXp, 0);
  assert.equal(wrong.progress.fractions.answered, 1);
  assert.equal(wrong.progress.fractions.correct, 0);
  const easy = recordTopicAnswer(wrong.progress, 'fractions', 1, true);
  const hard = recordTopicAnswer(easy.progress, 'fractions', 4, true);
  assert.equal(easy.addedXp, TOPIC_XP_PER_CORRECT[1]);
  assert.equal(hard.addedXp, TOPIC_XP_PER_CORRECT[4]);
  assert.ok(hard.addedXp > easy.addedXp);
  assert.equal(hard.progress.fractions.answered, 3);
  assert.equal(hard.progress.fractions.correct, 2);
  assert.equal(hard.progress['times-tables'].xp, 0);
});

test('completed maths sessions add a modest accuracy-based bonus, never gate repeats', () => {
  const initial = normalizeTopicProgress();
  const weak = recordTopicSession(initial, 'times-tables', 0.6);
  assert.equal(weak.addedXp, 0);
  assert.equal(weak.progress['times-tables'].missions, 1);
  const solid = recordTopicSession(weak.progress, 'times-tables', 0.8);
  assert.equal(solid.addedXp, TOPIC_MISSION_BONUS);
  assert.equal(solid.progress['times-tables'].missions, 2);
  assert.equal(solid.progress['times-tables'].xp, TOPIC_MISSION_BONUS);
});

test('every fifth topic rank grants a Forge XP milestone only when crossed', () => {
  const initial = normalizeTopicProgress();
  // Place this topic exactly one high-level correct answer below Rank 5.
  initial.operations.xp = topicXpForRank(5) - TOPIC_XP_PER_CORRECT[4];
  const crossed = recordTopicAnswer(initial, 'operations', 4, true);
  assert.equal(crossed.newRank, 5);
  assert.equal(crossed.bonusForgeXp, TOPIC_RANK_MILESTONE_FORGE_XP);
  const following = recordTopicAnswer(crossed.progress, 'operations', 4, true);
  assert.equal(following.bonusForgeXp, 0);
  assert.ok(topicXpForRank(10) > topicXpForRank(5));
});

test('returning players retain confirmed mastery and map achievements as starting ranks', () => {
  const original = normalizeTopicProgress(
    undefined,
    { fractions: [1, 2, 3, 4], operations: [1] },
    { fractions: 8 }
  );
  assert.equal(original.fractions.xp, 4 * 60 + 8 * 8);
  assert.ok(topicRankProgress(original.fractions.xp).rank > 1);
  assert.equal(original.fractions.answered, 0, 'historical answers must not be invented');
  const saved = normalizeTopicProgress(JSON.parse(JSON.stringify(original)), { fractions: [1,2,3,4] }, {fractions: 8});
  assert.deepEqual(saved, original, 'migration runs once, never duplicates previous mastery');
});

test('invalid records and unknown topic ids cannot distort progression', () => {
  const normalized = normalizeTopicProgress({
    fractions: { xp: -50, answered: 2, correct: 999, missions: -3 },
    'made-up': { xp: 999999 },
  });
  assert.equal(normalized.fractions.xp, 0);
  assert.equal(normalized.fractions.correct, 2);
  assert.equal(normalized.fractions.missions, 0);
  assert.equal(Object.hasOwn(normalized, 'made-up'), false);
  const invalid = recordTopicAnswer(normalized, 'fake-topic', 4, true);
  assert.equal(invalid.progress, normalized);
  assert.equal(getTopicRecord(normalized, 'fractions').xp, 0);
});
