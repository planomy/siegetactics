/** @typedef {import('./difficulty.js').DifficultyLevel} DifficultyLevel */

/** @typedef {'times-tables'|'place-value-siege'|'measurement-length'|'fractions'|'angles'|'maths-quest'} TrainingModuleId */

/** Modules that earn map pieces and level shields. */
export const TRAINING_MODULE_IDS = /** @type {TrainingModuleId[]} */ ([
  'times-tables',
  'place-value-siege',
  'measurement-length',
  'fractions',
  'angles',
  'maths-quest',
]);

/** Accuracy (0–1) needed to count one pass toward a map piece. */
export const MAP_PASS_ACCURACY = 0.8;

/** Passes at 80%+ required to earn one map piece for a module. */
export const MAP_PASSES_REQUIRED = 10;

/** Full interstellar chart shown on Home HQ. */
export const MAP_IMAGE = 'assets/home/interstellar-map.jpg';

/**
 * Sector tiles on the 2×3 nav chart (column 0–1, row 0–2).
 * @type {Array<{ moduleId: TrainingModuleId, code: string, ref: string, label: string, col: 0|1, row: 0|1|2 }>}
 */
export const MAP_SECTORS = [
  { moduleId: 'times-tables', code: 'SEC-Δ7', ref: '8842', label: 'Times Tables', col: 0, row: 0 },
  { moduleId: 'place-value-siege', code: 'SEC-B3', ref: '7719', label: 'Place Value', col: 1, row: 0 },
  { moduleId: 'measurement-length', code: 'SEC-Y1', ref: '6204', label: 'Length Lab', col: 0, row: 1 },
  { moduleId: 'fractions', code: 'SEC-Θ2', ref: '3305', label: 'Fractions', col: 1, row: 1 },
  { moduleId: 'angles', code: 'SEC-Φ6', ref: '4417', label: 'Angles', col: 0, row: 2 },
  { moduleId: 'maths-quest', code: 'SEC-Ω9', ref: '9921', label: 'Maths Quest', col: 1, row: 2 },
];

/** @typedef {Partial<Record<TrainingModuleId, number>>} MapProgressSave */

/** @returns {MapProgressSave} */
export function defaultMapProgress() {
  return {};
}

/** @param {unknown} raw @returns {MapProgressSave} */
export function normalizeMapProgress(raw) {
  if (!raw || typeof raw !== 'object') return defaultMapProgress();
  const out = /** @type {MapProgressSave} */ ({});
  for (const id of TRAINING_MODULE_IDS) {
    const n = Number(/** @type {Record<string, unknown>} */ (raw)[id]);
    if (Number.isFinite(n) && n > 0) {
      out[id] = Math.min(MAP_PASSES_REQUIRED, Math.floor(n));
    }
  }
  return out;
}

/** @param {MapProgressSave} progress @param {string} moduleId */
export function getMapPasses(progress, moduleId) {
  return progress[/** @type {TrainingModuleId} */ (moduleId)] ?? 0;
}

/** @param {MapProgressSave} progress @param {string} moduleId */
export function hasMapPiece(progress, moduleId) {
  return getMapPasses(progress, moduleId) >= MAP_PASSES_REQUIRED;
}

/** @param {MapProgressSave} progress */
export function mapPiecesEarned(progress) {
  return TRAINING_MODULE_IDS.filter((id) => hasMapPiece(progress, id)).length;
}

/** @param {MapProgressSave} progress */
export function allMapPiecesEarned(progress) {
  return mapPiecesEarned(progress) >= TRAINING_MODULE_IDS.length;
}

/**
 * @param {MapProgressSave} progress
 * @param {string} moduleId
 * @param {number} accuracy 0–1
 */
export function recordMapPass(progress, moduleId, accuracy) {
  const prior = getMapPasses(progress, moduleId);
  if (accuracy < MAP_PASS_ACCURACY || prior >= MAP_PASSES_REQUIRED) {
    return { progress, added: false, passes: prior, pieceEarned: false };
  }
  const passes = prior + 1;
  const next = { ...progress, [moduleId]: passes };
  return {
    progress: next,
    added: true,
    passes,
    pieceEarned: passes >= MAP_PASSES_REQUIRED,
  };
}

/** @param {MapProgressSave} progress @param {string} moduleId */
export function renderModuleMapProgress(progress, moduleId) {
  const passes = getMapPasses(progress, moduleId);
  if (hasMapPiece(progress, moduleId)) {
    return `<span class="gb-map-pass is-complete" title="Map sector charted">Map ✓</span>`;
  }
  return `<span class="gb-map-pass" title="${passes} of ${MAP_PASSES_REQUIRED} passes at 80%+">${passes}/${MAP_PASSES_REQUIRED}</span>`;
}

/** @param {MapProgressSave} progress */
export function renderInterstellarMap(progress) {
  const earned = mapPiecesEarned(progress);
  const homeOpen = allMapPiecesEarned(progress);

  const cells = MAP_SECTORS.map((sector) => {
    const charted = hasMapPiece(progress, sector.moduleId);
    return `
      <div class="gb-map-cell${charted ? ' is-charted' : ''}" title="${sector.label} · ${sector.ref}">
        <div class="gb-map-cell-shroud${charted ? ' is-clear' : ''}" aria-hidden="true"></div>
        <span class="gb-map-cell-ref" aria-hidden="true">${sector.ref}</span>
      </div>`;
  }).join('');

  return `
    <section class="gb-map-panel" aria-label="Interstellar chart">
      <div class="gb-map-bar">
        <span class="gb-map-stamp">Nav chart</span>
        <span class="gb-map-count">${earned} / ${TRAINING_MODULE_IDS.length} sectors</span>
      </div>
      <div class="gb-map-viewport${homeOpen ? ' is-home-open' : ''}">
        <img
          class="gb-map-img"
          src="${MAP_IMAGE}"
          alt="Interstellar training chart"
          width="1024"
          height="576"
          loading="lazy"
        />
        <div class="gb-map-grid">${cells}</div>
        <div class="gb-map-home-shroud${homeOpen ? ' is-clear' : ''}" aria-hidden="true"></div>
      </div>
      <p class="gb-map-caption">
        ${homeOpen ? 'Route to home planet unlocked.' : `Chart each sector with ${MAP_PASSES_REQUIRED} passes at 80%+ accuracy.`}
      </p>
    </section>`;
}
