import test from 'node:test';
import assert from 'node:assert/strict';

/** Mirrors the save migration floor used in app.js loadSave. */
function migrateTotalScore(rawTotal, bestScore) {
  const savedTotal = Math.max(0, Math.floor(Number(rawTotal) || 0));
  const bestFloor = Object.values(bestScore || {}).reduce(
    (sum, n) => sum + Math.max(0, Math.floor(Number(n) || 0)),
    0,
  );
  return Math.max(savedTotal, bestFloor);
}

test('lifetime score uses saved total when higher than best-score floor', () => {
  assert.equal(migrateTotalScore(12000, { a: 5000, b: 4000 }), 12000);
});

test('lifetime score backfills from per-mission bests for older saves', () => {
  assert.equal(migrateTotalScore(0, { a: 5200, b: 3100 }), 8300);
  assert.equal(migrateTotalScore(undefined, {}), 0);
});

test('siege score accumulates onto lifetime total', () => {
  let totalScore = 1000;
  const siegeScore = 5400;
  totalScore = Math.max(0, Math.floor(Number(totalScore) || 0)) + siegeScore;
  assert.equal(totalScore, 6400);
});
