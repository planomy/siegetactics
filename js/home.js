import { MATH_TOPICS, getTopic } from './topics-data.js?v=20261118f2';
import { attackStatus, answersForCharge, answersProgress } from './training-gate.js?v=20261115p1';
import { badgeSrc } from './stars.js';
import { SIEGE_RANKS, siegeRankLevel, rankProgressText } from './siege-ranks.js?v=20261112a2';
import { hotTopicId } from './hot-topic.js?v=20261112a1';
import { renderThreatDossier, initThreatDossier } from './threat-dossier.js?v=20261118w8';
import { rareDossiers } from './rare-ships.js?v=20261114t1';
import {
  renderInterstellarMap, mapPiecesEarned, getMapPasses, MAP_PASSES_REQUIRED, TRAINING_MODULE_IDS, MAP_SECTORS,
  currentMapSeason, seasonLabel, seasonPiecesEarned, canWarpToDoompickle, homelandMaxLevel, seasonComplete,
} from './map-progress.js?v=20261117f2';
import { getQualifiedLevels, renderModuleLevelPips } from './level-mastery.js?v=20261116xp34';
import { ECONOMY } from './economy.js';
import { xpMultiplierLabel, xpMultiplierFor, DIFFICULTY, isDifficultyLevel } from './difficulty.js?v=20261114k1';
import { renderArmoryPromo } from './armory-promo.js?v=20261117e2';
import { animateTally } from './tally.js';
import { ENEMY_SPRITE_SRC, GRUNT_STATS, BOSS_STATS } from './enemies-data.js';
import { showTipPill } from './tip-pills.js?v=20261117f1';

/** The Alien Homeland, a page of its own. */
const HOMELAND_URL = 'homeland.html';

/**
 * Ten campaign cards. Brag board = level shields (L1–L6) earned with a perfect run
 * at that difficulty. Soft path = L1 on every topic; flex = fill L2–L6. Topic ★ XP
 * still accrues in the background but stays off the card so kids see one story.
 * @param {import('./training-gate.js?v=20261114n1').TrainingGate} gate
 * @param {ReturnType<typeof attackStatus>} attack
 * @param {import('./level-mastery.js?v=20261114k1').LevelMasterySave} levelMastery
 * @param {import('./map-progress.js').MapProgressSave} mapProgress
 * @param {string[]} selectedTopics
 * @param {import('./topic-progression.js?v=20261114k1').TopicProgressSave} [_topicProgress]
 */
function renderTrainingCards(gate, attack, levelMastery, mapProgress, selectedTopics = MATH_TOPICS.map((t) => t.id), _topicProgress = {}) {
  // Respect the five-by-two screen order, never re-sort by "completion".
  return MATH_TOPICS.filter((topic) => selectedTopics.includes(topic.id))
    .sort((a, b) => selectedTopics.indexOf(a.id) - selectedTopics.indexOf(b.id))
    .map((topic) => {
      const locked = !topic.available;
      const qualified = getQualifiedLevels(levelMastery, topic.id);
      const earned = qualified.length;
      const artClass = `gb-story-art gb-story-art-${topic.id.replace(/[^a-z-]/g, '')}`;
      const hot = !locked && topic.id === hotTopicId();
      const art = topic.moduleArt
        ? `<img class="gb-story-art-img" src="${topic.moduleArt}" alt="" width="400" height="400" loading="lazy" />`
        : `<span class="gb-story-art-emoji">${topic.emoji}</span>`;
      const hotPill = hot
        ? '<span class="gb-topic-hot" aria-hidden="true"><span class="gb-topic-hot-flame">🔥</span><strong class="gb-topic-hot-label">2× XP</strong></span>'
        : '';
      const shieldNote = earned
        ? `${earned} of 6 level shields earned`
        : 'no level shields yet — clear a set at 100% to earn one';
      return `
        <button type="button"
          class="gb-story-card gb-topic-campaign-card${locked ? ' gb-story-locked' : ''}${hot ? ' is-hot' : ''}"
          data-topic="${topic.id}"
          aria-label="${topic.title}${hot ? ', hot topic today, double XP' : ''}, ${shieldNote}"
          ${locked ? 'disabled' : ''}>
          <span class="${artClass}" aria-hidden="true">${art}${hotPill}</span>
          ${topic.moduleArt ? '' : `<span class="gb-story-title">${topic.title}</span>`}
          <span class="gb-topic-shields" aria-hidden="true">${renderModuleLevelPips(levelMastery, topic.id)}</span>
        </button>
      `;
    }).join('');
}

/** @param {import('./training-gate.js?v=20261114n1').TrainingGate} gate @param {ReturnType<typeof attackStatus>} attack */
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
 * Earned XP counts up from the last total shown while the emblem flares; spending just updates the number.
 * @param {HTMLElement} host
 * @param {number} targetXp
 */
function playMissionXp(host, targetXp) {
  const value = host.querySelector('#mission-control-xp');
  const badge = host.querySelector('.mission-xp');
  const startXp = lastHomeXp ?? targetXp;
  lastHomeXp = targetXp;
  if (!value) return;
  if (startXp >= targetXp || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    value.textContent = formatForgeXp(targetXp);
    return;
  }
  badge?.classList.add('is-gaining');
  animateTally(value, targetXp, { from: startXp, duration: HOME_GROW_DURATION_MS, format: formatForgeXp })
    .then(() => badge?.classList.remove('is-gaining'));
}

/** @param {import('./level-mastery.js?v=20261114k1').LevelMasterySave} mastery */
export function countShieldsEarned(mastery) {
  return TRAINING_MODULE_IDS.reduce((n, id) => n + getQualifiedLevels(mastery, id).length, 0);
}

/** @param {{ xp: number, siegesCompleted: number, bestKills: number, bestBankedCoins: number, difficultyLevel: import('./difficulty.js?v=20261114k1').DifficultyLevel, levelMastery: import('./level-mastery.js?v=20261114k1').LevelMasterySave, mapProgress: import('./map-progress.js').MapProgressSave }} stats @param {import('./training-gate.js?v=20261114n1').TrainingGate} gate @param {ReturnType<typeof attackStatus>} attack */
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
  // More of them, bigger and brighter at each checkpoint: a few scouts become a mass at the fence.
  const stage = attack.stage ?? 0;
  const count = Math.max(3, Math.round(4 + 26 * progress));
  const arcSpan = 16 + progress * 40;
  const baseSize = [4.5, 6.5, 8.5, 8.5][stage];
  const dots = Array.from({ length: count }, (_, i) => {
    const angle = blipDeg + (((i * 7) % 11) - 5) * arcSpan / 11;
    const radius = Math.max(5, Math.min(45, blipR + ((i * 3) % 7 - 3) * (1.65 + stage * 0.6)));
    const size = baseSize + (i % 4) * 1.1;
    const opacity = 0.78 + (i % 5) * 0.055;
    const delay = ((i % 7) * 0.12).toFixed(2);
    return `<span class="inbound-radar-escort" style="--escort-deg:${angle.toFixed(1)}deg;--escort-r:${radius.toFixed(1)}%;--escort-size:${size.toFixed(1)}px;--escort-opacity:${opacity.toFixed(2)};--escort-delay:${delay}s" aria-hidden="true"></span>`;
  });

  return `<div class="inbound-radar-escorts" aria-hidden="true">${dots.join('')}</div>`;
}

const RADAR_CONTACT_ART = ['ufo', 'rocket', 'satellite', 'meteor', 'asteroid', 'space-station', 'alien-egg', 'wormhole', 'helmet', 'supply-crate'];
/** Spots around the dish, clear of the centre text: degrees clockwise from the top, and distance from the centre in %. */
const RADAR_CONTACT_SLOTS = [[28, 36], [96, 37], [158, 35], [212, 37], [276, 36], [334, 35]];
const RADAR_CONTACTS_SHOWN = 4;
/** Where the bright edge of the sweep sits when the sweep starts, in degrees. */
const RADAR_SWEEP_EDGE_DEG = 12;

let radarContacts = pickRadarContacts();

function pickRadarContacts(random = Math.random) {
  const shuffle = (list) => list.map((item) => [random(), item]).sort((a, b) => a[0] - b[0]).map(([, item]) => item);
  const art = shuffle(RADAR_CONTACT_ART);
  return shuffle(RADAR_CONTACT_SLOTS)
    .slice(0, RADAR_CONTACTS_SHOWN)
    .map(([deg, r], i) => ({ art: art[i], deg, r }));
}

/** Faint red shapes on the radar that flash into full colour as the sweep passes over them. */
function renderRadarContacts() {
  const contacts = radarContacts.map(({ art, deg, r }) => {
    const rad = (deg * Math.PI) / 180;
    const left = 50 + r * Math.sin(rad);
    const top = 50 - r * Math.cos(rad);
    const sweepAt = (((deg - RADAR_SWEEP_EDGE_DEG) % 360) + 360) % 360 / 360;
    return `<img class="radar-contact" src="assets/radar/${art}.png?v=2" alt="" style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;--sweep-at:${sweepAt.toFixed(3)}" />`;
  });
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(syncRadarContacts);
  return `<div class="inbound-radar-contacts" aria-hidden="true">${contacts.join('')}</div>`;
}

/** The sweep's animation can start earlier than the contacts', so their flashes are lined up with it after each render. */
function syncRadarContacts() {
  document.querySelectorAll('.inbound-radar-dish').forEach((dish) => {
    const sweep = dish.querySelector('.inbound-radar-sweep')?.getAnimations?.()[0];
    const pings = [...dish.querySelectorAll('.radar-contact')].flatMap((contact) => contact.getAnimations());
    if (!sweep || !pings.length) return;
    Promise.all([sweep.ready, ...pings.map((ping) => ping.ready)])
      .then(() => {
        pings.forEach((ping) => {
          ping.currentTime = sweep.currentTime;
        });
      })
      .catch(() => {});
  });
}

/** Last radar zone shown, so the radar flashes when the horde moves up a zone. @type {number|null} */
let lastRadarStage = null;

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
    const arriving = lastRadarStage !== 3;
    lastRadarStage = 3;
    return `
      <div class="inbound-radar inbound-radar-contact">
        <div class="inbound-radar-dish inbound-radar-dish-alert">
          <div class="inbound-radar-grid" aria-hidden="true"></div>
          <div class="inbound-radar-sweep inbound-radar-sweep-fast" aria-hidden="true"></div>
          ${renderRadarEscorts(attack, blipDeg, minR)}
          ${renderRadarContacts()}
          <span class="radar-launch-ring" aria-hidden="true"></span>
          <span class="radar-launch-ring radar-launch-ring--late" aria-hidden="true"></span>
          <button type="button" class="radar-launch${arriving ? ' is-arriving' : ''}" id="btn-hold-line"><span class="radar-launch-label">DEFEND<br />GRANNY</span></button>
        </div>
      </div>
    `;
  }

  const stage = attack.stage ?? 0;
  const stageUp = lastRadarStage !== null && stage > lastRadarStage;
  lastRadarStage = stage;
  return `
    <div class="inbound-radar inbound-radar-${attack.urgency} inbound-radar-stage-${stage}${stageUp ? ' is-stage-up' : ''}">
      <div
        class="inbound-radar-dish"
        style="--blip-r: ${blipR}%; --blip-deg: ${blipDeg}deg; --sweep-speed: ${attack.urgency === 'critical' ? '2s' : attack.urgency === 'warning' ? '2.8s' : '3.6s'}"
      >
        <div class="inbound-radar-grid" aria-hidden="true"></div>
        <div class="radar-zones" aria-hidden="true">
          <span class="radar-zone radar-zone--far${stage === 0 ? ' is-current' : ''}"><i>FAR</i></span>
          <span class="radar-zone radar-zone--closing${stage === 1 ? ' is-current' : ''}"><i>CLOSING</i></span>
          <span class="radar-zone radar-zone--fence${stage >= 2 ? ' is-current' : ''}"><i>FENCE</i></span>
        </div>
        <div class="inbound-radar-sweep" aria-hidden="true"></div>
        ${renderRadarEscorts(attack, blipDeg, blipR)}
        <div class="inbound-radar-blip" aria-hidden="true"></div>
        <div class="inbound-radar-galaxy" aria-hidden="true"></div>
        <div class="inbound-radar-planets" aria-hidden="true">
          <span class="radar-planet radar-planet--ringed"></span>
          <span class="radar-planet radar-planet--blue"><i class="radar-moon"></i></span>
          <span class="radar-planet radar-planet--red"></span>
          <span class="radar-planet radar-planet--ice"></span>
          <span class="radar-comet"></span>
        </div>
        ${renderRadarContacts()}
        <div class="inbound-radar-hub inbound-radar-hub-scan">
          <span class="inbound-radar-scan">DETECTING</span>
          <span class="inbound-radar-unit">ALIEN HORDE</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * @param {ReturnType<typeof attackStatus>} attack
 * @param {import('./training-gate.js?v=20261114n1').TrainingGate} gate
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
 *   gate: import('./training-gate.js?v=20261114n1').TrainingGate,
 *   levelMastery: import('./level-mastery.js?v=20261114k1').LevelMasterySave,
 *   mapProgress: import('./map-progress.js').MapProgressSave,
 *   topicProgress: import('./topic-progression.js?v=20261114k1').TopicProgressSave,
 *   difficultyLevel: import('./difficulty.js?v=20261114k1').DifficultyLevel,
 *   recommendedLevel: import('./difficulty.js?v=20261114k1').DifficultyLevel,
 *   onDifficultyChange: (level: import('./difficulty.js?v=20261114k1').DifficultyLevel) => void,
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
 * Once a siege is earned: what is coming (the opening assault, by alien type) against what the player
 * takes into battle. Extra right answers grow the chest and zap scouts out of the horde, live.
 * @param {ReturnType<typeof import('./waves-data.js?v=20261115w1').openingHorde>} horde
 * @param {{ coins: number, bonusSeconds: number, extraLeft: number, coinsPerAnswer: number }} chest
 */
function renderHordeFaceoff(horde, chest) {
  const troops = horde.troops.map(({ unit, count }) => {
    const name = GRUNT_STATS[unit]?.codename ?? BOSS_STATS[unit]?.codename ?? unit;
    return `
    <li class="faceoff-troop" title="${name}">
      <img src="${ENEMY_SPRITE_SRC[unit]}" alt="${name}" />
      <b>×${count}</b>
    </li>`;
  }).join('');
  const canZap = horde.zapped < horde.zapCap;
  const zapsLeft = Math.max(0, horde.zapCap - horde.zapped);
  const n = canZap ? zapsLeft : chest.extraLeft;
  // Reward, not a cost: each right answer pays coins (and zaps a scout while any remain).
  const zap = chest.extraLeft <= 0
    ? '<p class="faceoff-tip">Maths maxed out — hit Defend Granny on the radar!</p>'
    : `<button type="button" class="faceoff-zap">
        <strong>${canZap ? `ZAP ${zapsLeft} ALIEN${zapsLeft === 1 ? '' : 'S'} BEFORE THE BATTLE` : 'MORE COINS'}</strong>
        <span>Answer ${n} more question${n === 1 ? '' : 's'} — Earn +${chest.coinsPerAnswer} coins each</span>
      </button>`;
  return `
    <section class="horde-faceoff" aria-label="Incoming horde: ${horde.total} aliens. Your war chest: ${chest.coins} coins.">
      <span class="faceoff-label faceoff-label-horde">INCOMING HORDE</span>
      <span class="faceoff-label faceoff-label-chest">WAR CHEST</span>
      <ul class="faceoff-troops${horde.troops.length > 2 ? ' is-many' : ''}">${troops}${horde.zapped
        ? `<li class="faceoff-zapped" title="${horde.zapped} scout${horde.zapped === 1 ? '' : 's'} zapped by extra maths">−${horde.zapped}</li>`
        : ''}</ul>
      <span class="faceoff-vs" aria-hidden="true">VS</span>
      <div class="faceoff-chest">
        <span class="faceoff-chest-row">
          <img class="faceoff-chest-art" src="assets/ui/icons/chest.png?v=1" alt="" />
          <strong class="faceoff-coins">${chest.coins}</strong>
        </span>
        <span class="faceoff-coins-label">COINS${chest.bonusSeconds ? ` · +${chest.bonusSeconds}s` : ''}</span>
      </div>
      ${zap ? `<div class="faceoff-actions">${zap}</div>` : ''}
    </section>`;
}

/**
 * Under-quiz stakes strip: big "INVASION IN N", then horde lock-on near 75%, then war chest + Zap.
 * Uses player-facing answer counts (20 at Levels 1–2, 30 at Levels 3–6).
 * @param {HTMLElement | null} host
 * @param {any} state
 */
export function renderInvasionBriefing(host, state) {
  if (!host) return;
  const answers = answersProgress(state.gate, state.difficultyLevel);
  const attack = attackStatus(state.gate);
  const pct = answers.total ? answers.done / answers.total : 0;
  const detected = attack.open || pct >= 0.75;
  host.hidden = false;
  host.dataset.phase = attack.open ? 'open' : detected ? 'detected' : 'countdown';

  // Gate open → war chest + Zap. Until then the big number stays "answers until invasion".
  if (attack.open) {
    host.innerHTML = `
      <div class="invasion-briefing is-open" data-urgency="now">
        ${renderHordeFaceoff(state.horde, state.warChest)}
      </div>`;
    host.querySelector('.faceoff-zap')?.addEventListener('click', () => state.onZap?.());
    return;
  }

  const remaining = answers.remaining;
  const meterPct = Math.min(100, Math.round(pct * 100));
  const unit = remaining === 1 ? 'RIGHT ANSWER TO GO' : 'RIGHT ANSWERS TO GO';
  const sub = detected
    ? `<p class="invasion-sub">Horde detected · <strong>${state.horde.total}</strong> aliens inbound · ${remaining} more right answer${remaining === 1 ? '' : 's'} unlocks the siege</p>`
    : '';

  host.innerHTML = `
    <section class="invasion-briefing ${detected ? 'is-detected' : 'is-countdown'}${remaining <= 5 ? ' is-final' : ''}" data-urgency="${attack.urgency}" aria-label="Invasion in ${remaining} right answers">
      <div class="invasion-countdown">
        <span class="invasion-kicker">${detected ? 'HORDE LOCKED · INVASION IN' : 'INVASION IN'}</span>
        <strong class="invasion-count${remaining <= 5 ? ' is-pulse' : ''}">${remaining}</strong>
        <span class="invasion-unit">${unit}</span>
      </div>
      <div class="invasion-meter" role="progressbar" aria-valuemin="0" aria-valuemax="${answers.total}" aria-valuenow="${answers.done}" aria-label="Defence charge ${answers.done} of ${answers.total}">
        <div class="invasion-meter-fill" style="width:${meterPct}%"></div>
        <span class="invasion-meter-label">${answers.done}/${answers.total}</span>
      </div>
      ${sub}
    </section>`;
}

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
  // Show right-answer progress at the chosen level (20 at L1–2, 30 at L3–6), not raw charge units.
  const answers = answersProgress(state.gate, state.difficultyLevel);
  const charge = `${answers.done}/${answers.total}`;
  const threatMessage = (attack.stage >= 2 ? 'DANGER: ALIENS AT THE FENCE!'
    : attack.stage >= 1 ? 'WARNING: ALIENS CLOSING IN!'
    : attack.done > 0 ? 'ENEMY SIGNAL DETECTED'
    : 'DISTANT ALIEN SIGNAL') + ` · ${charge}`;
  // Stakes (countdown / horde / war chest + zap) live under the quiz in #mission-invasion.
  host.classList.add('is-theatre');
  host.innerHTML = `
    <div class="mission-control-inner">
      <div class="mission-control-heading">
        <span class="mission-control-eyebrow">MISSION CONTROL</span>
        <h2 class="mission-control-greeting">${first ? 'Welcome' : 'Welcome back'}, <span>${escapeHtml(state.playerName)}</span></h2>
        <button type="button" class="mission-xp" aria-label="${formatForgeXp(state.xp)} Forge XP. Spend it in the Armory.">
          <img class="mission-xp-emblem" src="assets/ui/xp-emblem.png?v=1" alt="" width="317" height="320" />
          <span class="mission-xp-copy">
            <span class="mission-xp-value" id="mission-control-xp">${formatForgeXp(lastHomeXp ?? state.xp)}</span>
            <span class="mission-xp-label">FORGE XP</span>
          </span>
        </button>
      </div>
      <div class="mission-control-radar" aria-label="Alien radar and progress towards the next defence">
        ${renderInboundRadar(attack, attack.open)}
      </div>
      <p class="mission-control-signal" data-urgency="${attack.urgency}">${threatMessage}</p>
      <div class="mission-control-blueprint">
        ${renderThreatDossier(attack.open, attack)}
      </div>
      <button type="button" class="mission-control-home" id="mission-back-to-hq"><img class="btn-house" src="assets/ui/granny-house.webp" alt="" width="192" height="182" />Maths HQ</button>
    </div>
  `;
  threatDossierCleanup = initThreatDossier(host.querySelector('.threat-dossier'), {
    contact: attack.open,
    urgency: attack.urgency,
    defeatedByType: state.enemyDefeated,
    rareDossiers: state.rares ? rareDossiers(state.rares) : [],
  });
  host.querySelector('#btn-hold-line')?.addEventListener('click', state.onHoldTheLine);
  host.querySelector('#mission-back-to-hq')?.addEventListener('click', state.onHome);
  host.querySelector('.mission-xp')?.addEventListener('click', () => state.onArmory?.());
  playMissionXp(host, state.xp);
}

/**
 * Siege readiness and lifetime player stats live beneath the Might animation.
 * Keeping this separate from Mission Control leaves the blueprint visible.
 * @param {HTMLElement|null} host
 * @param {any} state
 */
export function renderSiegeStats(host, state) {
  if (!host) return;
  const prior = host.querySelector('.mission-battle-stats');
  const html = `
    <div class="mission-battle-stats">
      ${renderCrystalVault(state.crystalsCollected ?? 0, state.crystalsToSpend ?? 0, state.crystalChips)}
    </div>
  `;
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const stats = template.content.firstElementChild;
  if (prior) prior.replaceWith(stats);
  else host.append(stats);
  stats.querySelector('.crystal-vault-spend')?.addEventListener('click', () => state.onArmory?.());
  lastVaultCount = state.crystalsToSpend ?? 0;
}

/**
 * Vault tiers track all-time crystals collected (including rare ×3/×5/×10).
 * With ~44 rare cores per topic map piece, silver lands around 75% of a full
 * three-season maths career (~1000), not during the first topic.
 */
const VAULT_TIERS = [
  { at: 1700, id: 'legend', name: 'LEGENDARY VAULT', art: 'vault-legend' },
  { at: 1350, id: 'gold', name: 'GOLD VAULT', art: 'vault-gold' },
  { at: 1000, id: 'silver', name: 'SILVER VAULT', art: 'vault-silver' },
  { at: 100, id: 'bronze', name: 'BRONZE VAULT', art: 'vault-bronze' },
  { at: 0, id: 'starter', name: 'CRYSTAL VAULT', art: 'vault-green' },
];

/** @param {number} collected */
export function vaultTierFor(collected) {
  return VAULT_TIERS.find((t) => collected >= t.at) ?? VAULT_TIERS[VAULT_TIERS.length - 1];
}

/**
 * A big moment when a topic's map sector is charted; the tenth one opens the route to the Alien Homeland.
 * @param {string} moduleId @param {number} earned Sectors charted so far, including this one.
 */
/**
 * @param {string} moduleId
 * @param {number} earned
 * @param {{ season?: number, seasonJustCompleted?: boolean, maxLevel?: number }} [meta]
 */
export function showMapPieceFound(moduleId, earned, meta = {}) {
  const sector = MAP_SECTORS.find((s) => s.moduleId === moduleId);
  const total = TRAINING_MODULE_IDS.length;
  const season = meta.season ?? 1;
  const seasonDone = !!meta.seasonJustCompleted;
  const maxLevel = meta.maxLevel ?? 0;
  document.querySelector('.map-up')?.remove();
  const el = document.createElement('div');
  el.className = 'rank-up vault-up map-up';
  el.setAttribute('role', 'status');
  let title = 'MAP PIECE FOUND!';
  let name = `${(sector?.label ?? 'SECTOR').toUpperCase()} · S${season} ${earned} / ${total}`;
  if (seasonDone && maxLevel >= 1) {
    title = maxLevel >= 3 ? 'SEASON 3 COMPLETE!' : maxLevel === 2 ? 'SEASON 2 COMPLETE!' : 'ROUTE UNLOCKED!';
    name = maxLevel >= 3
      ? 'DOOMPICKLE LEVEL 3 OPEN!'
      : maxLevel === 2
        ? 'DOOMPICKLE LEVEL 2 OPEN — BACK TO HQ FOR SEASON 3!'
        : 'WARP TO DOOMPICKLE — CLEAR LEVEL 1, THEN RETURN!';
  }
  el.innerHTML = `
    <span class="core-reward-rays" aria-hidden="true"></span>
    <span class="map-up-art" aria-hidden="true">${seasonDone ? '🛸' : '🗺️'}</span>
    <strong class="rank-up-title">${title}</strong>
    <span class="rank-up-name">${name}</span>`;
  document.body.append(el);
  window.setTimeout(() => el.classList.add('is-leaving'), 3200);
  window.setTimeout(() => el.remove(), 3800);
}

/** A short celebration when the Crystal Vault upgrades to a new tier. @param {number} collected */
export function showVaultUpgrade(collected) {
  const tier = vaultTierFor(collected);
  document.querySelector('.vault-up')?.remove();
  const el = document.createElement('div');
  el.className = 'rank-up vault-up';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="core-reward-rays" aria-hidden="true"></span>
    <img class="vault-up-art" src="assets/ui/vaults/${tier.art}.png?v=2" alt="" />
    <strong class="rank-up-title">VAULT UPGRADED!</strong>
    <span class="rank-up-name">${tier.name}</span>`;
  document.body.append(el);
  window.setTimeout(() => el.classList.add('is-leaving'), 3000);
  window.setTimeout(() => el.remove(), 3600);
}

/** Chance that the green Special Mission button (double Forge XP) shows instead of a gold one. */
export const SPECIAL_MISSION_CHANCE = 0.1;
export const SPECIAL_MISSION_XP_MULTIPLIER = 2;

/** Which Random Mission button is showing: a gold one (1–4) or the green special one. @type {number|'special'} */
let missionArt = 1 + Math.floor(Math.random() * 4);

/** A different alien each time the player comes back to Maths HQ; now and then, the green special. */
export function rerollMissionArt(random = Math.random) {
  radarContacts = pickRadarContacts(random);
  if (random() < SPECIAL_MISSION_CHANCE) {
    missionArt = 'special';
    return;
  }
  const others = [1, 2, 3, 4].filter((n) => n !== missionArt);
  missionArt = others[Math.floor(random() * others.length)];
}

export function isSpecialMission() {
  return missionArt === 'special';
}

/** @param {import('./difficulty.js?v=20261114k1').DifficultyLevel} level @param {boolean} special */
function levelRewardLabel(level, special) {
  if (!special) return xpMultiplierLabel(level);
  const bonus = Math.round((xpMultiplierFor(level) - 1) * 100);
  return bonus ? `${SPECIAL_MISSION_XP_MULTIPLIER}× XP +${bonus}%` : `${SPECIAL_MISSION_XP_MULTIPLIER}× XP`;
}

/** Short reward text that fits under each of the six level numbers. */
function levelRewardShort(level, special) {
  if (special) return `${SPECIAL_MISSION_XP_MULTIPLIER}×`;
  return `+${Math.round((xpMultiplierFor(level) - 1) * 100)}%`;
}

/** Crystals shown so far, so a newly collected one can drop into the pile. @type {number|null} */
let lastVaultCount = null;
/** All-time count last shown on the vault's front display, so it flickers when it goes up. @type {number|null} */
let lastOdometer = null;

/**
 * The red LED counter on the front of the vault: every crystal ever collected. Unlit "8888"
 * segments sit behind the digits, like a real seven-segment display.
 * @param {number} collected
 */
function renderVaultOdometer(collected) {
  const value = String(Math.min(9999, Math.max(0, collected))).padStart(4, '0');
  const ticked = lastOdometer != null && collected > lastOdometer;
  lastOdometer = collected;
  return `
    <div class="vault-odo${ticked ? ' is-tick' : ''}" title="All-time crystals collected">
      <svg viewBox="0 0 100 32" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <text class="vault-odo-ghost" x="50" y="26" text-anchor="middle">8888</text>
        <text class="vault-odo-digits" x="50" y="26" text-anchor="middle">${value}</text>
      </svg>
    </div>`;
}

/**
 * The Crystal Vault holds the crystals a player can spend: spend some in the Armory and they
 * leave the glass. The vault itself upgrades (Bronze, Silver…) from every crystal ever collected,
 * so spending never downgrades it.
 * @param {number} collected All-time crystals, for the vault tier. @param {number} toSpend Crystals in the vault now.
 */
let vaultShimmerTimer = 0;

/** Light catches the vault glass now and then, each sweep a little different. */
function scheduleVaultShimmer() {
  if (vaultShimmerTimer || typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const next = () => {
    vaultShimmerTimer = window.setTimeout(() => {
      const el = /** @type {HTMLElement|null} */ (document.querySelector('.crystal-vault-shimmer'));
      if (el && !document.hidden && el.getClientRects().length) {
        el.style.setProperty('--shimmer-dur', `${(0.8 + Math.random() * 0.9).toFixed(2)}s`);
        el.style.setProperty('--shimmer-angle', `${Math.round(95 + Math.random() * 35)}deg`);
        el.style.setProperty('--shimmer-glow', (0.45 + Math.random() * 0.45).toFixed(2));
        el.classList.toggle('is-reverse', Math.random() < 0.3);
        el.classList.remove('is-sweeping');
        void el.offsetWidth;
        el.classList.add('is-sweeping');
      }
      next();
    }, 2500 + Math.random() * 6000);
  };
  next();
}

/**
 * @param {number} collected
 * @param {number} toSpend
 * @param {{ value: number, tierId: string }[]} [chips]
 */
function renderCrystalVault(collected, toSpend, chips = []) {
  scheduleVaultShimmer();
  const tier = vaultTierFor(collected);
  const next = [...VAULT_TIERS].reverse().find((t) => t.at > collected);
  // The glass holds up to 20 chips; prefer showing rares, then fill with basics.
  const room = 20;
  const list = Array.isArray(chips) ? chips.slice() : [];
  const rares = list.filter((c) => (c.value ?? 1) > 1);
  const basics = list.filter((c) => (c.value ?? 1) <= 1);
  const display = rares.concat(basics).slice(0, room);
  while (display.length < Math.min(room, Math.max(0, toSpend)) && display.length < room) {
    display.push({ value: 1, tierId: 'basic' });
  }
  const cols = 5;
  const rows = Math.ceil(room / cols);
  const cell = 100 / cols;
  const fresh = lastVaultCount != null && toSpend > lastVaultCount;
  const crystals = display.map((chip, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const left = col * cell + (row % 2 ? cell * 0.25 : 0) - cell * 0.1;
    const bottom = (row * 100) / rows;
    const turn = ((i * 53) % 50) - 25;
    const isNew = fresh && i === display.length - 1;
    const tierId = chip.tierId && chip.tierId !== 'basic' ? chip.tierId : '';
    const value = Math.max(1, Math.floor(Number(chip.value) || 1));
    const rareClass = tierId ? ` crystal-vault-crystal--${tierId}` : '';
    const valueMark = value > 1 ? `<span class="crystal-vault-chip-value">×${value}</span>` : '';
    return `<span class="crystal-vault-crystal${rareClass}${isNew ? ' is-new' : ''}" style="left:${left.toFixed(1)}%;bottom:${bottom.toFixed(1)}%;width:${(cell * 1.15).toFixed(1)}%;--turn:${turn}deg">${valueMark}</span>`;
  }).join('');
  return `
    <section class="crystal-vault crystal-vault--${tier.id}" aria-label="Crystal vault: ${toSpend} alien crystals to spend">
      <div class="crystal-vault-jar">
        <div class="crystal-vault-pile" aria-hidden="true">${crystals}</div>
        <div class="crystal-vault-glass" aria-hidden="true"></div>
        <div class="crystal-vault-shimmer" aria-hidden="true"></div>
        ${renderVaultOdometer(collected)}
      </div>
      <div class="crystal-vault-copy">
        <div class="crystal-vault-info">
          <span class="crystal-vault-tier">${tier.name}</span>
          ${next ? `<span class="crystal-vault-next"><img class="crystal-vault-next-art" src="assets/ui/vaults/${next.art}.png?v=2" alt="" />Collect ${next.at - collected} more for ${next.name}</span>` : '<span class="crystal-vault-next">Every vault unlocked!</span>'}
        </div>
        ${toSpend > 0 ? '<button type="button" class="crystal-vault-spend"><span class="core-gem" aria-hidden="true"></span>SPEND IN THE ARMORY →</button>' : ''}
      </div>
    </section>`;
}

/**
 * Long-term HQ goal: one bar slot per topic card (same order). Bubbles 1–10 sit at
 * the start of each slot; each good set fills toward the next. The planet sits after
 * 10 and lights when the season is charted.
 * @param {import('./map-progress.js').MapProgressSave} mapProgress
 */
function renderHomelandTrack(mapProgress) {
  const order = TOPIC_DISPLAY_ORDER;
  const total = order.length;
  const season = currentMapSeason(mapProgress);
  const bar = seasonLabel(season);
  const earned = seasonPiecesEarned(mapProgress, season);
  const maxLevel = homelandMaxLevel(mapProgress);
  const seasonDone = seasonComplete(mapProgress, season) || (season === 3 && maxLevel >= 3);
  // Eye-candy UFO creeps with overall season progress (every good set nudges it).
  const passSum = order.reduce((sum, id) => sum + getMapPasses(mapProgress, id, season), 0);
  const shipPct = seasonDone ? 100 : (passSum / (total * MAP_PASSES_REQUIRED)) * 100;
  const slots = order.map((id, i) => {
    const n = i + 1;
    const passes = getMapPasses(mapProgress, id, season);
    const done = passes >= MAP_PASSES_REQUIRED;
    const inProgress = passes > 0 && !done;
    const title = getTopic(id)?.title || id;
    const tipBody = done
      ? `Sector charted · Season ${season}`
      : `${passes} / ${MAP_PASSES_REQUIRED} good sets · need ${bar}+`;
    const pips = Array.from({ length: MAP_PASSES_REQUIRED }, (_, k) =>
      `<i class="homeland-track-pip${k < passes ? ' is-on' : ''}"></i>`).join('');
    return `
      <button type="button" class="homeland-track-slot${done ? ' is-done' : ''}${inProgress ? ' is-progress' : ''}"
        data-homeland-slot="${id}"
        data-tip-title="${title}"
        data-tip="${tipBody}"
        aria-label="${title}: ${tipBody}">
        <span class="homeland-track-pips" aria-hidden="true">${pips}</span>
        <span class="homeland-track-node${done ? ' is-reached' : ''}${inProgress ? ' is-progress' : ''}" aria-hidden="true">${n}</span>
      </button>`;
  }).join('');
  const levelHint = maxLevel ? ` · L${maxLevel} open` : '';
  return `
    <div class="homeland-row">
    <div class="homeland-track" role="group" aria-label="Alien Homeland season ${season}: ${earned} of ${total} sectors at ${bar}">
      <button type="button" class="homeland-track-title" data-homeland-map
        aria-label="Show Alien Homeland map. Season ${season}: ${earned} of ${total} sectors.">
        <strong>ALIEN HOMELAND</strong>
        <small>Season ${season} · ${bar} · ${earned}/${total}${levelHint}</small>
      </button>
      <div class="homeland-track-rail">
        <div class="homeland-track-slots">${slots}</div>
        <span class="homeland-track-home${seasonDone ? ' is-reached' : ''}" aria-hidden="true">🪐</span>
        <span class="homeland-track-ship" style="left:${Math.max(2, Math.min(98, shipPct)).toFixed(1)}%" aria-hidden="true"><span>🛸</span></span>
      </div>
    </div>
    ${canWarpToDoompickle(mapProgress) ? renderHomelandLaunch() : ''}
    </div>`;
}

/** Tap or hover a bar slot to name the topic (touch-first; hover is a desktop bonus). @param {ParentNode} host */
function bindHomelandTrackSlots(host) {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  host.querySelectorAll('[data-homeland-slot]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      showTipPill(btn);
    });
    btn.addEventListener('pointerenter', () => {
      if (fine.matches) showTipPill(btn);
    });
  });
}

const WARP_ARROW_KEY = 'grannyboom.warp-arrow-seen';

/** Same red pointer as the Landing Zone guide on the planet map. */
const WARP_ARROW = `<svg class="homeland-launch-arrow" viewBox="0 0 80 96" aria-hidden="true">
  <path d="M40 88 L12 48 H28 V8 H52 V48 H68 Z"
    fill="#e82010" stroke="#fff" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
</svg>`;

function hasSeenWarpArrow() {
  try {
    return localStorage.getItem(WARP_ARROW_KEY) === '1';
  } catch {
    return false;
  }
}

function markWarpArrowSeen() {
  try {
    localStorage.setItem(WARP_ARROW_KEY, '1');
  } catch {}
}

/** Once every map piece is in, Granny can warp to Doompickle as often as she likes. */
function renderHomelandLaunch() {
  const arrow = hasSeenWarpArrow() ? '' : WARP_ARROW;
  return `<span class="homeland-launch-wrap${arrow ? ' has-arrow' : ''}">
    ${arrow}
    <button type="button" class="homeland-launch">WARP TO DOOMPICKLE</button>
  </span>`;
}

/** Same beep as ordinary UI buttons — respects the HQ sound toggle. */
function playDepartBeep() {
  try {
    const save = JSON.parse(localStorage.getItem('grannyboom.siege.v1') || '{}');
    if (save?.settings?.sound === false) return;
  } catch {}
  const beep = new Audio('assets/sounds/button-press.m4a');
  beep.volume = 0.45;
  beep.play().catch(() => {});
}

/**
 * Fly sequence: black + Granny mad → 5..1 LAUNCH → homeland canvas warp (green mothership
 * into vanishing point + smoke trail) → land on fullscreen map. Never opens the title card.
 */
function flyToDoompickle() {
  if (document.getElementById('homeland-depart')) return;
  markWarpArrowSeen();
  document.querySelector('.homeland-launch-arrow')?.remove();
  document.querySelector('.homeland-launch-wrap')?.classList.remove('has-arrow');
  document.querySelector('.gb-sheet-backdrop')?.remove();
  const layer = document.createElement('div');
  layer.id = 'homeland-depart';
  layer.className = 'homeland-depart';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-label', 'Departing for Doompickle');
  layer.innerHTML = `
    <div class="homeland-depart-mad">
      <img src="assets/homeland/granny-mad.webp?v=20261115f3" alt="Granny is madder than a pocketful of rabid chickens. She has hijacked a mothership and is about to pounce into warp speed. Hold on to your hats!" width="1200" height="901" />
      <p class="homeland-depart-count" aria-live="assertive">5</p>
    </div>`;
  document.body.append(layer);
  const countEl = /** @type {HTMLElement | null} */ (layer.querySelector('.homeland-depart-count'));
  const steps = ['5', '4', '3', '2', '1', 'LAUNCH'];
  let step = 0;
  const showStep = (i) => {
    if (!countEl) return;
    countEl.textContent = steps[i];
    countEl.classList.toggle('is-launch', steps[i] === 'LAUNCH');
    countEl.classList.remove('is-pop');
    void countEl.offsetWidth;
    countEl.classList.add('is-pop');
    playDepartBeep();
  };
  const tick = () => {
    step += 1;
    if (step < steps.length) {
      showStep(step);
      window.setTimeout(tick, 1000);
      return;
    }
    // Stay on this page (keeps fullscreen): warp + map load in a full-bleed iframe.
    const testing = new URLSearchParams(location.search).get('maps') === 'all';
    const qs = testing ? 'arrive&fresh' : 'arrive';
    layer.classList.add('is-frame');
    layer.innerHTML = '';
    const frame = document.createElement('iframe');
    frame.className = 'homeland-depart-frame';
    frame.title = 'Alien Homeland';
    frame.allow = 'autoplay; fullscreen';
    frame.src = `${HOMELAND_URL}?${qs}`;
    layer.append(frame);
  };
  showStep(0);
  window.setTimeout(tick, 1000);
}

/** @param {ParentNode} root */
function bindHomelandLaunch(root) {
  root.querySelectorAll('.homeland-launch').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      flyToDoompickle();
    });
  });
}

/**
 * The Alien Homeland map as a pop-up: every topic charted reveals a sector, and all ten open the
 * route to the Alien Homeland.
 * @param {any} mapProgress
 */
function showHomelandMap(mapProgress) {
  document.querySelector('.gb-sheet-backdrop')?.remove();
  const season = currentMapSeason(mapProgress);
  const maxLevel = homelandMaxLevel(mapProgress);
  const backdrop = document.createElement('div');
  backdrop.className = 'gb-sheet-backdrop';
  backdrop.innerHTML = `
    <div class="gb-sheet homeland-sheet" role="dialog" aria-modal="true" aria-label="Map to the Alien Homeland">
      <h2 class="gb-sheet-title">🛸 THE ALIEN HOMELAND</h2>
      <p class="gb-sheet-sub">${maxLevel >= 3
        ? 'All three HQ seasons charted — Doompickle Level 3 is open.'
        : maxLevel >= 1
          ? `Warp open for Level ${maxLevel}. Back at HQ, Season ${maxLevel + 1} needs ${seasonLabel(/** @type {1|2|3} */ (maxLevel + 1))}+ passes to unlock the next Doompickle level.`
          : `Season ${season}: chart all ${TRAINING_MODULE_IDS.length} sectors at ${seasonLabel(season)}+ to open Warp for Doompickle Level 1.`}</p>
      ${renderInterstellarMap(mapProgress)}
      ${canWarpToDoompickle(mapProgress) ? renderHomelandLaunch() : ''}
      <button type="button" class="gb-sheet-x" aria-label="Close">×</button>
    </div>`;
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('.gb-sheet-x')?.addEventListener('click', close);
  bindHomelandLaunch(backdrop);
  document.body.append(backdrop);
}

/**
 * The maths area is deliberately separate from Mission Control.
 * Clicking a topic swaps only this workspace for the live activity.
 * @param {HTMLElement} host
 * @param {any} state
 */
export function renderHome(host, state) {
  const attack = attackStatus(state.gate);
  const special = missionArt === 'special' && !attack.open;
  host.innerHTML = `
    <div class="mission-home">
      <header class="mission-workspace-heading">
        <span class="mission-kicker">MATHS HQ</span>
        <h1>Maths missions</h1>
      </header>
      <section class="mission-mixed-card" aria-label="Mixed maths mission">
        <div class="mission-mixed-symbol" aria-hidden="true">⚡</div>
        <div class="mission-mixed-copy">
          <span class="mission-recommended">QUICK START</span>
          <h2>Mixed Maths Mission</h2>
        </div>
        <button type="button" id="mission-start-mixed" class="mission-start-art${special ? ' is-special' : ''}" aria-label="${special ? `Special mission: ${SPECIAL_MISSION_XP_MULTIPLIER}× Forge XP` : 'Random mission'}: ${answersForCharge(attack.remaining, state.difficultyLevel)} more right answers needed, from every topic"><img src="assets/ui/random-mission-${missionArt}.png?v=2" alt="" width="760" height="203" />${special ? `<span class="mission-special-badge" aria-hidden="true"><span class="mission-special-rays"></span><span class="mission-special-disc"><b>${SPECIAL_MISSION_XP_MULTIPLIER}×</b><small>XP</small></span></span>` : ''}</button>
        <div class="mission-level-control">
          <div class="mission-level-intro">
            <span class="mission-level-title">LEVEL</span>
          </div>
          <div class="mission-level-buttons${special ? ' is-boosted' : ''}" role="group" aria-label="Choose maths difficulty and XP reward">
            ${DIFFICULTY.levels.map((n) => `
              <button type="button" class="mission-level-option${state.difficultyLevel === n ? ' is-selected' : ''}"
                data-level="${n}" aria-pressed="${state.difficultyLevel === n}"
                aria-label="Level ${n}, ${levelRewardLabel(n, special)}">
                <span class="mission-level-number">${n}</span>
                <span class="mission-level-reward">${levelRewardShort(n, special)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </section>
      ${renderArmoryPromo(state.xp, state.unlockedTurrets, state.crystalsToSpend ?? 0)}
      <section class="mission-topic-section" aria-label="Maths topics">
        <div class="mission-topic-grid mission-all-topics" aria-label="All ten maths topics">
          ${renderTrainingCards(state.gate, attack, state.levelMastery, state.mapProgress, TOPIC_DISPLAY_ORDER, state.topicProgress)}
        </div>
      </section>
      ${renderHomelandTrack(state.mapProgress)}
    </div>
  `;

  host.querySelector('#mission-start-mixed')?.addEventListener('click', () => {
    if (typeof state.onRandomMission === 'function') state.onRandomMission();
    else state.onHoldTheLine?.();
  });
  host.querySelector('#mission-armory-open')?.addEventListener('click', state.onArmory);
  host.querySelector('[data-homeland-map]')?.addEventListener('click', () => showHomelandMap(state.mapProgress));
  bindHomelandTrackSlots(host);
  bindHomelandLaunch(host);
  host.querySelectorAll('[data-topic]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-topic');
      if (id && !btn.hasAttribute('disabled')) state.onTopic(id);
    });
  });

  host.querySelectorAll('[data-level]').forEach((button) => {
    button.addEventListener('click', () => {
      const level = Number(button.getAttribute('data-level'));
      if (!isDifficultyLevel(level) || level === state.difficultyLevel) return;
      state.onDifficultyChange(level);
    });
  });
}

/**
 * @param {HTMLElement|null} container
 * @param {import('./siege-ranks.js').SiegeRecord} record
 * @param {{ title?: string, onOpen?: (level: number) => void }} [opts]
 */
export function renderTopbarBadges(container, record, opts = {}) {
  if (!container) return;
  const level = siegeRankLevel(record);
  const rankedUp = lastBadgeLevel != null && level > lastBadgeLevel;
  lastBadgeLevel = level;
  const shown = Math.max(1, level);
  const name = level ? SIEGE_RANKS[level - 1].name : 'Recruit';
  const next = SIEGE_RANKS[level] ?? null;
  const progress = next ? rankProgressText(record, level) : '';
  container.classList.remove('badge-row-compact');
  container.innerHTML = `
    <button type="button" class="rank-badge${level ? '' : ' is-locked'}${rankedUp ? ' is-rank-up' : ''}" aria-haspopup="dialog"
      data-tip-title="Siege Rank"
      data-tip="${level ? name : 'Play sieges to earn ranks'}"
      aria-label="${level ? `Your rank: ${name}` : 'No rank yet'}${next ? `. Next: ${next.name}, ${next.hint}, ${progress} done` : '. Top rank reached'}. Show all ranks.">
      <span class="rank-badge-art"><img src="${badgeSrc(shown)}" alt="" width="57" height="57" />${level ? '' : '<span class="rank-badge-lock" aria-hidden="true">🔒</span>'}</span>
      <span class="rank-badge-copy">
        <strong class="rank-badge-name">${level ? name.toUpperCase() : 'NO RANK YET'}</strong>
        ${opts.title ? `<span class="rank-badge-title">“${escapeHtml(opts.title)}”</span>` : ''}
      </span>
    </button>`;
  container.querySelector('.rank-badge')?.addEventListener('click', () => (opts.onOpen ? opts.onOpen(level) : showRankLadder(level, record)));
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

/** All five ranks, earned ones lit, with what each needs. @param {number} level @param {import('./siege-ranks.js').SiegeRecord} record */
function showRankLadder(level, record) {
  document.querySelector('.rank-ladder')?.remove();
  const el = document.createElement('div');
  el.className = 'rank-ladder';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Siege ranks');
  el.innerHTML = `
    <div class="rank-ladder-panel">
      <h2 class="rank-ladder-title">SIEGE RANKS</h2>
      <ol class="rank-ladder-list">
        ${SIEGE_RANKS.map((rank, i) => `
          <li class="rank-ladder-item${i < level ? ' is-earned' : ''}${i === level ? ' is-next' : ''}">
            <img src="${badgeSrc(i + 1)}" alt="" width="64" height="64" />
            <strong>${rank.name}</strong>
            <span>${rank.hint}</span>
            <em>${i < level ? 'EARNED' : i === level ? rankProgressText(record, i) : 'LOCKED'}</em>
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
