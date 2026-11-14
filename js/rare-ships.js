/**
 * Rare motherships: a handful of collectable ships that very occasionally lead the opening assault,
 * plus Cousin Zorg, the Supreme Leader's cousin, who almost never shows up.
 *
 * Decided once per battle when it starts. The first rare is guaranteed somewhere in the player's
 * first few battles so every kid learns they exist; after that they are genuinely rare, with a
 * safety net so nobody goes forever without one. Shooting one down is the only way to collect it;
 * if it reaches the porch it escapes (no damage), but still counts as sighted.
 */

/** @typedef {'rare'|'legendary'} RareTier */
/** @typedef {{ id: string, name: string, src: string, tier: RareTier, file: string, designation: string, intel: string[] }} RareShip */

/** @type {RareShip[]} */
export const RARE_SHIPS = [
  {
    id: 'brass-dreadnought',
    name: 'BRASS DREADNOUGHT',
    src: 'assets/enemies/rare/brass-dreadnought.png',
    tier: 'rare',
    file: 'RX-0417-B',
    designation: 'RARE HEAVY BATTLE-SAUCER',
    intel: [
      'HULL ................... BURNISHED BRASS PLATE',
      'ARMAMENT ............... TWIN HEAVY CANNONS',
      'ENGINES ................ RED PLASMA CORE',
      'SIGHTINGS .............. EXTREMELY RARE',
    ],
  },
  {
    id: 'frost-saucer',
    name: 'FROST SAUCER',
    src: 'assets/enemies/rare/frost-saucer.png',
    tier: 'rare',
    file: 'RX-0932-F',
    designation: 'RARE CRYO-SAUCER',
    intel: [
      'HULL ................... FROSTED ALLOY / ICE RIM',
      'TEMPERATURE ............ -212°C AT THE HULL',
      'ENGINES ................ CYAN CRYO THRUSTERS',
      'SIGHTINGS .............. EXTREMELY RARE',
    ],
  },
  {
    id: 'phantom-saucer',
    name: 'PHANTOM SAUCER',
    src: 'assets/enemies/rare/phantom-saucer.png',
    tier: 'rare',
    file: 'RX-1313-P',
    designation: 'RARE GHOST-SHIELD SAUCER',
    intel: [
      'HULL ................... CHARCOAL STEALTH PLATE',
      'SHIELD ................. FLICKERING SPECTRAL FIELD',
      'RADAR SIGNATURE ........ NEAR INVISIBLE',
      'SIGHTINGS .............. EXTREMELY RARE',
    ],
  },
  {
    id: 'magma-hauler',
    name: 'MAGMA HAULER',
    src: 'assets/enemies/rare/magma-hauler.png',
    tier: 'rare',
    file: 'RX-0666-M',
    designation: 'RARE VOLCANIC HAULER',
    intel: [
      'HULL ................... VOLCANIC ROCK ARMOUR',
      'CORE TEMPERATURE ....... 1,200°C AND RISING',
      'EXHAUST ................ TWIN SMOKESTACKS',
      'SIGHTINGS .............. EXTREMELY RARE',
    ],
  },
  {
    id: 'storm-hornet',
    name: 'STORM HORNET',
    src: 'assets/enemies/rare/storm-hornet.png',
    tier: 'rare',
    file: 'RX-0808-S',
    designation: 'RARE LIGHTNING STRIKER',
    intel: [
      'HULL ................... HAZARD-STRIPED ALLOY',
      'ARMAMENT ............... LIGHTNING PRONGS',
      'MANOEUVRE .............. WASP-CLASS AGILITY',
      'SIGHTINGS .............. EXTREMELY RARE',
    ],
  },
];

/** @type {RareShip} */
export const COUSIN_ZORG = {
  id: 'cousin-zorg',
  name: 'COUSIN ZORG',
  src: 'assets/enemies/rare/cousin-zorg.png',
  tier: 'legendary',
  file: 'SL-0002-Z',
  designation: "THE SUPREME LEADER'S COUSIN",
  intel: [
    'RANK ................... ROYAL BLOODLINE',
    'RELATION ............... COUSIN OF THE SUPREME LEADER',
    'HULL ................... BLACK DREAD-ARMOUR / GOLD',
    'SIGHTINGS .............. ALMOST NONE ON RECORD',
  ],
};

export const ALL_RARE_SHIPS = [...RARE_SHIPS, COUSIN_ZORG];

export const RARE_RULES = {
  /** The first rare is guaranteed in one of these battles (counted from when rares arrived). */
  firstFrom: 6,
  firstTo: 10,
  /** After that, the chance of a rare leading any one battle... */
  chance: 1 / 15,
  /** ...and the battle that guarantees one if none has shown up since. */
  pityAt: 25,
  /** Cousin Zorg: only once the player has shot down at least one rare. */
  legendaryChance: 1 / 100,
  /** Ships not yet collected are this many times as likely to be the one that shows up. */
  uncaughtWeight: 3,
  rareCrystals: 3,
  legendaryCrystals: 10,
};

/** Higher Crystal Vault tiers make rare ships a little more likely. */
export const VAULT_RARE_LUCK = { starter: 1, bronze: 1.1, silver: 1.2, gold: 1.35, legend: 1.5 };

/** @typedef {{ battles: number, sinceLast: number, firstAt: number, pending: string|null, sighted: Record<string, number>, caught: Record<string, number> }} RareSave */

/** @param {string} id @returns {RareShip|undefined} */
export function rareShipById(id) {
  return ALL_RARE_SHIPS.find((s) => s.id === id);
}

/** @param {unknown} raw @returns {Record<string, number>} */
function normalizeCounts(raw) {
  /** @type {Record<string, number>} */
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const ship of ALL_RARE_SHIPS) {
    const n = Math.floor(Number(/** @type {Record<string, unknown>} */ (raw)[ship.id]) || 0);
    if (n > 0) out[ship.id] = n;
  }
  return out;
}

/** @param {any} raw @param {() => number} [rand] @returns {RareSave} */
export function normalizeRareSave(raw, rand = Math.random) {
  const span = RARE_RULES.firstTo - RARE_RULES.firstFrom + 1;
  const firstAt = Number.isInteger(raw?.firstAt) && raw.firstAt >= RARE_RULES.firstFrom && raw.firstAt <= RARE_RULES.firstTo
    ? raw.firstAt
    : RARE_RULES.firstFrom + Math.floor(rand() * span);
  return {
    battles: Math.max(0, Math.floor(Number(raw?.battles) || 0)),
    sinceLast: Math.max(0, Math.floor(Number(raw?.sinceLast) || 0)),
    firstAt,
    pending: typeof raw?.pending === 'string' && rareShipById(raw.pending) ? raw.pending : null,
    sighted: normalizeCounts(raw?.sighted),
    caught: normalizeCounts(raw?.caught),
  };
}

/** @param {RareSave} rs */
export function raresCaughtCount(rs) {
  return ALL_RARE_SHIPS.filter((s) => (rs.caught[s.id] ?? 0) > 0).length;
}

/** @param {RareSave} rs @param {() => number} rand */
function pickRare(rs, rand) {
  const weights = RARE_SHIPS.map((s) => ((rs.caught[s.id] ?? 0) > 0 ? 1 : RARE_RULES.uncaughtWeight));
  let roll = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < RARE_SHIPS.length; i++) {
    roll -= weights[i];
    if (roll < 0) return RARE_SHIPS[i].id;
  }
  return RARE_SHIPS[RARE_SHIPS.length - 1].id;
}

/**
 * Called once as each battle starts. A ship rolled but never reached (the battle was left early)
 * stays pending for the next battle, so it can't be lost or re-rolled.
 * @param {RareSave} rs
 * @param {{ vaultTier?: string, rand?: () => number }} [opts]
 * @returns {{ save: RareSave, shipId: string|null }}
 */
export function rollRareShip(rs, opts = {}) {
  const rand = opts.rand ?? Math.random;
  const luck = VAULT_RARE_LUCK[/** @type {keyof typeof VAULT_RARE_LUCK} */ (opts.vaultTier ?? 'starter')] ?? 1;
  const next = { ...rs, battles: rs.battles + 1 };
  if (next.pending) return { save: next, shipId: next.pending };

  const everSeen = Object.keys(rs.sighted).length > 0;
  const caughtAny = RARE_SHIPS.some((s) => (rs.caught[s.id] ?? 0) > 0);
  /** @type {string|null} */
  let shipId = null;
  if (caughtAny && rand() < RARE_RULES.legendaryChance * luck) shipId = COUSIN_ZORG.id;
  else if (!everSeen) shipId = next.battles >= rs.firstAt ? pickRare(rs, rand) : null;
  else if (rs.sinceLast + 1 >= RARE_RULES.pityAt || rand() < RARE_RULES.chance * luck) shipId = pickRare(rs, rand);

  if (!shipId) return { save: { ...next, sinceLast: rs.sinceLast + 1 }, shipId: null };
  return { save: { ...next, sinceLast: 0, pending: shipId }, shipId };
}

/**
 * The rare ship has flown onto the lawn: it's sighted, and no longer waiting for a battle.
 * @param {RareSave} rs @param {string} id @returns {RareSave}
 */
export function recordRareSighted(rs, id) {
  return { ...rs, pending: rs.pending === id ? null : rs.pending, sighted: { ...rs.sighted, [id]: (rs.sighted[id] ?? 0) + 1 } };
}

/** @param {RareSave} rs @param {string} id @returns {RareSave} */
export function recordRareCaught(rs, id) {
  return { ...rs, caught: { ...rs.caught, [id]: (rs.caught[id] ?? 0) + 1 } };
}

/** @param {RareShip} ship */
export function rareCrystalReward(ship) {
  return ship.tier === 'legendary' ? RARE_RULES.legendaryCrystals : RARE_RULES.rareCrystals;
}

/**
 * Blueprint panel entries for the rare ships: unknown ones are dark silhouettes, sighted ones are
 * named but not yet destroyed, and destroyed ones show in full with their kill count.
 * @param {RareSave} rs
 */
export function rareDossiers(rs) {
  return ALL_RARE_SHIPS.map((ship) => {
    const caught = rs.caught[ship.id] ?? 0;
    const sighted = (rs.sighted[ship.id] ?? 0) > 0;
    const legendary = ship.tier === 'legendary';
    const state = caught > 0 ? 'caught' : sighted ? 'sighted' : 'unknown';
    return {
      key: ship.id,
      imageSrc: ship.src,
      rareState: state,
      codename: state === 'unknown' ? (legendary ? '??? LEGENDARY SIGNAL' : '??? UNIDENTIFIED') : ship.name,
      file: ship.file,
      threat: legendary ? 'X' : 'VII',
      designation: state === 'caught' ? ship.designation : state === 'sighted' ? 'SIGHTED · NOT DESTROYED' : legendary ? 'ROYAL CRAFT · NEVER SIGHTED' : 'RARE MOTHERSHIP · NEVER SIGHTED',
      intel: state === 'caught' ? ship.intel : ['DATA ................... CLASSIFIED', 'SIGHTINGS .............. EXTREMELY RARE', 'STATUS ................. AT LARGE', 'ORDERS ................. SHOOT ON SIGHT'],
      meters: [
        { label: 'HULL', base: legendary ? 400 : 180, unit: '%', jitter: 0 },
        { label: 'RARITY', base: legendary ? 10 : 8, unit: '/10', jitter: 0 },
        { label: 'CAUGHT', base: caught, unit: 'KILL', jitter: 0 },
      ],
      caught,
    };
  });
}
