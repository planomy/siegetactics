/**
 * Granny's Gear: permanent power-ups bought once with Alien Crystals in the Armory.
 * Each one adjusts a setting the siege already has, so gear never needs new battle rules.
 */

/** @typedef {'reinforced-porch'|'coin-purse'|'alien-magnet'|'pocket-watch'|'mega-cupcakes'|'double-batch'} GearId */
/** @typedef {{ id: GearId, name: string, what: string, cost: number, requires?: GearId }} GearDef */

/** @type {GearDef[]} */
export const GEAR = [
  { id: 'reinforced-porch', name: 'Reinforced Porch', what: 'Survive 2 extra aliens getting through every siege.', cost: 20 },
  { id: 'coin-purse', name: 'Granny’s Coin Purse', what: 'Start every siege with 20 extra siege coins.', cost: 15 },
  { id: 'alien-magnet', name: 'Alien Magnet', what: 'Get 25% more siege coins for every alien you blast.', cost: 25 },
  { id: 'pocket-watch', name: 'Granny’s Pocket Watch', what: 'Add 10 seconds to every siege clock.', cost: 20 },
  { id: 'mega-cupcakes', name: 'Mega Cupcakes', what: 'Nukes hit harder and blast a bigger area.', cost: 30 },
  { id: 'double-batch', name: 'Double Batch', what: 'Every nuke fires twice as many cupcakes.', cost: 40, requires: 'mega-cupcakes' },
];

/** @param {GearId} id */
export function gearArt(id) {
  return `assets/gear/${id}.png`;
}

/** @param {unknown} raw @returns {GearId[]} */
export function normalizeGear(raw) {
  if (!Array.isArray(raw)) return [];
  const known = new Set(GEAR.map((g) => g.id));
  return /** @type {GearId[]} */ ([...new Set(raw.filter((id) => known.has(id)))]);
}

/**
 * @param {GearId} id @param {GearId[]} owned @param {number} crystals
 * @returns {{ state: 'owned'|'needs'|'ready'|'short', cost: number, needs?: string }}
 */
export function gearStatus(id, owned, crystals) {
  const def = GEAR.find((g) => g.id === id);
  if (!def) return { state: 'short', cost: 0 };
  if (owned.includes(id)) return { state: 'owned', cost: def.cost };
  if (def.requires && !owned.includes(def.requires)) {
    return { state: 'needs', cost: def.cost, needs: GEAR.find((g) => g.id === def.requires)?.name };
  }
  return { state: crystals >= def.cost ? 'ready' : 'short', cost: def.cost };
}

/** What the owned gear changes in a siege. @param {GearId[]} owned */
export function gearEffects(owned) {
  const has = (id) => owned.includes(id);
  return {
    extraLeaks: has('reinforced-porch') ? 2 : 0,
    extraStartCoins: has('coin-purse') ? 20 : 0,
    coinMultiplier: has('alien-magnet') ? 1.25 : 1,
    extraSeconds: has('pocket-watch') ? 10 : 0,
    nukeDamageMul: has('mega-cupcakes') ? 1.6 : 1,
    nukeAoeMul: has('mega-cupcakes') ? 1.35 : 1,
    nukeSalvoMul: has('double-batch') ? 2 : 1,
  };
}
