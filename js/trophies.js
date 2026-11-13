/**
 * Trophies are earned for feats, and each one unlocks a title the player can wear under
 * their rank. Records are the personal bests that "NEW RECORD!" moments celebrate.
 */

/** @typedef {{ v: number, d: string|null }} RecordEntry */
/** @typedef {{ bestKills: RecordEntry, siegesWon: number, zeroLeakWins: number, bosses: number, nukes: number, rightAnswers: number, challengesWon: number }} RecordsSave */

/**
 * Everything a trophy test needs, gathered by the app so this file stays pure.
 * @typedef {{ records: RecordsSave, rankLevel: number, streakBest: number, crystals: number,
 *   maxTurretLevel: number, ownsAllTurrets: boolean, mapComplete: boolean,
 *   topicRank: (id: string) => number, granddaddyDefeated: boolean }} TrophyContext
 */

/** @typedef {{ id: string, icon: string, name: string, title: string, how: string, test: (c: TrophyContext) => boolean }} Trophy */

/** @type {Trophy[]} */
export const TROPHIES = [
  { id: 'first-win', icon: '🛡️', name: 'First Victory', title: 'Rookie Defender', how: 'Win your first siege', test: (c) => c.records.siegesWon >= 1 },
  { id: 'flawless', icon: '💎', name: 'Flawless Defence', title: 'The Untouchable', how: 'Win a siege with no aliens getting through', test: (c) => c.records.zeroLeakWins >= 1 },
  { id: 'smasher', icon: '💥', name: 'Alien Smasher', title: 'Alien Smasher', how: 'Blast 100 aliens in one siege', test: (c) => c.records.bestKills.v >= 100 },
  { id: 'boss-hunter', icon: '👾', name: 'Boss Hunter', title: 'Boss Hunter', how: 'Defeat 10 boss aliens', test: (c) => c.records.bosses >= 10 },
  { id: 'granddaddy', icon: '👑', name: 'Granddaddy Down', title: 'Granddaddy Slayer', how: 'Defeat Granddaddy', test: (c) => c.granddaddyDefeated },
  { id: 'cupcake', icon: '🧁', name: 'Cupcake Commander', title: 'Cupcake Commander', how: 'Fire Granny’s nukes 5 times', test: (c) => c.records.nukes >= 5 },
  { id: 'on-fire', icon: '🔥', name: 'On Fire', title: 'On Fire', how: 'Keep a 7-day streak', test: (c) => c.streakBest >= 7 },
  { id: 'unstoppable', icon: '☄️', name: 'Unstoppable', title: 'Unstoppable', how: 'Keep a 30-day streak', test: (c) => c.streakBest >= 30 },
  { id: 'hoarder', icon: '🪨', name: 'Crystal Hoarder', title: 'Crystal Hoarder', how: 'Collect 25 Alien Crystals', test: (c) => c.crystals >= 25 },
  { id: 'crystal-legend', icon: '🌟', name: 'Crystal Legend', title: 'Crystal Legend', how: 'Collect 100 Alien Crystals', test: (c) => c.crystals >= 100 },
  { id: 'max-power', icon: '⚡', name: 'Max Power', title: 'Power Builder', how: 'Upgrade a turret to level 3', test: (c) => c.maxTurretLevel >= 3 },
  { id: 'arsenal', icon: '🧰', name: 'Full Arsenal', title: 'Granny’s Engineer', how: 'Unlock every turret', test: (c) => c.ownsAllTurrets },
  { id: 'fraction-fiend', icon: '🍕', name: 'Fraction Fiend', title: 'Fraction Fiend', how: 'Reach rank 5 in Fractions', test: (c) => c.topicRank('fractions') >= 5 },
  { id: 'times-titan', icon: '✖️', name: 'Times Titan', title: 'Times Titan', how: 'Reach rank 5 in Times Tables', test: (c) => c.topicRank('times-tables') >= 5 },
  { id: 'puzzle-master', icon: '🧩', name: 'Puzzle Master', title: 'Puzzle Master', how: 'Reach rank 5 in Maths Quest', test: (c) => c.topicRank('maths-quest') >= 5 },
  { id: 'brainiac', icon: '🧠', name: 'Brainiac', title: 'Brainiac', how: 'Get 500 maths answers right', test: (c) => c.records.rightAnswers >= 500 },
  { id: 'navigator', icon: '🗺️', name: 'Star Navigator', title: 'Star Navigator', how: 'Reveal the whole Alien Homeland map', test: (c) => c.mapComplete },
  { id: 'rival', icon: '🤝', name: 'Rival Crusher', title: 'Rival Crusher', how: 'Win 3 friend challenges', test: (c) => c.records.challengesWon >= 3 },
  { id: 'marshal', icon: '🎖️', name: 'Marshal of the Garden', title: 'Marshal of the Garden', how: 'Reach the rank of Marshal', test: (c) => c.rankLevel >= 5 },
];

/** @param {any} raw @returns {RecordsSave} */
export function normalizeRecords(raw) {
  const n = (v) => Math.max(0, Math.floor(Number(v) || 0));
  return {
    bestKills: { v: n(raw?.bestKills?.v), d: typeof raw?.bestKills?.d === 'string' ? raw.bestKills.d : null },
    siegesWon: n(raw?.siegesWon),
    zeroLeakWins: n(raw?.zeroLeakWins),
    bosses: n(raw?.bosses),
    nukes: n(raw?.nukes),
    rightAnswers: n(raw?.rightAnswers),
    challengesWon: n(raw?.challengesWon),
  };
}

/**
 * @param {Record<string, string>} earned trophy id -> date earned
 * @param {TrophyContext} ctx
 * @param {string} today
 * @returns {{ earned: Record<string, string>, fresh: Trophy[] }}
 */
export function checkTrophies(earned, ctx, today) {
  const next = { ...earned };
  const fresh = [];
  for (const trophy of TROPHIES) {
    if (next[trophy.id] || !trophy.test(ctx)) continue;
    next[trophy.id] = today;
    fresh.push(trophy);
  }
  return { earned: next, fresh };
}

/** @param {string|null|undefined} id */
export function trophyTitle(id) {
  return TROPHIES.find((t) => t.id === id)?.title ?? '';
}
