import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSiegeRecord, recordSiege, siegeRankLevel, rankProgressText } from '../js/siege-ranks.js';

const perfect = [true, true, true, true, true];

test('one perfect siege earns Recruit, not Marshal', () => {
  const record = recordSiege(normalizeSiegeRecord(null), perfect);
  assert.equal(siegeRankLevel(record), 1);
  assert.equal(rankProgressText(record, 1), '1/3');
});

test('ranks climb with lifetime results and are earned in order', () => {
  let record = normalizeSiegeRecord(null);
  for (let i = 0; i < 3; i++) record = recordSiege(record, perfect);
  assert.equal(siegeRankLevel(record), 2);
  for (let i = 0; i < 2; i++) record = recordSiege(record, perfect);
  assert.equal(siegeRankLevel(record), 3);
  for (let i = 0; i < 15; i++) record = recordSiege(record, perfect);
  assert.equal(siegeRankLevel(record), 5);
  assert.equal(siegeRankLevel({ played: 1, wave1: 0, won: 0, won5: 0, won2: 30 }), 1);
});

test('older saves keep their siege count but start the other tallies from zero', () => {
  const record = normalizeSiegeRecord(undefined, 4);
  assert.deepEqual(record, { played: 4, wave1: 0, won: 0, won5: 0, won2: 0 });
  assert.equal(siegeRankLevel(record), 1);
});
