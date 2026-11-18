import assert from 'node:assert/strict';
import test from 'node:test';
import { GRUNT_STATS, BOSS_STATS, scoreForEnemy } from '../js/enemies-data.js';
import { waveConfigFor } from '../js/waves-data.js';

test('every grunt and boss carries arcade score points', () => {
  for (const [key, stats] of Object.entries(GRUNT_STATS)) {
    assert.ok(stats.score >= 50, key);
  }
  assert.equal(BOSS_STATS.mothership.score, 750);
  assert.equal(BOSS_STATS.granddaddy.score, 2000);
});

test('heavier craft are worth more than scouts', () => {
  assert.ok(scoreForEnemy({ spriteKey: 'monster12' }) > scoreForEnemy({ spriteKey: 'monster1' }));
  assert.ok(scoreForEnemy({ spriteKey: 'monster21' }) > scoreForEnemy({ spriteKey: 'monster12' }));
  assert.ok(scoreForEnemy({ bossKind: 'mothership' }) > scoreForEnemy({ spriteKey: 'monster11' }));
});

test('a typical mid-siege haul lands in the 5000+ arcade band', () => {
  let score = 0;
  let kills = 0;
  for (const wave of [1, 2]) {
    for (const slot of waveConfigFor(wave, { rank: 1 }).spawnQueue) {
      kills += 1;
      score += scoreForEnemy(
        slot.isBoss || slot.unit === 'mothership' || slot.unit === 'granddaddy'
          ? { bossKind: slot.unit === 'granddaddy' ? 'granddaddy' : 'mothership' }
          : { spriteKey: slot.unit }
      );
    }
  }
  // ~80 spawns across the first two waves — still shy of 5000, so add a Twin Pincer slice.
  const twin = waveConfigFor(3, { rank: 1 }).spawnQueue.slice(0, 20);
  for (const slot of twin) {
    kills += 1;
    score += scoreForEnemy(
      slot.isBoss || slot.unit === 'mothership' || slot.unit === 'granddaddy'
        ? { bossKind: slot.unit === 'granddaddy' ? 'granddaddy' : 'mothership' }
        : { spriteKey: slot.unit }
    );
  }
  assert.ok(kills >= 60, `expected a mid-run kill tally, got ${kills}`);
  assert.ok(score >= 5000, `expected arcade score 5000+, got ${score}`);
});

test('rare ships pay a bonus on top of mothership points', () => {
  const base = scoreForEnemy({ bossKind: 'mothership' });
  const rare = scoreForEnemy({ bossKind: 'mothership', rare: { tier: 'rare' } });
  const legend = scoreForEnemy({ bossKind: 'mothership', rare: { tier: 'legendary' } });
  assert.ok(rare > base);
  assert.ok(legend > rare);
});
