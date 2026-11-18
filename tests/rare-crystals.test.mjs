import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RARE_CRYSTAL_BAG_STOCK,
  RARE_CRYSTAL_DRAWS_PER_ROUND,
  buildRareCrystalBag,
  drawRareCrystal,
  normalizeRareCrystalRound,
  rareCrystalTier,
  normalizeCrystalChips,
  addCrystalChip,
  spendCrystalChips,
} from '../js/rare-crystals.js';

test('bag stock is ten 3s, five 5s, two 10s', () => {
  assert.deepEqual(RARE_CRYSTAL_BAG_STOCK, { 3: 10, 5: 5, 10: 2 });
  const bag = buildRareCrystalBag();
  assert.equal(bag.length, 17);
  assert.equal(bag.filter((v) => v === 3).length, 10);
  assert.equal(bag.filter((v) => v === 5).length, 5);
  assert.equal(bag.filter((v) => v === 10).length, 2);
});

test('a 10-set round never exceeds the stock caps', () => {
  let round = normalizeRareCrystalRound(null);
  /** @type {Record<number, number>} */
  const counts = { 3: 0, 5: 0, 10: 0 };
  for (let i = 0; i < RARE_CRYSTAL_DRAWS_PER_ROUND; i++) {
    const draw = drawRareCrystal(round, () => 0.42);
    round = draw.round;
    counts[draw.value] += 1;
    assert.ok(rareCrystalTier(draw.value));
  }
  assert.ok(counts[3] <= 10);
  assert.ok(counts[5] <= 5);
  assert.ok(counts[10] <= 2);
  assert.equal(counts[3] + counts[5] + counts[10], 10);
  assert.equal(round.draws, 10);
});

test('round rolls over after ten draws with a fresh bag', () => {
  let round = { bag: [3, 5, 10], draws: 9 };
  const last = drawRareCrystal(round, () => 0);
  assert.equal(last.round.draws, 10);
  const next = drawRareCrystal(last.round, () => 0);
  assert.equal(next.round.draws, 1);
  assert.equal(next.round.bag.length, 16);
});

test('tiers have distinct ids for styling', () => {
  assert.equal(rareCrystalTier(3)?.id, 'spark');
  assert.equal(rareCrystalTier(5)?.id, 'pulse');
  assert.equal(rareCrystalTier(10)?.id, 'nova');
  assert.match(rareCrystalTier(3)?.title ?? '', /×3/);
  assert.match(rareCrystalTier(5)?.title ?? '', /×5/);
  assert.match(rareCrystalTier(10)?.title ?? '', /×10/);
});

test('vault chips track rare looks and refund spare on overspend', () => {
  let chips = normalizeCrystalChips(null, 0);
  chips = addCrystalChip(chips, 3, 'spark');
  chips = addCrystalChip(chips, 10, 'nova');
  chips = addCrystalChip(chips, 1, 'basic');
  assert.equal(chips.reduce((n, c) => n + c.value, 0), 14);
  // Spend basics first so the nova stays in the glass when the bill is small.
  chips = spendCrystalChips(chips, 4);
  assert.equal(chips.reduce((n, c) => n + c.value, 0), 10);
  assert.ok(chips.some((c) => c.tierId === 'nova'));
  chips = spendCrystalChips(chips, 6);
  assert.equal(chips.reduce((n, c) => n + c.value, 0), 4);
  assert.ok(chips.every((c) => c.tierId === 'basic'));
});
