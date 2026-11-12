import { MATH_TOPICS } from './topics-data.js?v=20261112o';
import { attackStatus } from './training-gate.js?v=20261112g';
import { STAR_LABELS, STAR_HINTS, summarizeBadgeCollection, badgeSrc } from './stars.js';
import { hotTopicId } from './hot-topic.js?v=20261112a1';
import { renderThreatDossier, initThreatDossier } from './threat-dossier.js?v=20261112n';
import { renderInterstellarMap, mapPiecesEarned, TRAINING_MODULE_IDS } from './map-progress.js';
import { topicRankProgress, getTopicRecord } from './topic-progression.js?v=20261112p';
import { getQualifiedLevels } from './level-mastery.js';
import { ECONOMY } from './economy.js';
import { xpMultiplierLabel } from './difficulty.js';
import { renderArmoryPromo } from './armory-promo.js?v=20261112m';

/**
 * Ten clean campaign cards. Mastery is a small permanent mark, while each
 * topic's rank and next-rank progress can grow without ever being "Done".
 * @param {import('./training-gate.js').TrainingGate} gate
 * @param {ReturnType<typeof attackStatus>} attack
 * @param {import('./level-mastery.js').LevelMasterySave} levelMastery
 * @param {import('./map-progress.js').MapProgressSave} mapProgress
 * @param {string[]} selectedTopics
 * @param {import('./topic-progression.js').TopicProgressSave} topicProgress
 */
function renderTrainingCards(gate, attack, levelMastery, mapProgress, selectedTopics = MATH_TOPICS.map((t) => t.id), topicProgress = {}) {
  // Respect the five-by-two screen order, never re-sort by "completion".
  return MATH_TOPICS.filter((topic) => selectedTopics.includes(topic.id))
    .sort((a, b) => selectedTopics.indexOf(a.id) - selectedTopics.indexOf(b.id))
    .map((topic) => {
      const locked = !topic.available;
      const campaign = topicRankProgress(getTopicRecord(topicProgress, topic.id).xp);
      const qualified = getQualifiedLevels(levelMastery, topic.id);
      const highestMastery = Math.max(0, ...qualified);
      const masteryLabel = highestMastery ? `L${highestMastery} ✓` : '';
      const artClass = `gb-story-art gb-story-art-${topic.id.replace(/[^a-z-]/g, '')}`;
      const hot = !locked && topic.id === hotTopicId();
      const close = campaign.percent >= 70;
      const art = topic.moduleArt
        ? `<img class="gb-story-art-img" src="${topic.moduleArt}" alt="" width="400" height="400" loading="lazy" />`
        : `<span class="gb-story-art-emoji">${topic.emoji}</span>`;
      return `
        <button type="button"
          class="gb-story-card gb-topic-campaign-card${locked ? ' gb-story-locked' : ''}${hot ? ' is-hot' : ''}"
          data-topic="${topic.id}"
          aria-label="${topic.title}${hot ? ', hot topic today, double XP' : ''}, topic rank ${campaign.rank}${highestMastery ? `, Level ${highestMastery} mastered` : ''}. ${campaign.remaining} topic XP to rank ${campaign.nextRank}."
          ${locked ? 'disabled' : ''}>
          <span class="${artClass}" aria-hidden="true">${art}</span>
          ${hot ? '<span class="gb-topic-hot" aria-hidden="true">🔥 HOT TOPIC · 2× XP</span>' : ''}
          ${topic.moduleArt ? '' : `<span class="gb-story-title">${topic.title}</span>`}
          <span class="gb-topic-campaign-line" data-rank="${campaign.rank}">
            <span class="gb-topic-rank">★ <strong>${campaign.rank}</strong></span>
            ${highestMastery ? `<span class="gb-topic-mastery" title="Level ${highestMastery} mastery earned">${masteryLabel}</span>` : ''}
            <span class="gb-topic-next">NEXT ${campaign.remaining.toLocaleString()} XP</span>
          </span>
          <span class="gb-topic-rank-track" aria-hidden="true">
            <span class="gb-topic-rank-fill" style="width:${campaign.percent}%"></span>
            <span class="gb-topic-prize${close ? ' is-close' : ''}" title="Rank up for an alien crystal"><span class="core-gem"></span></span>
          </span>
        </button>
      `;
    }).join('');
}

/** @param {import('./training-gate.js').TrainingGate} gate @param {ReturnType<typeof attackStatus>} attack */
function renderPrepChecklist(gate, attack) {
  const items = [{
    code: 'MISSION',
    label: 'Maths questions',
    status: `${attack.done} / ${attack.total} completed`,
    done: attack.open,
  }];
  return items
    .map(
      (item) => `
        <li class="gb-readiness-item${item.done ? ' gb-readiness-done' : ''}">
          <span class="gb-readiness-tick" aria-hidden="true"></span>
          <span class="gb-readiness-code">${item.code}</span>
          <span class="gb-readiness-label">${item.label}</span>
          <span class="gb-readiness-status">${item.status}</span>
        </li>`
    )
    .join('');
}

/** @type {number|null} Last deployment readiness % shown on Home HQ. */
let lastHomeReadinessPct = null;

/** @type {number|null} Last Forge XP total shown on Home HQ. */
let lastHomeXp = null;

const HOME_GROW_DELAY_MS = 420;
const HOME_GROW_DURATION_MS = 1150;

/** @param {number} n */
function formatForgeXp(n) {
  return Math.round(n).toLocaleString();
}

/** @param {number} from @param {number} to @param {number} durationMs @param {(v: number) => void} onStep @param {() => void} [onDone] */
function animateReadinessValue(from, to, durationMs, onStep, onDone) {
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - (1 - t) ** 3;
    onStep(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
    else onDone?.();
  };
  requestAnimationFrame(tick);
}

/**
 * @param {HTMLElement} host
 * @param {ReturnType<typeof attackStatus>} attack
 */
function playReadinessGrow(host, attack) {
  const targetPct = attack.open ? 100 : Math.round(attack.pct * 100);
  const fill = host.querySelector('.gb-readiness-fill');
  const pctEl = host.querySelector('.gb-readiness-pct');
  const track = host.querySelector('.gb-readiness-track');
  const readiness = host.querySelector('.gb-readiness');
  if (!fill || !pctEl) {
    lastHomeReadinessPct = targetPct;
    return;
  }

  const startPct = lastHomeReadinessPct ?? targetPct;
  const shouldAnimate = lastHomeReadinessPct !== null && startPct !== targetPct;

  const applyPct = (pct) => {
    fill.style.width = `${pct}%`;
    pctEl.textContent = `${pct}%`;
    track?.setAttribute('aria-valuenow', String(pct));
  };

  applyPct(shouldAnimate ? startPct : targetPct);

  if (!shouldAnimate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyPct(targetPct);
    lastHomeReadinessPct = targetPct;
    return;
  }

  window.setTimeout(() => {
    readiness?.classList.add('gb-readiness-growing');
    if (attack.open) readiness?.classList.add('gb-readiness-growing-ready');
    requestAnimationFrame(() => {
      fill.style.width = `${targetPct}%`;
      animateReadinessValue(startPct, targetPct, HOME_GROW_DURATION_MS, applyPct, () => {
        lastHomeReadinessPct = targetPct;
        window.setTimeout(() => {
          readiness?.classList.remove('gb-readiness-growing', 'gb-readiness-growing-ready');
        }, 500);
      });
    });
  }, HOME_GROW_DELAY_MS);
}

/**
 * @param {HTMLElement} host
 * @param {number} targetXp
 */
function playXpGrow(host, targetXp) {
  const sidebarXp = host.querySelector('#home-forge-xp');
  const topbarXp = document.getElementById('topbar-xp');
  const metric = sidebarXp?.closest('.gb-metric');
  const xpPill = document.querySelector('.forge-xp-pill');

  const startXp = lastHomeXp ?? targetXp;
  const shouldAnimate =
    lastHomeXp !== null &&
    startXp !== targetXp &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!shouldAnimate) {
    if (sidebarXp) sidebarXp.textContent = formatForgeXp(targetXp);
    if (topbarXp) topbarXp.textContent = formatForgeXp(targetXp);
    lastHomeXp = targetXp;
    return;
  }

  metric?.classList.add('gb-metric-xp-growing');
  xpPill?.classList.add('forge-xp-pill-growing');

  Promise.all([
    animateTally(sidebarXp, targetXp, {
      from: startXp,
      delay: HOME_GROW_DELAY_MS,
      duration: HOME_GROW_DURATION_MS,
      format: formatForgeXp,
    }),
    animateTally(topbarXp, targetXp, {
      from: startXp,
      delay: HOME_GROW_DELAY_MS,
      duration: HOME_GROW_DURATION_MS,
      format: formatForgeXp,
    }),
  ]).then(() => {
    lastHomeXp = targetXp;
    metric?.classList.remove('gb-metric-xp-growing');
    xpPill?.classList.remove('forge-xp-pill-growing');
  });
}

/** @param {import('./level-mastery.js').LevelMasterySave} mastery */
function countShieldsEarned(mastery) {
  return TRAINING_MODULE_IDS.reduce((n, id) => n + getQualifiedLevels(mastery, id).length, 0);
}

/** @param {{ xp: number, siegesCompleted: number, bestKills: number, bestBankedCoins: number, difficultyLevel: import('./difficulty.js').DifficultyLevel, levelMastery: import('./level-mastery.js').LevelMasterySave, mapProgress: import('./map-progress.js').MapProgressSave }} stats @param {import('./training-gate.js').TrainingGate} gate @param {ReturnType<typeof attackStatus>} attack */
function renderCommandSidebar(stats, gate, attack) {
  const readinessPct = attack.open ? 100 : Math.round(attack.pct * 100);
  const readinessLabel = attack.open ? 'CLEARED TO ENGAGE' : 'TRAINING IN PROGRESS';
  const mapSectors = mapPiecesEarned(stats.mapProgress);
  const shields = countShieldsEarned(stats.levelMastery);
  const maxShields = TRAINING_MODULE_IDS.length * 3;
  const checksDone = attack.done;
  const checksTotal = attack.total;
  const coinLabel = ECONOMY.siegeCoinsLabel;

  return `
    <section class="gb-command-panel" aria-label="Field command status">
      <div class="gb-command-bar">
        <span class="gb-command-stamp">FIELD COMMAND</span>
        <span class="gb-command-id">GB-HQ · SIG-${String(stats.siegesCompleted).padStart(3, '0')}</span>
      </div>

      <div class="gb-command-metrics">
        <div class="gb-metric">
          <span class="gb-metric-label">Forge XP</span>
          <span class="gb-metric-val" id="home-forge-xp">${stats.xp.toLocaleString()}</span>
        </div>
        <div class="gb-metric">
          <span class="gb-metric-label">Sieges logged</span>
          <span class="gb-metric-val">${stats.siegesCompleted}</span>
        </div>
        <div class="gb-metric">
          <span class="gb-metric-label">Peak eliminations</span>
          <span class="gb-metric-val gb-metric-val-sm">${stats.bestKills.toLocaleString()}</span>
        </div>
        <div class="gb-metric">
          <span class="gb-metric-label">Best banked</span>
          <span
            class="gb-metric-val gb-metric-val-sm"
            title="Most ${coinLabel.toLowerCase()} left unspent at the end of a siege (bank for bonus Forge XP)"
          >${stats.bestBankedCoins.toLocaleString()}</span>
        </div>
      </div>

      <div class="gb-command-metrics gb-command-metrics-secondary">
        <div class="gb-metric">
          <span class="gb-metric-label">Map charted</span>
          <span class="gb-metric-val gb-metric-val-sm">${mapSectors}/${TRAINING_MODULE_IDS.length}</span>
        </div>
        <div class="gb-metric">
          <span class="gb-metric-label">Shields earned</span>
          <span class="gb-metric-val gb-metric-val-sm">${shields}/${maxShields}</span>
        </div>
        <div class="gb-metric">
          <span class="gb-metric-label">Maths questions</span>
          <span class="gb-metric-val gb-metric-val-sm">${checksDone}/${checksTotal}</span>
        </div>
        <div class="gb-metric">
          <span class="gb-metric-label">Training level</span>
          <span class="gb-metric-val gb-metric-val-sm">L${stats.difficultyLevel}</span>
        </div>
      </div>

      <div class="gb-readiness">
        <div class="gb-readiness-head">
          <span class="gb-readiness-title">Deployment readiness</span>
          <span class="gb-readiness-pct${attack.open ? ' gb-readiness-pct-ready' : ''}">${readinessPct}%</span>
        </div>
        <div class="gb-readiness-track" role="progressbar" aria-valuenow="${readinessPct}" aria-valuemin="0" aria-valuemax="100">
          <div
            class="gb-readiness-fill${attack.open ? ' gb-readiness-fill-ready' : ''}"
            data-target-pct="${readinessPct}"
          ></div>
        </div>
        <p class="gb-readiness-state">${readinessLabel}</p>
        <ol class="gb-readiness-list">${renderPrepChecklist(gate, attack)}</ol>
      </div>
    </section>
  `;
}

/** @param {ReturnType<typeof attackStatus>} attack @param {number} blipDeg @param {number} blipR */
function renderRadarEscorts(attack, blipDeg, blipR) {
  const progress = 1 - attack.remaining / Math.max(1, attack.total);
  if (progress <= 0) return '';

  // Stable positions make approaching aliens appear like a real formation,
  // rather than randomly teleporting around the radar after every answer.
  const count = Math.max(1, Math.round(12 * progress));
  const arcSpan = 12 + progress * 26;
  const dots = Array.from({ length: count }, (_, i) => {
    const angle = blipDeg + (((i * 7) % 11) - 5) * arcSpan / 11;
    const radius = Math.max(5, Math.min(45, blipR + ((i * 3) % 7 - 3) * 1.65));
    const size = 3.5 + (i % 4) * 0.9;
    const opacity = 0.42 + (i % 5) * 0.1;
    const delay = ((i % 7) * 0.12).toFixed(2);
    return `<span class="inbound-radar-escort" style="--escort-deg:${angle.toFixed(1)}deg;--escort-r:${radius.toFixed(1)}%;--escort-size:${size.toFixed(1)}px;--escort-opacity:${opacity.toFixed(2)};--escort-delay:${delay}s" aria-hidden="true"></span>`;
  });

  return `<div class="inbound-radar-escorts" aria-hidden="true">${dots.join('')}</div>`;
}

/**
 * @param {ReturnType<typeof attackStatus>} attack
 * @param {boolean} open
 */
function renderInboundRadar(attack, open) {
  const maxR = 46;
  const minR = 10;
  const blipR = open ? 0 : minR + (attack.remaining / attack.total) * (maxR - minR);
  const blipDeg = 42;

  if (open) {
    return `
      <div class="inbound-radar inbound-radar-contact">
        <div class="inbound-radar-dish inbound-radar-dish-alert">
          <div class="inbound-radar-grid" aria-hidden="true"></div>
          <div class="inbound-radar-sweep inbound-radar-sweep-fast" aria-hidden="true"></div>
          ${renderRadarEscorts(attack, blipDeg, minR)}
          <div class="inbound-radar-blip inbound-radar-blip-center" aria-hidden="true"></div>
          <div class="inbound-radar-hub inbound-radar-hub-alert">
            <span class="inbound-radar-num">!</span>
            <span class="inbound-radar-unit">contact</span>
          </div>
        </div>
        <p class="inbound-radar-label">Porch perimeter breached</p>
        <button type="button" class="gb-forge-btn gb-attack-hero-cta" id="btn-hold-line">DEFEND GRANNY</button>
      </div>
    `;
  }

  const drillCaption = 'questions left';

  return `
    <div class="inbound-radar inbound-radar-${attack.urgency}">
      <div
        class="inbound-radar-dish"
        style="--blip-r: ${blipR}%; --blip-deg: ${blipDeg}deg; --sweep-speed: ${attack.urgency === 'critical' ? '2.4s' : attack.urgency === 'warning' ? '3s' : '3.6s'}"
      >
        <div class="inbound-radar-grid" aria-hidden="true"></div>
        <div class="inbound-radar-sweep" aria-hidden="true"></div>
        ${renderRadarEscorts(attack, blipDeg, blipR)}
        <div class="inbound-radar-blip" aria-hidden="true"></div>
        <div class="inbound-radar-hub">
          <span class="inbound-radar-num">${attack.remaining}</span>
          <span class="inbound-radar-unit">${drillCaption}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * @param {ReturnType<typeof attackStatus>} attack
 * @param {import('./training-gate.js').TrainingGate} gate
 * @param {string} playerName
 */
function renderAttackHero(attack, gate, playerName, isFirstMission) {
  const open = attack.open;

  return `
    <section
      class="gb-attack-hero gb-attack-${attack.urgency}${open ? ' gb-attack-hero-ready' : ''}"
      aria-label="${escapeHtml(open ? 'Attack now — deploy to siege' : 'Maths questions required before siege')}"
    >
      <div class="gb-attack-hero-bg" aria-hidden="true">
        <div class="gb-attack-hero-glow"></div>
        <div class="gb-attack-hero-horizon"></div>
      </div>
      <div class="gb-attack-hero-inner">
        <div class="gb-attack-hero-top">
          <h1 class="gb-welcome">${isFirstMission ? 'Welcome, ' : 'Welcome back, '}<span>${escapeHtml(playerName)}</span></h1>
          <div class="gb-mission-instructions" aria-label="How Siege Tactics works">
            <strong>${isFirstMission ? 'YOUR FIRST MISSION' : 'YOUR NEXT MISSION'}</strong>
            <span>1. Do the maths &nbsp; 2. Earn your siege &nbsp; 3. Place turrets and defend Granny!</span>
          </div>
        </div>
        <div class="gb-attack-hero-core">
          <div class="gb-threat-hud">
            ${renderInboundRadar(attack, open)}
            ${renderThreatDossier(open, attack)}
          </div>
        </div>
      </div>
    </section>
  `;
}

/** @type {(() => void)|null} */
let threatDossierCleanup = null;

/** Stop animated scanning intervals while visiting the battlefield or Armory. */
export function stopMissionDossier() {
  threatDossierCleanup?.();
  threatDossierCleanup = null;
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   playerName: string,
 *   xp: number,
 *   siegesCompleted: number,
 *   bestKills: number,
 *   bestBankedCoins: number,
 *   bestStars: Record<string, number>,
 *   primaryMissionId: string,
 *   gate: import('./training-gate.js').TrainingGate,
 *   levelMastery: import('./level-mastery.js').LevelMasterySave,
 *   mapProgress: import('./map-progress.js').MapProgressSave,
 *   topicProgress: import('./topic-progression.js').TopicProgressSave,
 *   difficultyLevel: import('./difficulty.js').DifficultyLevel,
 *   recommendedLevel: import('./difficulty.js').DifficultyLevel,
 *   onDifficultyChange: (level: import('./difficulty.js').DifficultyLevel) => void,
 *   onTopic: (topicId: string) => void,
 *   unlockedTurrets: Set<string>,
 *   onArmory: () => void,
 *   onHoldTheLine: () => void,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 * }} state
 */

// Show every maths activity immediately, in two familiar rows of five on
// a wide screen. The home page must not hide content behind "More topics".
const TOPIC_DISPLAY_ORDER = [
  'times-tables', 'measurement-length', 'fractions', 'operations', 'place-value-siege',
  'angles', 'mass-capacity', 'decimals-percent', 'time', 'maths-quest',
];

/**
 * Mission Control stays on screen while the student changes maths activities.
 * It is mounted separately from the maths workspace, so activities can rerender
 * without destroying the radar, progress, or controls.
 * @param {HTMLElement} host
 * @param {any} state
 */
export function renderMissionControl(host, state) {
  // The existing dossier has active scan intervals: stop them before
  // replacing the HTML, otherwise each maths answer leaks more timers.
  threatDossierCleanup?.();
  threatDossierCleanup = null;
  const attack = attackStatus(state.gate);
  const first = state.siegesCompleted === 0;
  host.dataset.threat = attack.urgency;
  const threatMessage = attack.open ? 'CONTACT! DEFEND GRANNY NOW!'
    : attack.remaining <= 2 ? 'DANGER: ALIENS AT THE FENCE!'
    : attack.remaining <= 5 ? 'WARNING: ALIENS CLOSING IN!'
    : attack.remaining <= 8 ? 'ENEMY SIGNAL DETECTED'
    : 'DISTANT ALIEN SIGNAL';
  host.innerHTML = `
    <div class="mission-control-inner">
      <div class="mission-control-heading">
        <span class="mission-control-eyebrow">MISSION CONTROL</span>
        <h2 class="mission-control-greeting">${first ? 'Welcome' : 'Welcome back'}, <span>${escapeHtml(state.playerName)}</span></h2>
      </div>
      <div class="mission-control-radar" aria-label="Alien radar and progress towards the next defence">
        ${renderInboundRadar(attack, attack.open)}
      </div>
      <div class="mission-control-alert" data-urgency="${attack.urgency}">${threatMessage}</div>
      <div class="mission-control-blueprint">
        ${renderThreatDossier(attack.open, attack)}
      </div>
      <button type="button" class="mission-control-home" id="mission-back-to-hq">⌂ &nbsp; Maths HQ</button>
    </div>
  `;
  threatDossierCleanup = initThreatDossier(host.querySelector('.threat-dossier'), {
    contact: attack.open,
    urgency: attack.urgency,
    defeatedByType: state.enemyDefeated,
  });
  host.querySelector('#btn-hold-line')?.addEventListener('click', state.onHoldTheLine);
  host.querySelector('#mission-back-to-hq')?.addEventListener('click', state.onHome);
}

/**
 * Siege readiness and lifetime player stats live beneath the Might animation.
 * Keeping this separate from Mission Control leaves the blueprint visible.
 * @param {HTMLElement|null} host
 * @param {any} state
 */
export function renderSiegeStats(host, state) {
  if (!host) return;
  const shields = countShieldsEarned(state.levelMastery);
  const sectors = mapPiecesEarned(state.mapProgress);
  const prior = host.querySelector('.mission-battle-stats');
  const html = `
    <div class="mission-battle-stats">
      ${renderCrystalVault(state.crystalsCollected ?? 0, state.crystalsToSpend ?? 0)}
      <div class="mission-progress-strip">
        <span>Sieges <strong>${state.siegesCompleted}</strong></span>
        <span>Best blasts <strong>${state.bestKills.toLocaleString()}</strong></span>
        <span>Shields <strong>${shields}</strong></span>
        <span>Map <strong>${sectors}/${TRAINING_MODULE_IDS.length}</strong></span>
      </div>
    </div>
  `;
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const stats = template.content.firstElementChild;
  if (prior) prior.replaceWith(stats);
  else host.append(stats);
  stats.querySelector('.crystal-vault-spend')?.addEventListener('click', () => state.onArmory?.());
  lastVaultCount = state.crystalsCollected ?? 0;
}

const VAULT_TIERS = [
  { at: 100, id: 'legend', name: 'LEGENDARY VAULT' },
  { at: 50, id: 'gold', name: 'GOLD VAULT' },
  { at: 25, id: 'silver', name: 'SILVER VAULT' },
  { at: 10, id: 'bronze', name: 'BRONZE VAULT' },
  { at: 0, id: 'starter', name: 'CRYSTAL VAULT' },
];

/** Crystals shown so far, so a newly collected one can drop into the pile. @type {number|null} */
let lastVaultCount = null;

/**
 * The Crystal Vault: a glass vault that physically fills with crystals as the player collects them,
 * the all-time total, the next vault tier to chase, and a shortcut to spend crystals in the Armory.
 * @param {number} collected @param {number} toSpend
 */
function renderCrystalVault(collected, toSpend) {
  const tier = VAULT_TIERS.find((t) => collected >= t.at) ?? VAULT_TIERS[VAULT_TIERS.length - 1];
  const next = [...VAULT_TIERS].reverse().find((t) => t.at > collected);
  // One crystal in the glass for every crystal collected in this vault's tier. Crystals are sized
  // for the tier, so the glass is exactly full when the vault upgrades.
  const room = next ? next.at - tier.at : 24;
  const shown = Math.min(room, Math.max(0, collected - tier.at));
  const cols = Math.max(3, Math.ceil(Math.sqrt(room * 1.05)));
  const rows = Math.ceil(room / cols);
  const cell = 100 / cols;
  const fresh = lastVaultCount != null && collected > lastVaultCount;
  const crystals = Array.from({ length: shown }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const left = col * cell + (row % 2 ? cell * 0.25 : 0) - cell * 0.1;
    const bottom = (row * 100) / rows;
    const turn = ((i * 53) % 50) - 25;
    const isNew = fresh && i === shown - 1;
    return `<span class="crystal-vault-crystal${isNew ? ' is-new' : ''}" style="left:${left.toFixed(1)}%;bottom:${bottom.toFixed(1)}%;width:${(cell * 1.15).toFixed(1)}%;--turn:${turn}deg"></span>`;
  }).join('');
  return `
    <section class="crystal-vault crystal-vault--${tier.id}" aria-label="Crystal vault: ${collected} alien crystals collected">
      <div class="crystal-vault-jar" aria-hidden="true">
        <div class="crystal-vault-pile">${crystals}</div>
        <div class="crystal-vault-glass"></div>
      </div>
      <div class="crystal-vault-copy">
        <span class="crystal-vault-tier">${tier.name}</span>
        <strong class="crystal-vault-count">${collected.toLocaleString()}</strong>
        <span class="crystal-vault-label">CRYSTALS COLLECTED</span>
        ${next ? `<span class="crystal-vault-next">${next.at - collected} more for ${next.name}</span>` : '<span class="crystal-vault-next">Every vault unlocked!</span>'}
        ${toSpend > 0 ? `<button type="button" class="crystal-vault-spend"><span class="core-gem" aria-hidden="true"></span>${toSpend} READY TO SPEND →</button>` : ''}
      </div>
    </section>`;
}

/** Scroll an opened details panel into view, so its contents never open out of sight. */
function revealWhenOpened(details) {
  details?.addEventListener('toggle', () => {
    if (details.open) requestAnimationFrame(() => details.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  });
}

/**
 * The maths area is deliberately separate from Mission Control.
 * Clicking a topic swaps only this workspace for the live activity.
 * @param {HTMLElement} host
 * @param {any} state
 */
export function renderHome(host, state) {
  const attack = attackStatus(state.gate);
  host.innerHTML = `
    <div class="mission-home">
      <header class="mission-workspace-heading">
        <span class="mission-kicker">MATHS HQ</span>
        <h1>Maths missions</h1>
      </header>
      <section class="mission-mixed-card" aria-label="Mixed maths mission">
        <div class="mission-mixed-symbol" aria-hidden="true">⚡</div>
        <div class="mission-mixed-copy">
          <span class="mission-recommended">${attack.open ? 'READY FOR ACTION' : 'QUICK START'}</span>
          <h2>${attack.open ? 'Granny needs you!' : 'Mixed Maths Mission'}</h2>
        </div>
        ${attack.open
          ? '<span class="mission-battle-ready">Use DEFEND GRANNY in Mission Control!</span>'
          : `<button type="button" id="mission-start-mixed" class="gb-forge-btn" aria-label="Random mission: ${attack.remaining} questions from every topic">🎲 RANDOM MISSION</button>`}
        <div class="mission-level-control">
          <div class="mission-level-intro">
            <span class="mission-level-title">LEVEL</span>
          </div>
          <div class="mission-level-buttons" role="group" aria-label="Choose maths difficulty and XP reward">
            ${[1, 2, 3, 4].map((n) => `
              <button type="button" class="mission-level-option${state.difficultyLevel === n ? ' is-selected' : ''}"
                data-level="${n}" aria-pressed="${state.difficultyLevel === n}"
                aria-label="Level ${n}, ${xpMultiplierLabel(/** @type {1|2|3|4} */ (n))}">
                <span class="mission-level-number">${n}</span>
                <span class="mission-level-reward">${xpMultiplierLabel(/** @type {1|2|3|4} */ (n))}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </section>
      ${renderArmoryPromo(state.xp, state.unlockedTurrets)}
      <section class="mission-topic-section" aria-label="Maths topics">
        <div class="mission-topic-grid mission-all-topics" aria-label="All ten maths topics">
          ${renderTrainingCards(state.gate, attack, state.levelMastery, state.mapProgress, TOPIC_DISPLAY_ORDER, state.topicProgress)}
        </div>
      </section>
      <details class="mission-map-details">
        <summary>Explore your interstellar map and achievements</summary>
        ${renderInterstellarMap(state.mapProgress)}
      </details>
    </div>
  `;

  host.querySelector('#mission-start-mixed')?.addEventListener('click', state.onHoldTheLine);
  host.querySelector('#mission-armory-open')?.addEventListener('click', state.onArmory);
  revealWhenOpened(host.querySelector('.mission-map-details'));
  host.querySelectorAll('[data-topic]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-topic');
      if (id && !btn.hasAttribute('disabled')) state.onTopic(id);
    });
  });

  host.querySelectorAll('[data-level]').forEach((button) => {
    button.addEventListener('click', () => {
      const level = Number(button.getAttribute('data-level'));
      if (![1, 2, 3, 4].includes(level) || level === state.difficultyLevel) return;
      state.onDifficultyChange(/** @type {1|2|3|4} */ (level));
    });
  });
}

/**
 * @param {HTMLElement|null} container
 * @param {Record<string, number>} bestStars
 * @param {string} primaryMissionId
 */
export function renderTopbarBadges(container, bestStars, primaryMissionId) {
  if (!container) return;
  const level = summarizeBadgeCollection(bestStars, primaryMissionId).displayCount;
  const rankedUp = lastBadgeLevel != null && level > lastBadgeLevel;
  lastBadgeLevel = level;
  const shown = Math.max(1, level);
  const name = level ? STAR_LABELS[level - 1] : 'Recruit';
  const next = level < STAR_LABELS.length ? { name: STAR_LABELS[level], hint: STAR_HINTS[level] } : null;
  container.classList.remove('badge-row-compact');
  container.innerHTML = `
    <button type="button" class="rank-badge${level ? '' : ' is-locked'}${rankedUp ? ' is-rank-up' : ''}" aria-haspopup="dialog"
      aria-label="${level ? `Your rank: ${name}` : 'No rank yet'}${next ? `. Next: ${next.name}, ${next.hint}` : '. Top rank reached'}. Show all ranks.">
      <span class="rank-badge-art"><img src="${badgeSrc(shown)}" alt="" width="57" height="57" />${level ? '' : '<span class="rank-badge-lock" aria-hidden="true">🔒</span>'}</span>
      <span class="rank-badge-copy">
        <strong class="rank-badge-name">${level ? name.toUpperCase() : 'NO RANK YET'}</strong>
        <span class="rank-badge-next">${next ? `Next: ${next.name} · ${next.hint}` : 'Top rank!'}</span>
      </span>
    </button>`;
  container.querySelector('.rank-badge')?.addEventListener('click', () => showRankLadder(level));
  if (rankedUp) showRankUp(name, shown);
}

/** The badge level last shown in the header, so a new rank can be celebrated. @type {number|null} */
let lastBadgeLevel = null;

/** A short celebration when the header badge upgrades. @param {string} name @param {number} level */
function showRankUp(name, level) {
  document.querySelector('.rank-up')?.remove();
  const el = document.createElement('div');
  el.className = 'rank-up';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="core-reward-rays" aria-hidden="true"></span>
    <img class="rank-up-badge" src="${badgeSrc(level)}" alt="" width="150" height="150" />
    <strong class="rank-up-title">RANK UP!</strong>
    <span class="rank-up-name">${name.toUpperCase()}</span>`;
  document.body.append(el);
  window.setTimeout(() => el.classList.add('is-leaving'), 2400);
  window.setTimeout(() => el.remove(), 3000);
}

/** All five ranks, earned ones lit, with what each needs. @param {number} level */
function showRankLadder(level) {
  document.querySelector('.rank-ladder')?.remove();
  const el = document.createElement('div');
  el.className = 'rank-ladder';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Siege ranks');
  el.innerHTML = `
    <div class="rank-ladder-panel">
      <h2 class="rank-ladder-title">SIEGE RANKS</h2>
      <ol class="rank-ladder-list">
        ${STAR_LABELS.map((label, i) => `
          <li class="rank-ladder-item${i < level ? ' is-earned' : ''}${i === level ? ' is-next' : ''}">
            <img src="${badgeSrc(i + 1)}" alt="" width="64" height="64" />
            <strong>${label}</strong>
            <span>${STAR_HINTS[i]}</span>
            <em>${i < level ? 'EARNED' : i === level ? 'NEXT' : 'LOCKED'}</em>
          </li>`).join('')}
      </ol>
      <button type="button" class="rank-ladder-close">GOT IT</button>
    </div>`;
  const close = () => el.remove();
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  el.querySelector('.rank-ladder-close')?.addEventListener('click', close);
  document.body.append(el);
}

/** @param {string} s */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
