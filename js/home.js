import { MATH_TOPICS } from './topics-data.js';
import {
  attackStatus,
  bonusSiegeSeconds,
  isTopicDone,
} from './training-gate.js?v=20261112g';
import { STAR_LABELS, STAR_HINTS, summarizeBadgeCollection, renderStarBadges } from './stars.js';
import { renderThreatDossier, initThreatDossier } from './threat-dossier.js';
import { renderModuleLevelPips, MAP_PASSES_REQUIRED } from './level-mastery.js';
import { renderInterstellarMap, renderModuleMapProgress, mapPiecesEarned, TRAINING_MODULE_IDS } from './map-progress.js';
import { getQualifiedLevels } from './level-mastery.js';
import { ECONOMY } from './economy.js';
import { xpMultiplierLabel } from './difficulty.js';
import { renderArmoryPromo } from './armory-promo.js?v=20261112f';

/** @param {import('./training-gate.js').TrainingGate} gate @param {ReturnType<typeof attackStatus>} attack @param {import('./level-mastery.js').LevelMasterySave} levelMastery @param {import('./map-progress.js').MapProgressSave} mapProgress */
function renderTrainingCards(gate, attack, levelMastery, mapProgress, selectedTopics = MATH_TOPICS.map((t) => t.id)) {
  return MATH_TOPICS.filter((topic) => selectedTopics.includes(topic.id)).map((topic) => {
    const locked = !topic.available;
    const complete =
      topic.id === 'times-tables'
        ? attack.open
        : Boolean(topic.unitId) && isTopicDone(gate, topic.id);
    const pips = !locked ? renderModuleLevelPips(levelMastery, topic.id) : '';
    const mapPip = !locked ? renderModuleMapProgress(mapProgress, topic.id) : '';
    const progressRow =
      pips || mapPip
        ? `<span class="gb-module-level-pips" aria-hidden="true">${pips}${mapPip}</span>`
        : '';
    const artClass = `gb-story-art gb-story-art-${topic.id.replace(/[^a-z-]/g, '')}`;
    const artInner = topic.moduleArt
      ? `<img class="gb-story-art-img" src="${topic.moduleArt}" alt="" width="400" height="400" loading="lazy" />`
      : `<span class="gb-story-art-emoji">${topic.emoji}</span>`;
    return `
      <button
        type="button"
        class="gb-story-card${locked ? ' gb-story-locked' : ''}${complete ? ' gb-story-complete' : ''}"
        data-topic="${topic.id}"
        ${locked ? 'disabled' : ''}
      >
        <div class="${artClass}" aria-hidden="true">
          ${artInner}
        </div>
        ${complete ? '<span class="gb-story-badge gb-story-badge-done">Done</span>' : ''}
        <span class="gb-story-title">${topic.title}</span>
        ${progressRow}
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
      <p class="inbound-radar-label">${attack.remaining <= 2 ? 'Aliens nearly at Granny’s house!' : attack.remaining <= 5 ? 'Radar warning: enemy getting closer!' : 'Red blips move closer as you answer maths'}</p>
      <button type="button" class="gb-forge-btn gb-attack-hero-cta" id="btn-hold-line">START ${attack.remaining}-QUESTION MISSION</button>
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

const FRONT_TOPICS = ['times-tables', 'fractions', 'operations', 'measurement-length'];
let expandedTopicsVisible = false;

/**
 * Mission Control stays on screen while the student changes maths activities.
 * It is mounted separately from the maths workspace, so activities can rerender
 * without destroying the radar, progress, or controls.
 * @param {HTMLElement} host
 * @param {any} state
 */
export function renderMissionControl(host, state) {
  const attack = attackStatus(state.gate);
  const first = state.siegesCompleted === 0;
  const shields = countShieldsEarned(state.levelMastery);
  const sectors = mapPiecesEarned(state.mapProgress);
  const progress = Math.round(attack.pct * 100);
  const label = attack.open ? 'BATTLE READY' : 'EARN YOUR NEXT SIEGE';
  const earnedBonus = bonusSiegeSeconds(state.gate);
  const extraQuestions = Math.max(0, 15 - (state.gate.questionsDone || 0));
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
        <p>Do maths. Earn defences. Save Granny.</p>
      </div>
      <div class="mission-control-radar" aria-label="Alien radar and progress towards the next defence">
        ${renderInboundRadar(attack, attack.open)}
      </div>
      <div class="mission-control-alert" data-urgency="${attack.urgency}">${threatMessage}</div>
      <div class="mission-control-progress">
        <div class="mission-control-progress-line">
          <strong>${label}</strong>
          <span>${attack.done} / ${attack.total} questions</span>
        </div>
        <div class="mission-control-track" role="progressbar" aria-label="Maths progress towards siege" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${attack.done}">
          <div class="mission-control-fill" style="width: ${progress}%"></div>
        </div>
        <p>${attack.open ? 'Ready to defend! Extra maths earns extra battle time.' : `Only ${attack.remaining} more maths question${attack.remaining === 1 ? '' : 's'} to go.`}</p>
        ${attack.open ? `<div class="mission-bonus-progress">${earnedBonus === 30 ? '★ BONUS ASSAULT +30s earned!' : earnedBonus === 15 ? '★ +15s earned! Answer 5 more for +30s.' : `★ Answer ${extraQuestions} more maths questions for +15s bonus time.`}</div>` : ''}
      </div>
      <div class="mission-control-metrics">
        <div><span>FORGE XP</span><strong id="mission-control-xp">${state.xp.toLocaleString()}</strong></div>
        <div><span>SIEGES PLAYED</span><strong>${state.siegesCompleted}</strong></div>
      </div>
      <details class="mission-control-details">
        <summary>My progress <span aria-hidden="true">⌄</span></summary>
        <div class="mission-control-detail-grid">
          <div><span>Best blasts</span><strong>${state.bestKills.toLocaleString()}</strong></div>
          <div><span>Shields earned</span><strong>${shields}</strong></div>
          <div><span>Map charted</span><strong>${sectors}/${TRAINING_MODULE_IDS.length}</strong></div>
          <div><span>Best coins banked</span><strong>${state.bestBankedCoins.toLocaleString()}</strong></div>
        </div>
      </details>
      <button type="button" class="mission-control-home" id="mission-back-to-hq">⌂ &nbsp; Maths HQ</button>
    </div>
  `;
  host.querySelector('#btn-hold-line')?.addEventListener('click', state.onHoldTheLine);
  host.querySelector('#mission-back-to-hq')?.addEventListener('click', state.onHome);
}

/**
 * The maths area is deliberately separate from Mission Control.
 * Clicking a topic swaps only this workspace for the live activity.
 * @param {HTMLElement} host
 * @param {any} state
 */
export function renderHome(host, state) {
  const attack = attackStatus(state.gate);
  const otherTopics = MATH_TOPICS.map((t) => t.id).filter((id) => !FRONT_TOPICS.includes(id));
  const extraTime = bonusSiegeSeconds(state.gate);
  const answered = state.gate.questionsDone || 0;
  const mixedLabel = attack.open
    ? extraTime === 30 ? '60-second battle + a 30-second bonus assault earned!'
      : extraTime === 15 ? '60-second battle + a 15-second bonus assault earned!'
      : '60-second battle ready. Answer five more maths questions to earn +15 seconds!'
    : '10 quick questions across different maths topics';
  host.innerHTML = `
    <div class="mission-home">
      <header class="mission-workspace-heading">
        <span class="mission-kicker">MATHS HQ</span>
        <h1>Choose your maths mission</h1>
        <p>10 questions earn a battle. 15 earn a bonus +15 seconds, and 20 earn +30 seconds. You choose when to fight!</p>
      </header>
      <section class="mission-mixed-card" aria-label="Mixed maths mission">
        <div class="mission-mixed-symbol" aria-hidden="true">⚡</div>
        <div class="mission-mixed-copy">
          <span class="mission-recommended">${attack.open ? 'READY FOR ACTION' : 'QUICK START'}</span>
          <h2>${attack.open ? 'Granny needs you!' : 'Mixed Maths Mission'}</h2>
          <p>${mixedLabel}</p>
        </div>
        ${attack.open
          ? '<span class="mission-battle-ready">Use DEFEND GRANNY in Mission Control!</span>'
          : `<button type="button" id="mission-start-mixed" class="gb-forge-btn">START ${attack.remaining}-QUESTION MISSION</button>`}
      </section>
      ${renderArmoryPromo(state.xp, state.unlockedTurrets)}
      <section class="mission-topic-section" aria-label="Maths topics">
        <div class="mission-topic-heading">
          <div>
            <h2>Or choose a topic</h2>
            <p>${answered >= 10 ? 'Keep training to unlock bonus battle time, or launch your siege!' : 'Each completed activity earns progress and Forge XP.'}</p>
          </div>
          <div class="mission-level-control">
            <div class="mission-level-intro">
              <span class="mission-level-title">LEVEL</span>
              <span class="mission-level-hint">Harder maths earns more XP</span>
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
        </div>
        <div class="mission-topic-grid">${renderTrainingCards(state.gate, attack, state.levelMastery, state.mapProgress, FRONT_TOPICS)}</div>
        <button type="button" id="mission-show-more" class="mission-more-button"
          aria-expanded="${expandedTopicsVisible}" aria-controls="mission-extra-topics">
          ${expandedTopicsVisible ? '− Show fewer topics' : '+ More maths topics'}
        </button>
        <div id="mission-extra-topics" class="mission-topic-grid mission-extra-topics" ${expandedTopicsVisible ? '' : 'hidden'}>
          ${renderTrainingCards(state.gate, attack, state.levelMastery, state.mapProgress, otherTopics)}
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
  host.querySelector('#mission-show-more')?.addEventListener('click', () => {
    expandedTopicsVisible = !expandedTopicsVisible;
    const more = host.querySelector('#mission-show-more');
    const extras = host.querySelector('#mission-extra-topics');
    if (extras) extras.hidden = !expandedTopicsVisible;
    if (more) {
      more.setAttribute('aria-expanded', String(expandedTopicsVisible));
      more.textContent = expandedTopicsVisible ? '− Show fewer topics' : '+ More maths topics';
    }
  });

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
  const badges = summarizeBadgeCollection(bestStars, primaryMissionId);
  renderStarBadges(
    container,
    { earned: badges.tiers, labels: STAR_LABELS, hints: STAR_HINTS },
    { compact: true }
  );
}

/** @param {string} s */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
