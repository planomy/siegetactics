import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStreak, recordStreakAnswer, streakStatus, STREAK_DAILY_GOAL } from '../js/streak.js';
import { challengesFor, normalizeDaily, recordChallengeEvent, rollLuckyDrop, LUCKY } from '../js/daily-challenges.js';
import { makeChallengeCode, readChallengeCode } from '../js/challenge-code.js';
import { checkTrophies, normalizeRecords, TROPHIES } from '../js/trophies.js';
import { STORY_BEATS } from '../js/story.js';

const day = (d) => new Date(2026, 10, d, 10);

function playDay(streak, d, answers = STREAK_DAILY_GOAL) {
  let last;
  for (let i = 0; i < answers; i++) {
    last = recordStreakAnswer(streak, day(d));
    streak = last.streak;
  }
  return last;
}

test('a day only counts towards the streak once ten answers are right', () => {
  const nine = playDay(normalizeStreak(null), 10, STREAK_DAILY_GOAL - 1);
  assert.equal(nine.streak.count, 0);
  assert.equal(streakStatus(nine.streak, day(10)).toGo, 1);
  const ten = recordStreakAnswer(nine.streak, day(10));
  assert.equal(ten.extended, true);
  assert.equal(ten.streak.count, 1);
});

test('consecutive days grow the streak, milestones pay crystals and a missed day resets it', () => {
  let s = normalizeStreak(null);
  let r;
  for (let d = 1; d <= 3; d++) { r = playDay(s, d); s = r.streak; }
  assert.equal(s.count, 3);
  assert.equal(r.milestoneCrystals, 1);
  r = playDay(s, 6);
  assert.equal(r.streak.count, 1);
  assert.equal(r.streak.best, 3);
});

test('a seven-day streak earns a shield that covers one missed day', () => {
  let s = normalizeStreak(null);
  let r;
  for (let d = 1; d <= 7; d++) { r = playDay(s, d); s = r.streak; }
  assert.equal(r.shieldEarned, true);
  assert.equal(streakStatus(s, day(9)).count, 7);
  r = playDay(s, 9);
  assert.equal(r.shieldUsed, true);
  assert.equal(r.streak.count, 8);
  assert.equal(r.streak.shields, 0);
});

test('everyone gets the same three daily challenges on the same day, and they change by day', () => {
  const a = challengesFor('2026-11-13');
  assert.equal(a.length, 3);
  assert.deepEqual(a.map((c) => c.id), challengesFor('2026-11-13').map((c) => c.id));
  assert.equal(new Set(a.map((c) => c.id)).size, 3);
  const days = new Set(Array.from({ length: 10 }, (_, i) => challengesFor(`2026-11-${10 + i}`).map((c) => c.id).join()));
  assert.ok(days.size > 3);
});

test('finishing all three challenges opens the chest once', () => {
  let daily = normalizeDaily(null, '2026-11-13');
  let opened = 0;
  for (const c of challengesFor('2026-11-13')) {
    const event = c.event === 'right-topic' || c.event === 'right-level2' ? 'right' : c.event;
    for (let i = 0; i < c.need; i++) {
      const r = recordChallengeEvent(daily, event, { topic: c.topic, level: 4, amount: c.max ? c.need : 1 });
      daily = r.daily;
      if (r.chestOpened) opened += 1;
    }
  }
  assert.equal(daily.done.length, 3);
  assert.equal(opened, 1);
  assert.equal(normalizeDaily(daily, '2026-11-14').done.length, 0);
});

test('lucky drops are rare and crystal drops are capped each day', () => {
  const daily = normalizeDaily(null, '2026-11-13');
  assert.equal(rollLuckyDrop(daily, () => 0.99), null);
  assert.deepEqual(rollLuckyDrop(daily, () => 0), { kind: 'crystal' });
  assert.equal(rollLuckyDrop({ ...daily, luckyCrystals: LUCKY.maxCrystalsPerDay }, () => 0).kind, 'xp');
});

test('challenge codes round-trip and reject made-up codes', () => {
  for (const score of [0, 1, 42, 97, 512, 960]) {
    const code = makeChallengeCode(score);
    assert.match(code, /^GRAN-[2-9A-Z]{4}$/);
    assert.equal(readChallengeCode(code), score);
    assert.equal(readChallengeCode(code.toLowerCase().replace('-', ' ')), score);
  }
  assert.equal(readChallengeCode('GRAN-ZZZZ'), null);
  assert.equal(readChallengeCode('hello'), null);
});

test('trophies are earned once, from real stats', () => {
  const ctx = {
    records: { ...normalizeRecords(null), siegesWon: 1, bestKills: { v: 120, d: null } },
    rankLevel: 1, streakBest: 0, crystals: 3, maxTurretLevel: 1,
    ownsAllTurrets: false, mapComplete: false, topicRank: () => 1, granddaddyDefeated: false,
  };
  const first = checkTrophies({}, ctx, '2026-11-13');
  assert.deepEqual(first.fresh.map((t) => t.id).sort(), ['first-win', 'smasher']);
  assert.equal(checkTrophies(first.earned, ctx, '2026-11-14').fresh.length, 0);
  assert.equal(new Set(TROPHIES.map((t) => t.id)).size, TROPHIES.length);
});

test('there is a story beat for every career rank', () => {
  assert.equal(STORY_BEATS.length, 6);
  for (let i = 1; i <= 5; i++) assert.ok(STORY_BEATS[i]?.lines.length >= 2);
});

test('hot-streak music starts at five in a row and swells to its cap at ten', async () => {
  const { streakMusicVolume } = await import('../js/music.js');
  assert.equal(streakMusicVolume(4), 0);
  assert.ok(streakMusicVolume(5) > 0);
  assert.ok(streakMusicVolume(8) > streakMusicVolume(6));
  assert.equal(streakMusicVolume(10), streakMusicVolume(25));
  assert.ok(streakMusicVolume(10) <= 0.5);
});

test('gear is bought once, Double Batch needs Mega Cupcakes, and owned gear changes the siege', async () => {
  const { gearStatus, gearEffects, normalizeGear } = await import('../js/gear.js');
  assert.equal(gearStatus('coin-purse', [], 14).state, 'short');
  assert.equal(gearStatus('coin-purse', [], 15).state, 'ready');
  assert.equal(gearStatus('coin-purse', ['coin-purse'], 9).state, 'owned');
  assert.equal(gearStatus('double-batch', [], 99).state, 'needs');
  assert.equal(gearStatus('double-batch', ['mega-cupcakes'], 99).state, 'ready');
  assert.deepEqual(normalizeGear(['coin-purse', 'coin-purse', 'fake']), ['coin-purse']);
  const none = gearEffects([]);
  const all = gearEffects(['reinforced-porch', 'coin-purse', 'alien-magnet', 'pocket-watch', 'mega-cupcakes', 'double-batch']);
  assert.equal(none.extraLeaks + none.extraStartCoins + none.extraSeconds, 0);
  assert.deepEqual([all.extraLeaks, all.extraStartCoins, all.extraSeconds, all.nukeSalvoMul], [2, 20, 10, 2]);
  assert.ok(all.coinMultiplier > 1 && all.nukeDamageMul > 1 && all.nukeAoeMul > 1);
});

test('the green Special Mission button shows about 1 visit in 10, otherwise a gold one that never repeats', async () => {
  const { rerollMissionArt, isSpecialMission, SPECIAL_MISSION_CHANCE } = await import('../js/home.js');
  rerollMissionArt(() => 0.05);
  assert.equal(isSpecialMission(), true);
  rerollMissionArt(() => 0.5);
  assert.equal(isSpecialMission(), false);
  assert.ok(SPECIAL_MISSION_CHANCE > 0 && SPECIAL_MISSION_CHANCE <= 0.15);
});
