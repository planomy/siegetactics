import { ENEMY_SPRITE_SRC } from './enemies-data.js';

/**
 * @typedef {Object} ThreatDossier
 * @property {import('./enemies-data.js').EnemySpriteKey} [key]
 * @property {string} [imageSrc]
 * @property {string} codename
 * @property {string} file
 * @property {string} threat
 * @property {string} designation
 * @property {string[]} intel
 * @property {{ label: string, base: number, unit: string, jitter?: number }[]} meters
 */


/** @param {ThreatDossier} dossier @returns {string} */
function dossierImageSrc(dossier) {
  if (dossier.imageSrc) return dossier.imageSrc;
  if (dossier.key && ENEMY_SPRITE_SRC[dossier.key]) return ENEMY_SPRITE_SRC[dossier.key];
  return ENEMY_SPRITE_SRC.monster3;
}

/** @type {ThreatDossier[]} */
export const THREAT_DOSSIERS = [
  {
    key: 'monster3',
    codename: 'TRI-EYE',
    file: 'XB-7734-C',
    threat: 'IV',
    designation: 'BIO-MECH SCOUT',
    intel: [
      'ORIGIN VECTOR .......... SECTOR 7G / DEEP ORBIT',
      'PROPULSION ............. TENTACLE THRUST ARRAY',
      'OPTICS ................. TRIPLE PLASMA RETINA',
      'ARMOR DENSITY .......... 412 PSI COMPOSITE',
      'WEAPONRY ............... PLASMA VENT / CLAW PAIR',
      'SIGINT MATCH ........... 94.7% CONFIDENCE',
      'INTERCEPT WINDOW ....... T-MINUS VARIABLE',
      'RECOMMENDATION ......... TRAINING GATE HOLD',
    ],
    meters: [
      { label: 'HULL', base: 68, unit: '%', jitter: 3 },
      { label: 'SIGNAL', base: 847, unit: 'dBm', jitter: 40 },
      { label: 'VELOCITY', base: 124, unit: 'km/h', jitter: 8 },
    ],
  },
  {
    key: 'monster1',
    codename: 'CYCLON',
    file: 'OP-1182-A',
    threat: 'III',
    designation: 'HEAVY MECH ASSAULT',
    intel: [
      'ORIGIN VECTOR .......... UNKNOWN NEBULA CLUSTER',
      'OPTICS ................. MONO-PLASMA CORE EYE',
      'ARMOR .................. SEGMENTED PURPLE ALLOY',
      'WEAPONRY ............... HYDRAULIC CRUSH CLAWS',
      'ENERGY SIGNATURE ....... CYAN VENT EMISSIONS',
      'THREAT ASSESSMENT ...... GROUND ASSAULT CAPABLE',
      'CIVILIAN RISK .......... PORCH PERIMETER CRITICAL',
      'STATUS ................. INBOUND · TRACKING LIVE',
    ],
    meters: [
      { label: 'HULL', base: 82, unit: '%', jitter: 2 },
      { label: 'CRUSH', base: 14.2, unit: 'kN', jitter: 0.4 },
      { label: 'POWER', base: 91, unit: '%', jitter: 4 },
    ],
  },
  {
    key: 'monster2',
    codename: 'PINCHER',
    file: 'CRB-2201',
    threat: 'III',
    designation: 'CRUSTACEAN MECH',
    intel: [
      'ORIGIN VECTOR .......... ASTEROID BELT DRIFT',
      'SILHOUETTE ............. LOW PROFILE CRAB FORM',
      'ARMOR .................. MAGENTA CARBIDE PLATING',
      'WEAPONRY ............... DUAL HYDRAULIC PINCERS',
      'SENSORS ................ BINOCULAR PLASMA OPTICS',
      'MOBILITY ............... SHORT BURST SPRINT',
      'FIELD INTEL ............ MULTI-LANE INGRESS',
      'ACTION ................. MAINTAIN TRAINING POSTURE',
    ],
    meters: [
      { label: 'HULL', base: 76, unit: '%', jitter: 3 },
      { label: 'PINCH', base: 9.8, unit: 'kN', jitter: 0.3 },
      { label: 'SIGINT', base: 712, unit: 'dBm', jitter: 35 },
    ],
  },
  {
    key: 'monster5',
    codename: 'TITAN',
    file: 'HV-9900',
    threat: 'V',
    designation: 'HEAVY SIEGE PLATFORM',
    intel: [
      'ORIGIN VECTOR .......... FLAGSHIP ESCORT GROUP',
      'MASS INDEX ............. 4.2 STANDARD UNITS',
      'ARMOR .................. REACTIVE PLATE MATRIX',
      'CORE ................... CYAN FUSION REACTOR',
      'TURRETS ................ SHOULDER BATTERY x4',
      'THREAT LEVEL ........... ALPHA PRIORITY',
      'EST. TIME TO CONTACT ... CALCULATING...',
      'NOTE ................... DO NOT ENGAGE UNPREPPED',
    ],
    meters: [
      { label: 'HULL', base: 96, unit: '%', jitter: 1 },
      { label: 'CORE', base: 18.7, unit: 'TW', jitter: 0.6 },
      { label: 'MASS', base: 4200, unit: 'kg', jitter: 120 },
    ],
  },
  {
    key: 'monster4',
    codename: 'SHADE',
    file: 'NGT-4410',
    threat: 'IV',
    designation: 'STEALTH ASSAULT DRONE',
    intel: [
      'ORIGIN VECTOR .......... DARK SECTOR INSERTION',
      'STEALTH ................ LOW VIS SIGNATURE',
      'OPTICS ................. V-SCAN PLASMA VISOR',
      'ARMOR .................. MATTE BLACK COMPOSITE',
      'HORNS .................. ENERGY CONDUIT SPIKES',
      'WEAPONRY ............... TRIPLE PRONG CLAWS',
      'DETECTION .............. INTERMITTENT · VERIFY',
      'COUNTERMEASURE ......... MATH DRILL SHIELD ACTIVE',
    ],
    meters: [
      { label: 'HULL', base: 71, unit: '%', jitter: 4 },
      { label: 'STEALTH', base: 88, unit: '%', jitter: 5 },
      { label: 'SIGNAL', base: 623, unit: 'dBm', jitter: 50 },
    ],
  },
  {
    key: 'mothership',
    codename: 'OVERLORD',
    file: 'MS-0001',
    threat: 'VI',
    designation: 'SAUCER COMMAND CRAFT',
    intel: [
      'ORIGIN VECTOR .......... EXTRASOLAR MOTHERSHIP',
      'CLASS .................. COMMAND & CONTROL',
      'HULL ................... SPIKE-RING SAUCER DESIGN',
      'OPTICS ................. PRIMARY SLIT EYE ARRAY',
      'DEPLOYMENT ............. WAVE COMMAND NODE',
      'ENERGY ................. MULTI-THRUST UNDERBELLY',
      'PRIORITY ............... STRATEGIC TARGET',
      'WARNING ................ COORDINATED ASSAULT IMMINENT',
    ],
    meters: [
      { label: 'HULL', base: 99, unit: '%', jitter: 0.5 },
      { label: 'COMMAND', base: 100, unit: '%', jitter: 0 },
      { label: 'WAVES', base: 3, unit: 'ACTV', jitter: 0 },
    ],
  },
  {
    key: 'mothership2',
    codename: 'SPIKE CORE',
    file: 'MS-2207',
    threat: 'VI',
    designation: 'PLASMA SPIKE CARRIER',
    intel: [
      'ORIGIN VECTOR .......... DEEP ORBIT STAGING',
      'CLASS .................. HEAVY ASSAULT MOTHERSHIP',
      'HULL ................... SERRATED SPIKE RING',
      'WEAPONRY ............... DUAL PLASMA THRUST PORTS',
      'CORE ................... GREEN FUSION EYE ARRAY',
      'DEPLOYMENT ............. WAVE COMMAND NODE',
      'PRIORITY ............... STRATEGIC TARGET',
      'WARNING ................ HIGH ENERGY SIGNATURE',
    ],
    meters: [
      { label: 'HULL', base: 97, unit: '%', jitter: 0.5 },
      { label: 'PLASMA', base: 16.2, unit: 'TW', jitter: 0.4 },
      { label: 'SPIKES', base: 24, unit: 'ACTV', jitter: 0 },
    ],
  },
  {
    key: 'mothership3',
    codename: 'MEDUSA',
    file: 'MS-3312',
    threat: 'VI',
    designation: 'BIO-MECH JELLY COMMAND',
    intel: [
      'ORIGIN VECTOR .......... NEBULA DRIFT FLEET',
      'CLASS .................. ORGANIC COMMAND CRAFT',
      'HULL ................... DOME + TENTACLE ARRAY',
      'ESCORT ................. FOUR SPHERE DRONES',
      'ENERGY ................. PINK PLASMA CORE DOME',
      'DEPLOYMENT ............. WAVE COMMAND NODE',
      'PRIORITY ............... STRATEGIC TARGET',
      'WARNING ................ COORDINATED SWARM ASSAULT',
    ],
    meters: [
      { label: 'HULL', base: 94, unit: '%', jitter: 1 },
      { label: 'DRONES', base: 4, unit: 'ACTV', jitter: 0 },
      { label: 'PULSE', base: 11.8, unit: 'TW', jitter: 0.5 },
    ],
  },
  {
    key: 'mothership4',
    codename: 'IRON FORGE',
    file: 'MS-4409',
    threat: 'VI',
    designation: 'INDUSTRIAL SIEGE PLATFORM',
    intel: [
      'ORIGIN VECTOR .......... ASTEROID FORGE BELT',
      'CLASS .................. HEAVY MECH MOTHERSHIP',
      'HULL ................... ARMORED FLIGHT DECK',
      'WEAPONRY ............... TURRET BATTERY GRID',
      'CORE ................... ORANGE HEX SHIELD NODE',
      'DEPLOYMENT ............. WAVE COMMAND NODE',
      'PRIORITY ............... STRATEGIC TARGET',
      'WARNING ................ SUSTAINED BARRAGE LIKELY',
    ],
    meters: [
      { label: 'HULL', base: 98, unit: '%', jitter: 0.5 },
      { label: 'TURRETS', base: 12, unit: 'ACTV', jitter: 0 },
      { label: 'HEAT', base: 892, unit: '°C', jitter: 40 },
    ],
  },
  {
    key: 'granddaddy',
    codename: 'GRANDDADDY',
    file: 'GD-XXXX',
    threat: 'VII',
    designation: 'APEX BIO-MECH PREDATOR',
    intel: [
      'ORIGIN VECTOR .......... CLASSIFIED · LEVEL 7',
      'CLASS .................. LEGENDARY HOSTILE',
      'ARMOR .................. ORANGE SPIKE CARAPACE',
      'WEAPONRY ............... KINETIC CLAW ARRAY',
      'CORE ................... PLASMA VENT MATRIX',
      'HISTORY ................ SURVIVED PRIOR SIEGES',
      'CIVILIAN IMPACT ........ CATASTROPHIC IF BREACH',
      'AUTHORIZATION .......... GRANNY BOOM COUNTERMEASURES ONLY',
    ],
    meters: [
      { label: 'HULL', base: 100, unit: '%', jitter: 0 },
      { label: 'RAGE', base: 99, unit: '%', jitter: 2 },
      { label: 'LETHAL', base: 10, unit: '/10', jitter: 0 },
    ],
  },
];

/** Hostile contacts cycled in the home wireframe dossier. */
export const ALL_DOSSIERS = THREAT_DOSSIERS;

const HEX_CHARS = '0123456789ABCDEF';

/** @returns {string} */
function randomHex(len = 8) {
  let out = '';
  for (let i = 0; i < len; i++) out += HEX_CHARS[Math.floor(Math.random() * 16)];
  return out;
}

/** @param {number} n @returns {string} */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/** @returns {string} */
function liveTimestamp() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}Z`;
}

/**
 * @param {boolean} contact
 * @param {ReturnType<import('./training-gate.js').attackStatus>} attack
 */
export function renderThreatDossier(contact, attack) {
  const urgencyClass = contact ? 'threat-dossier-contact' : `threat-dossier-${attack.urgency}`;
  return `
    <aside class="threat-dossier ${urgencyClass}" aria-hidden="true">
      <div class="threat-dossier-frame">
        <div class="threat-dossier-bar">
          <span class="threat-dossier-stamp">TOP SECRET // EYES ONLY</span>
          <span class="threat-dossier-live">
            SIGINT-<span class="threat-dossier-clock">${liveTimestamp()}</span><span class="threat-cursor" aria-hidden="true">█</span>
          </span>
        </div>
        <div class="threat-dossier-body">
          <div class="threat-dossier-wire">
            <span class="threat-reticle threat-reticle-tl" aria-hidden="true"></span>
            <span class="threat-reticle threat-reticle-tr" aria-hidden="true"></span>
            <span class="threat-reticle threat-reticle-bl" aria-hidden="true"></span>
            <span class="threat-reticle threat-reticle-br" aria-hidden="true"></span>
            <img class="threat-dossier-img" src="${ENEMY_SPRITE_SRC.monster3}" alt="" width="160" height="160" />
            <div class="threat-scanline" aria-hidden="true"></div>
            <div class="threat-wire-grid" aria-hidden="true"></div>
          </div>
          <div class="threat-dossier-terminal">
            <div class="threat-dossier-head">
              <span class="threat-codename">TRI-EYE</span>
              <span class="threat-designation">BIO-MECH SCOUT</span>
              <span class="threat-file">FILE XB-7734-C · TL-IV</span>
            </div>
            <div class="threat-hex-rail" aria-hidden="true">
              <div class="threat-hex-rail-inner"></div>
            </div>
            <div class="threat-dossier-scroll">
              <div class="threat-dossier-scroll-inner"></div>
            </div>
            <div class="threat-dossier-meters"></div>
          </div>
        </div>
        <div class="threat-dossier-ticker-wrap">
          <div class="threat-dossier-ticker"></div>
        </div>
      </div>
    </aside>
  `;
}

/** @param {ThreatDossier} dossier @returns {string} */
function buildScrollHtml(dossier) {
  const lines = dossier.intel.map((line) => `<div class="threat-intel-line">${line}</div>`).join('');
  return `${lines}${lines}`;
}

/** @param {ThreatDossier} dossier @returns {string} */
function buildMetersHtml(dossier) {
  return dossier.meters
    .map(
      (m) =>
        `<div class="threat-meter" data-base="${m.base}" data-jitter="${m.jitter ?? 0}" data-unit="${m.unit}">
          <span class="threat-meter-label">${m.label}</span>
          <span class="threat-meter-val">${formatMeter(m.base, m.unit)}</span>
        </div>`
    )
    .join('');
}

/** @param {number} base @param {string} unit */
function formatMeter(base, unit) {
  if (unit === '%') return `${base.toFixed(1)}%`;
  if (unit === '/10') return `${Math.round(base)}/10`;
  if (unit === 'ACTV') return `${Math.round(base)} ACTV`;
  if (unit === 'KILL') return `${Math.round(base)} KILL`;
  if (unit === 'COIN') return `${Math.round(base)} COIN`;
  if (unit === 'PTS') return `${Math.round(base)} PTS`;
  if (unit === 'HP/s') return `${base.toFixed(1)} HP/s`;
  if (unit === 'm') return `${Math.round(base)} m`;
  if (unit === 's') return `${base.toFixed(2)}s`;
  const decimals = unit === 'kN' || unit === 'TW' ? 1 : unit === 'kg' ? 0 : 1;
  return `${base.toFixed(decimals)} ${unit}`;
}

/** @param {number} base @param {number} jitter @param {string} unit */
function jitterMeter(base, jitter, unit) {
  if (jitter <= 0) return base;
  const delta = (Math.random() - 0.5) * 2 * jitter;
  return Math.max(0, base + delta);
}

/** @param {ThreatDossier} dossier @returns {string} */
function buildTickerText(dossier) {
  const lead =
    dossier.threat === 'DEF'
      ? dossier.file.startsWith('GB-T-')
        ? 'PORCH DEFENSE ASSET'
        : 'FRIENDLY ASSET'
      : 'INBOUND HOSTILE';
  const chunk = [
    `${lead} · CODENAME ${dossier.codename}`,
    `DESIGNATION ${dossier.designation}`,
    `THREAT LEVEL ${dossier.threat}`,
    `FILE ${dossier.file}`,
    'INTERCEPT AUTHORIZED UPON TRAINING COMPLETION',
    `SIG ${randomHex(4)}-${randomHex(4)} · BEARING 042°`,
    'EARTH DEFENCE NETWORK · GRANNY BOOM COMMAND',
  ];
  const text = chunk.join(' · ');
  return `${text} · ${text}`;
}

/** @param {ThreatDossier} dossier @returns {string} */
function buildHexRail(dossier) {
  const rows = [];
  for (let i = 0; i < 12; i++) {
    rows.push(`${randomHex(4)} ${randomHex(4)} ${randomHex(4)} ${randomHex(2)}  ${dossier.file}`);
  }
  return rows.map((r) => `<div class="threat-hex-line">${r}</div>`).join('');
}

/**
 * @param {HTMLElement|null} root
 * @param {{ contact?: boolean, urgency?: string }} [opts]
 */
export function initThreatDossier(root, opts = {}) {
  if (!root) return () => {};

  const img = root.querySelector('.threat-dossier-img');
  const codenameEl = root.querySelector('.threat-codename');
  const designationEl = root.querySelector('.threat-designation');
  const fileEl = root.querySelector('.threat-file');
  const scrollInner = root.querySelector('.threat-dossier-scroll-inner');
  const metersEl = root.querySelector('.threat-dossier-meters');
  const tickerEl = root.querySelector('.threat-dossier-ticker');
  const hexRail = root.querySelector('.threat-hex-rail-inner');
  const clockEl = root.querySelector('.threat-dossier-clock');

  if (!img || !scrollInner || !metersEl || !tickerEl) return () => {};

  let index = 0;
  let alive = true;

  const cycleMs = opts.contact ? 4200 : opts.urgency === 'critical' ? 4800 : opts.urgency === 'warning' ? 5600 : 6800;

  /** @param {number} i */
  function showDossier(i) {
    const dossier = ALL_DOSSIERS[i % ALL_DOSSIERS.length];
    root.classList.toggle('threat-dossier-friendly', dossier.threat === 'DEF');
    img.classList.add('threat-dossier-img-swap');
    img.src = dossierImageSrc(dossier);
    if (codenameEl) codenameEl.textContent = dossier.codename;
    if (designationEl) designationEl.textContent = dossier.designation;
    if (fileEl) fileEl.textContent = `FILE ${dossier.file} · TL-${dossier.threat}`;
    scrollInner.innerHTML = buildScrollHtml(dossier);
    metersEl.innerHTML = buildMetersHtml(dossier);
    tickerEl.textContent = buildTickerText(dossier);
    if (hexRail) {
      const rail = buildHexRail(dossier);
      hexRail.innerHTML = `${rail}${rail}`;
    }
    requestAnimationFrame(() => img.classList.remove('threat-dossier-img-swap'));
  }

  showDossier(0);

  const cycleId = setInterval(() => {
    if (!alive) return;
    index = (index + 1) % ALL_DOSSIERS.length;
    showDossier(index);
  }, cycleMs);

  const meterId = setInterval(() => {
    if (!alive) return;
    root.querySelectorAll('.threat-meter').forEach((row) => {
      const base = Number(row.getAttribute('data-base') ?? 0);
      const jitter = Number(row.getAttribute('data-jitter') ?? 0);
      const unit = row.getAttribute('data-unit') ?? '';
      const valEl = row.querySelector('.threat-meter-val');
      if (valEl) valEl.textContent = formatMeter(jitterMeter(base, jitter, unit), unit);
    });
  }, 180);

  const clockId = setInterval(() => {
    if (!alive || !clockEl) return;
    clockEl.textContent = liveTimestamp();
  }, 1000);

  const hexId = setInterval(() => {
    if (!alive || !hexRail) return;
    const dossier = ALL_DOSSIERS[index % ALL_DOSSIERS.length];
    const rail = buildHexRail(dossier);
    hexRail.innerHTML = `${rail}${rail}`;
  }, 2400);

  return () => {
    alive = false;
    clearInterval(cycleId);
    clearInterval(meterId);
    clearInterval(clockId);
    clearInterval(hexId);
  };
}
