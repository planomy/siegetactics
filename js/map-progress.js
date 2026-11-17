/** @typedef {import('./difficulty.js?v=20261114k1').DifficultyLevel} DifficultyLevel */

/** @typedef {'times-tables'|'place-value-siege'|'measurement-length'|'fractions'|'angles'|'maths-quest'|'operations'|'decimals-percent'|'time'|'mass-capacity'} TrainingModuleId */

/** @typedef {1|2|3} MapSeason */

/** Modules that earn map pieces and level shields. */
export const TRAINING_MODULE_IDS = /** @type {TrainingModuleId[]} */ ([
  'times-tables',
  'place-value-siege',
  'measurement-length',
  'fractions',
  'angles',
  'maths-quest',
  'operations',
  'decimals-percent',
  'time',
  'mass-capacity',
]);

/** Passes required per topic to clear one HQ season. */
export const MAP_PASSES_REQUIRED = 10;

/**
 * Three HQ seasons → Doompickle Level 1 / 2 / 3.
 * Season 1 @ 80%, Season 2 @ 90%, Season 3 @ 100% (on 10-Q drills: miss 2 / 1 / 0).
 * @type {ReadonlyArray<{ season: MapSeason, accuracy: number, label: string, unlocksLevel: 1|2|3 }>}
 */
export const MAP_SEASONS = Object.freeze([
  { season: 1, accuracy: 0.8, label: '80%', unlocksLevel: 1 },
  { season: 2, accuracy: 0.9, label: '90%', unlocksLevel: 2 },
  { season: 3, accuracy: 1.0, label: '100%', unlocksLevel: 3 },
]);

/** @deprecated Use seasonAccuracy(1) — kept for older imports. */
export const MAP_PASS_ACCURACY = MAP_SEASONS[0].accuracy;

/** The Alien Homeland map art, shown in the map pop-up. */
export const MAP_IMAGE = 'assets/home/interstellar-map.jpg';

/**
 * Sector tiles on the 2×5 nav chart.
 * @type {Array<{ moduleId: TrainingModuleId, code: string, ref: string, label: string, col: number, row: number }>}
 */
export const MAP_SECTORS = [
  { moduleId: 'times-tables', code: 'SEC-Δ7', ref: '8842', label: 'Times Tables', col: 0, row: 0 },
  { moduleId: 'place-value-siege', code: 'SEC-B3', ref: '7719', label: 'Place Value', col: 1, row: 0 },
  { moduleId: 'measurement-length', code: 'SEC-Y1', ref: '6204', label: 'Length Lab', col: 0, row: 1 },
  { moduleId: 'fractions', code: 'SEC-Θ2', ref: '3305', label: 'Fractions', col: 1, row: 1 },
  { moduleId: 'angles', code: 'SEC-Φ6', ref: '4417', label: 'Angles', col: 0, row: 2 },
  { moduleId: 'maths-quest', code: 'SEC-Ω9', ref: '9921', label: 'Maths Quest', col: 1, row: 2 },
  { moduleId: 'operations', code: 'SEC-K4', ref: '5186', label: 'Operations', col: 0, row: 3 },
  { moduleId: 'decimals-percent', code: 'SEC-P8', ref: '2743', label: 'Decimals & %', col: 1, row: 3 },
  { moduleId: 'time', code: 'SEC-T5', ref: '1068', label: 'Time', col: 0, row: 4 },
  { moduleId: 'mass-capacity', code: 'SEC-V2', ref: '7350', label: 'Supply Depot', col: 1, row: 4 },
];

/** @typedef {Partial<Record<TrainingModuleId, number>>} SeasonPassMap */
/**
 * Per-season pass counts. Legacy flat saves migrate into season 1.
 * @typedef {{ seasons: { 1: SeasonPassMap, 2: SeasonPassMap, 3: SeasonPassMap } }} MapProgressSave
 */

/** @param {MapSeason} season */
export function seasonAccuracy(season) {
  return MAP_SEASONS[season - 1]?.accuracy ?? MAP_SEASONS[0].accuracy;
}

/** @param {MapSeason} season */
export function seasonLabel(season) {
  return MAP_SEASONS[season - 1]?.label ?? '80%';
}

/** @returns {SeasonPassMap} */
function emptySeason() {
  return {};
}

/** @returns {MapProgressSave} */
export function defaultMapProgress() {
  return { seasons: { 1: {}, 2: {}, 3: {} } };
}

/** @param {unknown} raw @returns {MapProgressSave} */
export function normalizeMapProgress(raw) {
  if (!raw || typeof raw !== 'object') return defaultMapProgress();
  const obj = /** @type {Record<string, unknown>} */ (raw);

  /** @param {unknown} bag @returns {SeasonPassMap} */
  const readBag = (bag) => {
    const out = /** @type {SeasonPassMap} */ ({});
    if (!bag || typeof bag !== 'object') return out;
    for (const id of TRAINING_MODULE_IDS) {
      const n = Number(/** @type {Record<string, unknown>} */ (bag)[id]);
      if (Number.isFinite(n) && n > 0) out[id] = Math.min(MAP_PASSES_REQUIRED, Math.floor(n));
    }
    return out;
  };

  if (obj.seasons && typeof obj.seasons === 'object') {
    const s = /** @type {Record<string, unknown>} */ (obj.seasons);
    return {
      seasons: {
        1: readBag(s[1] ?? s['1']),
        2: readBag(s[2] ?? s['2']),
        3: readBag(s[3] ?? s['3']),
      },
    };
  }

  // Legacy flat { topicId: passes } → season 1.
  return {
    seasons: {
      1: readBag(obj),
      2: emptySeason(),
      3: emptySeason(),
    },
  };
}

/** @param {MapProgressSave} progress @param {MapSeason} [season] */
export function getSeasonPasses(progress, season = 1) {
  return progress.seasons?.[season] ?? emptySeason();
}

/** @param {MapProgressSave} progress @param {string} moduleId @param {MapSeason} [season] */
export function getMapPasses(progress, moduleId, season) {
  const s = season ?? currentMapSeason(progress);
  return getSeasonPasses(progress, s)[/** @type {TrainingModuleId} */ (moduleId)] ?? 0;
}

/** 0–1 fill for one topic’s bar slot this season. @param {MapProgressSave} progress @param {string} moduleId @param {MapSeason} [season] */
export function mapPassFraction(progress, moduleId, season) {
  return Math.min(1, getMapPasses(progress, moduleId, season) / MAP_PASSES_REQUIRED);
}

/** @param {MapProgressSave} progress @param {MapSeason} season */
export function seasonPiecesEarned(progress, season) {
  const bag = getSeasonPasses(progress, season);
  return TRAINING_MODULE_IDS.filter((id) => (bag[id] ?? 0) >= MAP_PASSES_REQUIRED).length;
}

/** @param {MapProgressSave} progress @param {MapSeason} season */
export function seasonComplete(progress, season) {
  return seasonPiecesEarned(progress, season) >= TRAINING_MODULE_IDS.length;
}

/**
 * Highest Doompickle run level unlocked by finished HQ seasons (0 = cannot warp yet).
 * @param {MapProgressSave} progress
 */
export function homelandMaxLevel(progress) {
  if (seasonComplete(progress, 3)) return 3;
  if (seasonComplete(progress, 2)) return 2;
  if (seasonComplete(progress, 1)) return 1;
  return 0;
}

/** @param {MapProgressSave} progress */
export function canWarpToDoompickle(progress) {
  return homelandMaxLevel(progress) >= 1;
}

/**
 * Season the player is currently charting (1–3). Stays on 3 after all are done.
 * @param {MapProgressSave} progress
 * @returns {MapSeason}
 */
export function currentMapSeason(progress) {
  if (!seasonComplete(progress, 1)) return 1;
  if (!seasonComplete(progress, 2)) return 2;
  return 3;
}

/** Season 1 pieces — used by HQ track / map UI. @param {MapProgressSave} progress @param {string} moduleId */
export function hasMapPiece(progress, moduleId) {
  return getMapPasses(progress, moduleId, 1) >= MAP_PASSES_REQUIRED;
}

/** @param {MapProgressSave} progress */
export function mapPiecesEarned(progress) {
  return seasonPiecesEarned(progress, currentMapSeason(progress));
}

/** @param {MapProgressSave} progress */
export function allMapPiecesEarned(progress) {
  return canWarpToDoompickle(progress);
}

/**
 * Fill every topic for one season (testing).
 * @param {MapProgressSave} progress
 * @param {MapSeason} season
 */
export function fillMapSeason(progress, season) {
  const next = normalizeMapProgress(progress);
  const bag = { ...next.seasons[season] };
  for (const id of TRAINING_MODULE_IDS) bag[id] = MAP_PASSES_REQUIRED;
  next.seasons[season] = bag;
  return next;
}

/**
 * @param {MapProgressSave} progress
 * @param {string} moduleId
 * @param {number} accuracy 0–1
 */
export function recordMapPass(progress, moduleId, accuracy) {
  const normalized = normalizeMapProgress(progress);
  const season = currentMapSeason(normalized);
  const bar = seasonAccuracy(season);
  const id = /** @type {TrainingModuleId} */ (moduleId);
  const bag = { ...getSeasonPasses(normalized, season) };
  const prior = bag[id] ?? 0;
  const seasonWasComplete = seasonComplete(normalized, season);

  if (accuracy < bar || prior >= MAP_PASSES_REQUIRED) {
    return {
      progress: normalized,
      added: false,
      passes: prior,
      pieceEarned: false,
      season,
      seasonJustCompleted: false,
      bar,
    };
  }

  const passes = prior + 1;
  bag[id] = passes;
  const next = {
    seasons: {
      ...normalized.seasons,
      [season]: bag,
    },
  };
  const pieceEarned = passes >= MAP_PASSES_REQUIRED;
  const seasonJustCompleted = !seasonWasComplete && seasonComplete(next, season);

  return {
    progress: next,
    added: true,
    passes,
    pieceEarned,
    season,
    seasonJustCompleted,
    bar,
  };
}

/** @param {MapProgressSave} progress @param {string} moduleId */
export function renderModuleMapProgress(progress, moduleId) {
  const season = currentMapSeason(progress);
  const passes = getMapPasses(progress, moduleId, season);
  const bar = seasonLabel(season);
  if (passes >= MAP_PASSES_REQUIRED) {
    return `<span class="gb-map-pass is-complete" title="Season ${season} sector charted (${bar})">S${season} ✓</span>`;
  }
  return `<span class="gb-map-pass" title="Season ${season}: ${passes} of ${MAP_PASSES_REQUIRED} passes at ${bar}+">S${season} ${passes}/${MAP_PASSES_REQUIRED}</span>`;
}

/** @param {MapProgressSave} progress */
export function renderInterstellarMap(progress) {
  const season = currentMapSeason(progress);
  const earned = seasonPiecesEarned(progress, season);
  const maxLevel = homelandMaxLevel(progress);
  const homeOpen = maxLevel >= 1;
  const bar = seasonLabel(season);

  const cells = MAP_SECTORS.map((sector) => {
    const charted = getMapPasses(progress, sector.moduleId, season) >= MAP_PASSES_REQUIRED;
    return `
      <div class="gb-map-cell${charted ? ' is-charted' : ''}" title="${sector.label} · ${sector.ref}">
        <div class="gb-map-cell-shroud${charted ? ' is-clear' : ''}" aria-hidden="true"></div>
        <span class="gb-map-cell-ref" aria-hidden="true">${sector.ref}</span>
      </div>`;
  }).join('');

  let caption = `Season ${season}: chart each sector with ${MAP_PASSES_REQUIRED} passes at ${bar}+.`;
  if (maxLevel >= 3) caption = 'All three seasons charted — Doompickle Level 3 is open.';
  else if (maxLevel === 2) caption = 'Season 2 done — Doompickle Level 2 open. Season 3 needs 100% passes.';
  else if (maxLevel === 1) caption = 'Season 1 done — Warp unlocked for Level 1. Season 2 needs 90% passes.';

  return `
    <section class="gb-map-panel" aria-label="Alien Homeland map">
      <div class="gb-map-bar">
        <span class="gb-map-stamp">Nav chart · Season ${season}</span>
        <span class="gb-map-count">${earned} / ${TRAINING_MODULE_IDS.length} sectors</span>
      </div>
      <div class="gb-map-viewport${homeOpen ? ' is-home-open' : ''}">
        <img
          class="gb-map-img"
          src="${MAP_IMAGE}"
          alt="Alien Homeland map"
          width="1024"
          height="576"
          loading="lazy"
        />
        <div class="gb-map-grid">${cells}</div>
        <div class="gb-map-home-shroud${homeOpen ? ' is-clear' : ''}" aria-hidden="true"></div>
      </div>
      <p class="gb-map-caption">${caption}</p>
    </section>`;
}
