/**
 * Career ranks: each one counts lifetime siege results, so a single great siege
 * cannot jump a player straight to the top. Ranks are earned in order.
 */
export const SIEGE_RANKS = [
  { name: 'Recruit', key: 'played', need: 1, hint: 'Play 1 siege' },
  { name: 'Patrol', key: 'wave1', need: 3, hint: 'Clear wave 1 in 3 sieges' },
  { name: 'Defender', key: 'won', need: 5, hint: 'Win 5 sieges' },
  { name: 'Veteran', key: 'won5', need: 10, hint: 'Win 10 sieges with 5 or fewer leaks' },
  { name: 'Marshal', key: 'won2', need: 20, hint: 'Win 20 sieges with 2 or fewer leaks' },
];

/** @typedef {{ played: number, wave1: number, won: number, won5: number, won2: number }} SiegeRecord */

const KEYS = /** @type {const} */ (['played', 'wave1', 'won', 'won5', 'won2']);

/**
 * @param {any} record
 * @param {number} [siegesCompleted] Older saves already know how many sieges were played.
 * @returns {SiegeRecord}
 */
export function normalizeSiegeRecord(record, siegesCompleted = 0) {
  /** @type {any} */
  const out = {};
  for (const key of KEYS) {
    const n = Math.floor(Number(record?.[key]) || 0);
    out[key] = Math.max(0, n);
  }
  out.played = Math.max(out.played, Math.floor(Number(siegesCompleted) || 0));
  return out;
}

/**
 * Adds one siege. `earned` is the five-badge result from computeStars, in rank order.
 * @param {SiegeRecord} record
 * @param {boolean[]} earned
 * @returns {SiegeRecord}
 */
export function recordSiege(record, earned) {
  const next = { ...record };
  KEYS.forEach((key, i) => {
    if (earned[i]) next[key] += 1;
  });
  return next;
}

/** @param {SiegeRecord} record @returns {number} 0 (no rank yet) to 5 (Marshal). */
export function siegeRankLevel(record) {
  let level = 0;
  for (const rank of SIEGE_RANKS) {
    if ((record?.[rank.key] ?? 0) < rank.need) break;
    level += 1;
  }
  return level;
}

/**
 * After a siege: the player's career rank, a RANK UP! tag if this siege earned it,
 * and how far they are towards the next rank.
 * @param {SiegeRecord} record
 * @param {number} previousLevel
 * @param {(level: number) => string} badgeSrc
 */
export function renderRankResult(record, previousLevel, badgeSrc) {
  const level = siegeRankLevel(record);
  const rankedUp = level > previousLevel;
  const current = SIEGE_RANKS[level - 1];
  const next = SIEGE_RANKS[level];
  const have = next ? Math.min(next.need, record[next.key] ?? 0) : 0;
  const pct = next ? Math.round((have / next.need) * 100) : 100;
  return `
    <div class="rank-result${rankedUp ? ' is-rank-up' : ''}">
      <img class="rank-result-badge" src="${badgeSrc(Math.max(1, level))}" alt="" width="96" height="96" />
      <div class="rank-result-copy">
        ${rankedUp ? '<span class="rank-result-tag">RANK UP!</span>' : '<span class="rank-result-label">YOUR RANK</span>'}
        <strong class="rank-result-name">${current ? current.name.toUpperCase() : 'NO RANK YET'}</strong>
        ${next ? `
          <span class="rank-result-next">Next: <b>${next.name}</b> · ${next.hint}</span>
          <span class="rank-result-track" role="progressbar" aria-valuemin="0" aria-valuemax="${next.need}" aria-valuenow="${have}"><span style="width:${pct}%"></span></span>
          <span class="rank-result-count">${have} / ${next.need}</span>`
        : '<span class="rank-result-next">Top rank reached. Legend!</span>'}
      </div>
    </div>`;
}

/** @param {SiegeRecord} record @param {number} index @returns {string} e.g. "2/5 wins" */
export function rankProgressText(record, index) {
  const rank = SIEGE_RANKS[index];
  if (!rank) return '';
  return `${Math.min(rank.need, record?.[rank.key] ?? 0)}/${rank.need}`;
}
