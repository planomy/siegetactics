import { MATH_TOPICS } from './topics-data.js';
import {
  attackStatus,
  isTopicDone,
} from './training-gate.js';
import { STAR_LABELS, STAR_HINTS, summarizeBadgeCollection, renderStarBadges } from './stars.js';
import { renderThreatDossier, initThreatDossier } from './threat-dossier.js';
import { renderModuleLevelPips, MAP_PASSES_REQUIRED } from './level-mastery.js';
import { renderInterstellarMap, renderModuleMapProgress, mapPiecesEarned, TRAINING_MODULE_IDS } from './map-progress.js';
import { getQualifiedLevels } from './level-mastery.js';
import { ECONOMY } from './economy.js';
import { xpMultiplierLabel } from './difficulty.js';

/** @param {import('./training-gate.js').TrainingGate} gate @param {ReturnType<typeof attackStatus>} attack @param {import('./level-mastery.js').LevelMasterySave} levelMastery @param {import('./map-progress.js').MapProgressSave} mapProgress */
function renderTrainingCards(gate, attack, levelMastery, mapProgress) {
  return MATH_TOPICS.map((topic) => {
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
    code: 'PREP-01',
    label: 'Guided curriculum run',
    status: attack.open ? 'Cleared to engage' : 'Required before deployment',
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
          <span class="gb-metric-label">Prep checks</span>
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

  const target = 8 + Math.floor(Math.random() * 13);
  const count = Math.max(1, Math.round(target * progress));
  const arcSpan = 14 + progress * 26;
  const rMin = Math.min(blipR + 3, 44);
  const rMax = Math.min(blipR + 10 + progress * 16, 48);

  const dots = Array.from({ length: count }, () => {
    const angle = blipDeg + (Math.random() - 0.5) * arcSpan * 2;
    const radius = rMin + Math.random() * Math.max(1, rMax - rMin);
    const size = 3 + Math.random() * 3.5;
    const opacity = 0.35 + Math.random() * 0.45;
    const delay = (Math.random() * 0.85).toFixed(2);
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

  const drillCaption = 'Battle Prep';

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
      <p class="inbound-radar-label">Inbound alien signal · train to push back</p>
      <button type="button" class="gb-forge-btn gb-attack-hero-cta" id="btn-hold-line">START BATTLE PREP</button>
    </div>
  `;
}

/**
 * @param {ReturnType<typeof attackStatus>} attack
 * @param {import('./training-gate.js').TrainingGate} gate
 * @param {string} playerName
 */
function renderAttackHero(attack, gate, playerName) {
  const open = attack.open;

  return `
    <section
      class="gb-attack-hero gb-attack-${attack.urgency}${open ? ' gb-attack-hero-ready' : ''}"
      aria-label="${escapeHtml(open ? 'Attack now — deploy to siege' : 'Battle Prep required before attack')}"
    >
      <div class="gb-attack-hero-bg" aria-hidden="true">
        <div class="gb-attack-hero-glow"></div>
        <div class="gb-attack-hero-horizon"></div>
      </div>
      <div class="gb-attack-hero-inner">
        <div class="gb-attack-hero-top">
          <h1 class="gb-welcome">Welcome back, <span>${escapeHtml(playerName)}</span></h1>
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
 *   onHoldTheLine: () => void,
 *   showToast: (msg: string, opts?: { variant?: string }) => void,
 * }} state
 */
export function renderHome(host, state) {
  if (threatDossierCleanup) {
    threatDossierCleanup();
    threatDossierCleanup = null;
  }

  const attack = attackStatus(state.gate);
  const open = attack.open;

  host.innerHTML = `
    <div class="home-layout gb-home">
      ${renderAttackHero(attack, state.gate, state.playerName)}

      <div class="gb-home-grid">
        <div class="gb-home-main">
          <section class="gb-training" aria-label="Training modules">
            <div class="gb-training-head">
              <h2 class="gb-gallery-title"><span class="gb-gallery-icon" aria-hidden="true">×</span> Optional practice modules</h2>
              <div class="gb-level-control">
                <span class="gb-level-label">Level</span>
                <div class="gb-level-picker" role="group" aria-label="Difficulty level">
                  ${[1, 2, 3, 4]
                    .map(
                      (n) => `
                    <button
                      type="button"
                      class="gb-level-btn${state.difficultyLevel === n ? ' is-active' : ''}${state.recommendedLevel === n && state.difficultyLevel !== n ? ' is-recommended' : ''}"
                      data-level="${n}"
                      aria-pressed="${state.difficultyLevel === n}"
                      ${state.recommendedLevel === n ? `title="Granny recommends Level ${n} · ${xpMultiplierLabel(/** @type {1|2|3|4} */ (n))}"` : ''}
                    >${n}</button>`
                    )
                    .join('')}
                </div>
              </div>
            </div>
            <p class="gb-level-xp-hint">Level ${state.difficultyLevel} pays ${xpMultiplierLabel(state.difficultyLevel)} · 100% earns shields · ${MAP_PASSES_REQUIRED}× at 80%+ earns a map piece</p>
            <div class="gb-story-grid">${renderTrainingCards(state.gate, attack, state.levelMastery, state.mapProgress)}</div>
          </section>
        </div>

        <aside class="gb-home-sidebar">
          ${renderCommandSidebar(
            {
              xp: state.xp,
              siegesCompleted: state.siegesCompleted,
              bestKills: state.bestKills,
              bestBankedCoins: state.bestBankedCoins,
              difficultyLevel: state.difficultyLevel,
              levelMastery: state.levelMastery,
              mapProgress: state.mapProgress,
            },
            state.gate,
            attack
          )}
        </aside>
      </div>

      ${renderInterstellarMap(state.mapProgress)}
    </div>
  `;

  host.querySelector('#btn-hold-line')?.addEventListener('click', () => {
    state.onHoldTheLine();
  });

  host.querySelectorAll('[data-topic]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-topic');
      if (!id || btn.hasAttribute('disabled')) return;
      state.onTopic(id);
    });
  });

  host.querySelectorAll('[data-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const level = Number(btn.getAttribute('data-level'));
      if (level !== 1 && level !== 2 && level !== 3 && level !== 4) return;
      if (level === state.difficultyLevel) return;
      state.onDifficultyChange(/** @type {1|2|3|4} */ (level));
    });
  });

  const dossierEl = host.querySelector('.threat-dossier');
  if (dossierEl) {
    threatDossierCleanup = initThreatDossier(dossierEl, {
      contact: open,
      urgency: attack.urgency,
    });
  }

  playReadinessGrow(host, attack);
  playXpGrow(host, state.xp);
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
