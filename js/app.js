import { getMissionForDifficulty, SLICE_MISSION_ID } from './missions-data.js?v=20261113h1';
import { balanceMission, startingSiegeCoins, nextBattleCry } from './battle-balance.js?v=20261112g';
import { initForge } from './forge.js';
import { renderShopBar, updateShopBar } from './shop.js?v=20261113n1';
import { renderArmory } from './armory.js?v=20261113a6';
import { normalizeTurretLevels, normalizeCores, setTurretLevels, nextUpgrade, anyUpgradeReady, turretLevel } from './turret-upgrades.js?v=20261112a2';
import { createTDEngine } from './td-engine.js?v=20261114h1';
import { TURRETS, TURRET_ORDER, STARTER_TURRETS } from './turrets-data.js';
import { createAudio } from './audio.js?v=20261113m5';
import { createMusic, STREAK_MUSIC_FROM } from './music.js?v=20261113a3';
import { topicXpMultiplier } from './hot-topic.js?v=20261112a1';
import { normalizeSiegeRecord, recordSiege, siegeRankLevel, renderRankResult } from './siege-ranks.js?v=20261112a2';
import { normalizeStreak, recordStreakAnswer, streakStatus, localDayKey } from './streak.js?v=20261113a1';
import { GEAR, normalizeGear, gearStatus, gearEffects } from './gear.js?v=20261113a3';
import { SIEGE_DURATION_SEC, openingHorde } from './waves-data.js?v=20261113h1';
import { normalizeDaily, recordChallengeEvent, rollLuckyDrop, DAILY_CHEST_XP } from './daily-challenges.js?v=20261113a1';
import { normalizeRecords, checkTrophies, trophyTitle } from './trophies.js?v=20261113a2';
import { makeChallengeCode, readChallengeCode } from './challenge-code.js?v=20261113a1';
import { STORY_BEATS } from './story.js?v=20261113a1';
import { renderStreakPill, renderDailyPill, showStreakPanel, showDailyPanel, showPop, showTrophyPop, showStory, showProfile, renderResultsExtras, ICONS } from './engagement-ui.js?v=20261113h1';
import { DEV } from './dev.js?v=20261113n1';
import { HEDGE } from './maze-field.js?v=20261113m7';
import { showCoachTips, isCoachOpen, TOUR_TIPS } from './coach-tips.js?v=20261114h1';
import { normalizeMetaSave, shouldSpawnGranddaddy, onGranddaddySpawned } from './meta.js?v=20261112a1';
import { GRANNY_CACHE, cacheFillPercent } from './granny-cache.js';
import { ECONOMY, bankBonusForgeXp } from './economy.js';
import { computeStars, badgeSrc } from './stars.js';
import { computeBragHeadline, computeNextGoal, renderNextGoal } from './progression.js?v=20261112a1';
import { preloadField, preloadDeployAssets, getFieldImage } from './preload.js?v=20261113n1';
import { animateResultsStats, animateProgressFill, animateTallyPair } from './tally.js';
import { renderHome, renderMissionControl, renderSiegeStats, stopMissionDossier, renderTopbarBadges, vaultTierFor, showVaultUpgrade, rerollMissionArt, countShieldsEarned, isSpecialMission, SPECIAL_MISSION_XP_MULTIPLIER, showMapPieceFound } from './home.js?v=20261114f1';
import { normalizeEnemyDefeats, recordEnemyDefeat, enemyDefeatCount } from './enemy-tally.js?v=20261112n';
import { renderPowerCore, pickForgeSquad, pickForgeTitle } from './power-core.js?v=20261113a2';
import { initHowToPlay } from './how-to-play.js?v=20261114h1';
import { showToast, initPopups, openModal, closeModal } from './popups.js';
import { initTimesTables } from './times-tables.js?v=20261113h1';
import { initMeasurementLength } from './measurement-length.js?v=20261113h1';
import { initFractions } from './fractions.js?v=20261113h1';
import { initAnglesShapes } from './angles-shapes.js?v=20261113h1';
import { initMathsQuest, MATHS_QUEST } from './maths-quest.js?v=20261113h1';
import { initExpandedMath } from './expanded-maths.js?v=20261113h1';
import { initBattlePrep } from './battle-prep.js?v=20261113a4';
import { normalizeDifficultyLevel, scaleTrainingXp, xpMultiplierLabel } from './difficulty.js';
import {
  normalizeLevelMastery,
  defaultLevelMastery,
  recordTrainingProgress,
  recommendModuleLevel,
  recommendGlobalLevel,
} from './level-mastery.js';
import { defaultMapProgress, normalizeMapProgress, allMapPiecesEarned, mapPiecesEarned } from './map-progress.js';
import { getTopic } from './topics-data.js?v=20261113h1';
import { normalizeTopicProgress, recordTopicAnswer, recordTopicSession, getTopicRecord, topicRankProgress } from './topic-progression.js?v=20261112p';
import {
  defaultTrainingGate,
  normalizeTrainingGate,
  isGateOpen,
  gateProgress,
  recordTrainingQuestions,
  bonusSiegeSeconds,
  GATE,
  recordTimesTable,
  recordTopicUnit,
  resetTrainingGate,
  isUnitDone,
  isTopicDone,
} from './training-gate.js?v=20261112h';
import { setGateRemainingProvider } from './gate-status.js?v=20261112a1';

const SAVE_KEY = 'grannyboom.siege.v1';

/** @typedef {{ version: number, playerName: string, xp: number, enemyDefeated: Record<string,number>, unlockedTurrets: string[], unlockedMissions: string[], completedMissions: string[], bestKills: Record<string, number>, bestBankedCoins: Record<string, number>, bestStars: Record<string, number>, siegesCompleted: number, granddaddySiegeTarget: number|null, granddaddySeen: boolean, grannyUnlocked: boolean, trainingGate: import('./training-gate.js').TrainingGate, topicProgress: import('./topic-progression.js').TopicProgressSave, levelMastery: import('./level-mastery.js').LevelMasterySave, mapProgress: import('./map-progress.js').MapProgressSave, turretLevels: Record<string, number>, upgradeCores: number, crystalsCollected: number, siegeRecord: import('./siege-ranks.js').SiegeRecord, streak: import('./streak.js').StreakSave, daily: import('./daily-challenges.js').DailySave|null, records: import('./trophies.js').RecordsSave, trophies: Record<string, string>, title: string|null, storySeen: number, activeChallenge: { score: number, from: string }|null, lastChallengeCode: string|null, gear: import('./gear.js').GearId[], stretchCoins: number, settings: { sound: boolean, music: boolean, difficultyLevel: import('./difficulty.js').DifficultyLevel } }} SaveData */

/** @type {SaveData} */
const defaultSave = {
  version: 1,
  playerName: '',
  xp: 0,
  enemyDefeated: {},
  unlockedTurrets: [...STARTER_TURRETS],
  unlockedMissions: [SLICE_MISSION_ID],
  completedMissions: [],
  bestKills: {},
  bestBankedCoins: {},
  bestStars: {},
  siegesCompleted: 0,
  granddaddySiegeTarget: null,
  granddaddySeen: false,
  grannyUnlocked: true,
  trainingGate: defaultTrainingGate(),
  levelMastery: defaultLevelMastery(),
  topicProgress: {},
  mapProgress: defaultMapProgress(),
  turretLevels: {},
  upgradeCores: 0,
  crystalsCollected: 0,
  tips: { off: false, seen: [] },
  siegeRecord: normalizeSiegeRecord(null),
  streak: normalizeStreak(null),
  daily: null,
  records: normalizeRecords(null),
  trophies: {},
  title: null,
  storySeen: 0,
  activeChallenge: null,
  lastChallengeCode: null,
  gear: [],
  stretchCoins: 0,
  settings: { sound: true, music: true, difficultyLevel: 1 },
};

/** @type {SaveData} */
let save = loadSave();
setGateRemainingProvider(() => GATE.questionsRequired - gateProgress(save.trainingGate).done);
setTurretLevels(save.turretLevels);

/** @type {{ waveBudget: number, runForgeXpEarned: number, startCoins: number, selectedTurret: string|null, cacheProgress: number }} */
let run = {
  waveBudget: 0,
  runForgeXpEarned: 0,
  startCoins: 0,
  selectedTurret: null,
  cacheProgress: 0,
};

let battlePrepCoinBonus = 0;
let deploymentTurretsPlaced = 0;
let previousBattleCry = '';
let bonusChoiceFocus = null;
let bonusBankProtected = 0;

/** Tracks nuke-cache edge so the ready siren only fires once per fill. */
let nukeCacheWasReady = false;

/** @type {ReturnType<typeof createTDEngine>|null} */
let tdEngine = null;

/** @type {ReturnType<typeof createAudio>} */
const audio = createAudio({ getEnabled: () => save.settings.sound });

document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const card = /** @type {HTMLElement|null} */ (e.target instanceof Element ? e.target.closest('.gb-topic-campaign-card') : null);
  if (!card || card.matches(':disabled, .gb-story-locked')) return;
  if (e.relatedTarget instanceof Node && card.contains(e.relatedTarget)) return;
  audio.playCardHover();
});
const music = createMusic({ getEnabled: () => save.settings.sound && save.settings.music });
/** Right answers in a row; five or more brings in the hot-streak music. */
let answerStreak = 0;

/** @type {HTMLElement|null} */
let shopBarEl = null;

/** @type {Parameters<typeof renderShopBar>[1]} */
let shopState = {
  budget: 0,
  persistentXp: 0,
  unlocked: new Set(),
  selectedId: null,
  onSelect: () => {},
  onUnlock: () => false,
  showToast: () => {},
};

const screens = {
  welcome: document.getElementById('screen-welcome'),
  home: document.getElementById('screen-home'),
  timesTables: document.getElementById('screen-times-tables'),
  measurement: document.getElementById('screen-measurement'),
  fractions: document.getElementById('screen-fractions'),
  angles: document.getElementById('screen-angles'),
  mathsQuest: document.getElementById('screen-maths-quest'),
  expanded: document.getElementById('screen-expanded'),
  battlePrep: document.getElementById('screen-battle-prep'),
  forge: document.getElementById('screen-forge'),
  armory: document.getElementById('screen-armory'),
  siege: document.getElementById('screen-siege'),
  results: document.getElementById('screen-results'),
};

const missionShell = document.getElementById('mission-shell');

/* Keep all sticky panels in the correct position on desktop and mobile.
   The topbar's height changes when achievement badges wrap. */
const topbarForOffset = document.querySelector('.topbar');
function syncStickyHeaderOffset() {
  if (!topbarForOffset) return;
  const height = Math.ceil(topbarForOffset.getBoundingClientRect().height);
  if (height > 0) {
    document.documentElement.style.setProperty('--gb-sticky-header-height', `${height}px`);
  }
}
syncStickyHeaderOffset();
if (topbarForOffset && typeof ResizeObserver !== 'undefined') {
  const headerObserver = new ResizeObserver(syncStickyHeaderOffset);
  headerObserver.observe(topbarForOffset);
} else {
  window.addEventListener('resize', syncStickyHeaderOffset);
}
let lastTrainingAnswerCorrect = null;
/** The turrets shown in the forge; reshuffled each time the player returns to Maths HQ. @type {{ main: string, left: string, right: string }|null} */
let forgeSquad = null;
/** The forge's title for this visit to Maths HQ. */
let forgeTitle = '';
const LEARNING_SCREENS = new Set([
  'home', 'timesTables', 'measurement', 'fractions', 'angles',
  'mathsQuest', 'expanded', 'battlePrep', 'forge',
]);


/** @type {keyof typeof screens} */
let armoryReturnScreen = 'home';
/** @type {string|null} Recently earned unlock, pending a nonblocking notification. */
let pendingArmoryUnlock = null;

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...defaultSave, unlockedTurrets: [...STARTER_TURRETS] };
    const data = { ...defaultSave, ...JSON.parse(raw) };
    if (!data.unlockedTurrets?.length) {
      data.unlockedTurrets = [...STARTER_TURRETS];
    } else {
      for (const id of STARTER_TURRETS) {
        if (!data.unlockedTurrets.includes(id)) data.unlockedTurrets.push(id);
      }
    }
    if (!data.bestStars) data.bestStars = {};
    if (!data.bestBankedCoins) data.bestBankedCoins = {};
    data.settings = {
      sound: data.settings?.sound !== false,
      music: data.settings?.music !== false,
      difficultyLevel: normalizeDifficultyLevel(data.settings?.difficultyLevel),
    };
    data.enemyDefeated = normalizeEnemyDefeats(data.enemyDefeated);
    data.trainingGate = normalizeTrainingGate(data.trainingGate);
    data.levelMastery = normalizeLevelMastery(data.levelMastery);
    data.mapProgress = normalizeMapProgress(data.mapProgress);
    data.turretLevels = normalizeTurretLevels(data.turretLevels);
    data.upgradeCores = normalizeCores(data.upgradeCores);
    // All-time crystals: what the player holds plus what they have already spent on upgrades.
    const spent = Object.values(data.turretLevels).reduce((sum, level) => sum + (level >= 3 ? 3 : level >= 2 ? 1 : 0), 0);
    data.crystalsCollected = Math.max(normalizeCores(data.crystalsCollected), data.upgradeCores + spent);
    data.tips = {
      off: Boolean(data.tips?.off),
      seen: Array.isArray(data.tips?.seen) ? data.tips.seen.filter((id) => typeof id === 'string') : [],
    };
    data.siegeRecord = normalizeSiegeRecord(data.siegeRecord, data.siegesCompleted);
    data.streak = normalizeStreak(data.streak);
    data.records = normalizeRecords(data.records);
    // Older saves already know some personal bests.
    data.records.bestKills.v = Math.max(data.records.bestKills.v, Math.floor(Number(data.bestKills?.[SLICE_MISSION_ID]) || 0));
    data.records.siegesWon = Math.max(data.records.siegesWon, data.siegeRecord.won);
    data.trophies = data.trophies && typeof data.trophies === 'object' ? data.trophies : {};
    data.title = typeof data.title === 'string' && data.trophies[data.title] ? data.title : null;
    // Existing players see the story for the rank they already hold, once.
    data.storySeen = Number.isFinite(data.storySeen) ? data.storySeen : Math.max(0, siegeRankLevel(data.siegeRecord) - 1);
    data.activeChallenge = data.activeChallenge && Number.isFinite(data.activeChallenge.score) ? data.activeChallenge : null;
    data.lastChallengeCode = typeof data.lastChallengeCode === 'string' ? data.lastChallengeCode : null;
    data.gear = normalizeGear(data.gear);
    data.stretchCoins = Math.max(0, Math.floor(Number(data.stretchCoins) || 0));
    // Preserve old players' real mastered levels and map passes as a one-time rank baseline.
    data.topicProgress = normalizeTopicProgress(data.topicProgress, data.levelMastery, data.mapProgress);
    if (DEV.enabled && DEV.unlockAll) {
      data.unlockedTurrets = Object.keys(TURRETS);
      data.xp = Math.max(data.xp, 9999);
    }
    if (DEV.enabled) {
      data.grannyUnlocked = true;
    }
    normalizeMetaSave(data);
    return data;
  } catch {
    return { ...defaultSave, unlockedTurrets: [...STARTER_TURRETS] };
  }
}

function persistSave() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function isUnlocked(id) {
  return save.unlockedTurrets.includes(id);
}

/** The sound button steps through: everything on, music off (effects still on), everything off. */
function toggleSound() {
  const { sound, music: musicOn } = save.settings;
  if (sound && musicOn) save.settings.music = false;
  else if (sound) save.settings.sound = false;
  else save.settings = { ...save.settings, sound: true, music: true };
  persistSave();
  refreshSoundButton();
  if (!save.settings.sound) audio.stopScuttling();
  if (!save.settings.sound || !save.settings.music) music.mute();
  else if (document.body.classList.contains('siege-mode')) music.startBattle();
  const btn = document.getElementById('btn-sound');
  btn?.blur();
  const state = !save.settings.sound ? 'off' : save.settings.music ? 'all' : 'effects';
  showToast(
    state === 'all' ? 'Music, blasters and booms are all on.' : state === 'effects' ? 'Music is off. Sound effects are still on. Tap again to mute everything.' : 'All game sounds are off.',
    { variant: 'info', title: state === 'all' ? 'Sound on' : state === 'effects' ? 'Music off' : 'Sound muted', icon: state === 'off' ? '🔇' : state === 'effects' ? '🔈' : '🔊' },
  );
}

function showScreen(id) {
  const inLearning = LEARNING_SCREENS.has(id);
  // A hot streak carries from one question screen to the next and into the battle it earns.
  if (id === 'siege') {
    endAnswerStreak();
    music.startBattle();
  } else if (id === 'home' || id === 'results' || id === 'armory' || id === 'welcome') {
    endAnswerStreak();
    music.stop();
  }
  const previousScreen = Object.entries(screens)
    .find(([, element]) => element?.classList.contains('active'))?.[0];
  if (!inLearning) stopMissionDossier();
  if (missionShell) missionShell.hidden = !inLearning;
  document.body.classList.toggle('mission-mode', inLearning);
  document.body.classList.toggle('siege-mode', id === 'siege');
  Object.entries(screens).forEach(([key, el]) => {
    el?.classList.toggle('active', key === id);
  });
  // Each lesson opens at the top of the independent centre scroller.
  // Re-rendering the current screen (e.g. changing difficulty) keeps its place.
  if (inLearning && previousScreen !== id) {
    const workspace = document.getElementById('mission-workspace');
    if (workspace) workspace.scrollTop = 0;
  }
  syncMissionControlAction(id);
  refreshTopbar();
}

function syncMissionControlAction(id) {
  const action = document.getElementById('btn-hold-line');
  // During a drill, leave the radar and forge visible. Only offer
  // the main battle button on HQ; activities have their own finish controls.
  if (action) action.hidden = id !== 'home';
  const homeButton = document.getElementById('mission-back-to-hq');
  if (homeButton) homeButton.hidden = id === 'home';
}

function refreshSoundButton() {
  const btn = document.getElementById('btn-sound');
  if (btn) {
    btn.classList.toggle('is-muted', !save.settings.sound);
    btn.classList.toggle('music-off', save.settings.sound && !save.settings.music);
    btn.setAttribute('aria-label', !save.settings.sound ? 'Unmute sound' : save.settings.music ? 'Turn music off' : 'Mute all sound');
  }
}

/** Right answers in a row drive the hot-streak music and the ON FIRE badge; a wrong answer resets it. @param {boolean} right */
function trackAnswerStreak(right) {
  answerStreak = right ? answerStreak + 1 : 0;
  music.setStreak(answerStreak);
  let badge = document.getElementById('onfire-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'onfire-badge';
    badge.className = 'onfire-badge';
    badge.setAttribute('aria-live', 'polite');
    document.body.append(badge);
  }
  badge.hidden = answerStreak < STREAK_MUSIC_FROM;
  if (!badge.hidden) {
    badge.textContent = `🔥 ON FIRE ×${answerStreak}`;
    badge.classList.remove('is-bump');
    void badge.offsetWidth;
    badge.classList.add('is-bump');
  }
}

function endAnswerStreak() {
  answerStreak = 0;
  const badge = document.getElementById('onfire-badge');
  if (badge) badge.hidden = true;
}

function refreshTopbar() {
  const coresDisplay = document.getElementById('topbar-cores');
  if (coresDisplay) coresDisplay.textContent = String(save.upgradeCores);
  document.getElementById('topbar-cores-pill')?.classList.toggle('core-pill--ready', anyUpgradeReady(save.upgradeCores, getUnlockedSet()));
  const missionXp = document.getElementById('mission-control-xp');
  if (missionXp && !missionXp.classList.contains('tallying')) missionXp.textContent = save.xp.toLocaleString();
  refreshSoundButton();
  renderTopbarBadges(document.getElementById('topbar-badges'), save.siegeRecord, { title: trophyTitle(save.title), onOpen: () => openProfile() });
  refreshEngagementPills();
}

function renderArmoryScreen() {
  const host = document.getElementById('armory-host');
  if (!host) return;
  renderArmory(host, {
    xp: save.xp,
    cores: save.upgradeCores,
    unlocked: getUnlockedSet(),
    onUnlock(id) {
      const ok = tryUnlockTurret(id);
      if (ok) renderArmoryScreen();
      return ok;
    },
    onUpgrade(id) {
      const ok = tryUpgradeTurret(id);
      if (ok) renderArmoryScreen();
      return ok;
    },
    onBack: closeArmory,
    showToast,
    tab: armoryTab,
    gear: save.gear,
    onTab(tab) {
      armoryTab = tab === 'gear' ? 'gear' : 'turrets';
      renderArmoryScreen();
    },
    onBuyGear(id) {
      const def = GEAR.find((g) => g.id === id);
      const st = gearStatus(id, save.gear, save.upgradeCores);
      if (!def || st.state !== 'ready') return;
      save.upgradeCores -= st.cost;
      save.gear = [...save.gear, id];
      persistSave();
      audio.playTurretUpgrade();
      refreshTopbar();
      refreshMissionControl();
      showPop(`<img class="gear-pop-art" src="assets/gear/${id}.png" alt="" />`, 'GEAR UNLOCKED!', def.name);
      renderArmoryScreen();
    },
  });
}

/** Which Armory tab is showing. @type {'turrets'|'gear'} */
let armoryTab = 'turrets';

function openArmory() {
  dismissWeaponAnnouncement();
  const active = Object.entries(screens).find(([, el]) => el?.classList.contains('active'));
  const key = active?.[0] ?? 'home';
  armoryReturnScreen = key === 'welcome' || key === 'armory' ? 'home' : key;
  renderArmoryScreen();
  showScreen('armory');
}

function closeArmory() {
  if (armoryReturnScreen === 'home') {
    showHome();
  } else {
    showScreen(armoryReturnScreen);
    if (armoryReturnScreen === 'siege') refreshShopBarFromSave();
  }
}

function renderHowToScreen() {
  const host = document.getElementById('howto-host');
  if (!host) return;
  initHowToPlay(host, { onBack: closeHowTo, onReplayTips: replayTips });
}

function openHowTo() {
  renderHowToScreen();
  openModal('howto-modal');
}

function closeHowTo() {
  closeModal('howto-modal');
}

function getUnlockedSet() {
  return new Set(save.unlockedTurrets);
}

function tryUnlockTurret(id) {
  const t = TURRETS[id];
  if (!t) return false;
  if (isUnlocked(id)) return true;
  if (save.xp < t.unlockXp) {
    showToast(`Need ${t.unlockXp.toLocaleString()} ${ECONOMY.forgeXpLabel} to unlock ${t.name}.`);
    return false;
  }
  save.unlockedTurrets.push(id);
  persistSave();
  refreshShopBarFromSave();
  refreshTopbar();
  return true;
}

/**
 * One alien crystal, with a big reward moment: the crystal bursts onto the screen, then flies into
 * the header counter. Tapping it opens the Armory to spend it.
 * @param {string} reason
 */
function awardUpgradeCore(reason, from, amount = 1) {
  const tierBefore = vaultTierFor(save.crystalsCollected).id;
  save.upgradeCores += amount;
  save.crystalsCollected += amount;
  persistSave();
  refreshTopbar();
  refreshMissionControl();
  if (from?.x != null && from?.y != null) showCrystalDrop(from.x, from.y);
  else showCoreReward(reason);
  if (vaultTierFor(save.crystalsCollected).id !== tierBefore) {
    const collected = save.crystalsCollected;
    window.setTimeout(() => {
      showVaultUpgrade(collected);
      audio.playTurretUpgrade();
    }, 3400);
  }
}

/* ---------- Streaks, daily challenges, lucky drops, trophies, records, friend challenges, story ---------- */

/** Bonus crystals drop in mid-screen without blocking, so a drill is never interrupted. */
function screenCentre() {
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
}

/** Today's challenges and lucky-drop tally, reset at local midnight. */
function dailyState() {
  save.daily = normalizeDaily(save.daily, localDayKey());
  return save.daily;
}

function refreshEngagementPills() {
  renderStreakPill(document.getElementById('topbar-streak'), streakStatus(save.streak));
  renderDailyPill(document.getElementById('topbar-daily'), dailyState());
}

/** @param {import('./daily-challenges.js').ChallengeEvent} event @param {{ amount?: number, topic?: string, level?: number }} [info] */
function challengeEvent(event, info) {
  const r = recordChallengeEvent(dailyState(), event, info);
  save.daily = r.daily;
  if (!r.completed.length && !r.chestOpened) return;
  persistSave();
  r.completed.forEach((c, i) => {
    window.setTimeout(() => showPop(`<img class="gear-pop-art" src="${ICONS.target}" alt="" />`, 'CHALLENGE DONE!', `${c.text} · +${c.xp} XP`), i * 700);
    creditForgeXp(c.xp);
  });
  if (r.chestOpened) {
    creditForgeXp(DAILY_CHEST_XP);
    window.setTimeout(() => awardUpgradeCore('GRANNY’S CHEST OPENED', screenCentre()), 1200);
  }
  refreshEngagementPills();
}

/** Every right maths answer: records, streak, daily challenges and a chance of a lucky drop. */
function creditEngagementAnswer(topicId, level) {
  save.records.rightAnswers += 1;
  const s = recordStreakAnswer(save.streak);
  save.streak = s.streak;
  if (s.extended) {
    showPop(`<img class="gear-pop-art" src="${ICONS.flame}" alt="" />`, `${s.streak.count} DAY STREAK!`, s.shieldUsed ? 'Your streak shield saved it!' : 'Come back tomorrow to keep it going.');
  }
  if (s.shieldEarned) window.setTimeout(() => showPop('🛡️', 'STREAK SHIELD EARNED', 'It saves your streak if you miss a day.'), 900);
  if (s.milestoneCrystals) {
    window.setTimeout(() => awardUpgradeCore(`${s.streak.count}-DAY STREAK`, screenCentre(), s.milestoneCrystals), 1500);
  }
  challengeEvent('right', { topic: topicId, level });
  const lucky = rollLuckyDrop(dailyState());
  if (lucky?.kind === 'xp') {
    creditForgeXp(lucky.amount);
    showPop('🍀', 'LUCKY DROP!', `+${lucky.amount} bonus Forge XP`);
  } else if (lucky?.kind === 'crystal') {
    save.daily = { ...dailyState(), luckyCrystals: dailyState().luckyCrystals + 1 };
    awardUpgradeCore('LUCKY DROP!', screenCentre());
  }
  persistSave();
  refreshEngagementPills();
  checkNewTrophies();
}

function trophyContext() {
  return {
    records: save.records,
    rankLevel: siegeRankLevel(save.siegeRecord),
    streakBest: save.streak.best,
    crystals: save.crystalsCollected,
    maxTurretLevel: Math.max(1, ...TURRET_ORDER.map((id) => turretLevel(id))),
    ownsAllTurrets: TURRET_ORDER.every((id) => save.unlockedTurrets.includes(id)),
    mapComplete: allMapPiecesEarned(save.mapProgress),
    topicRank: (id) => topicRankProgress(getTopicRecord(save.topicProgress, id).xp).rank,
    granddaddyDefeated: enemyDefeatCount(save.enemyDefeated, 'granddaddy') > 0,
  };
}

/** @param {{ quiet?: boolean }} [opts] Quiet on load, so old feats are recorded without a burst of pop-ups. */
function checkNewTrophies(opts = {}) {
  const r = checkTrophies(save.trophies, trophyContext(), localDayKey());
  if (!r.fresh.length) return;
  save.trophies = r.earned;
  persistSave();
  if (!opts.quiet) r.fresh.forEach((t, i) => window.setTimeout(() => showTrophyPop(t), 600 + i * 1100));
}

/** @param {'ranks'|'trophies'|'records'|'challenge'} [tab] */
function openProfile(tab) {
  checkNewTrophies({ quiet: true });
  showProfile({
    level: siegeRankLevel(save.siegeRecord),
    record: save.siegeRecord,
    title: save.title,
    earned: save.trophies,
    records: save.records,
    streakBest: save.streak.best,
    crystals: save.crystalsCollected,
    playerName: save.playerName,
    siegesPlayed: save.siegesCompleted,
    shields: countShieldsEarned(save.levelMastery),
    lastCode: save.lastChallengeCode,
    activeChallenge: save.activeChallenge,
    tab,
    onSetTitle(id) {
      save.title = id;
      persistSave();
      refreshTopbar();
    },
    onAcceptChallenge(code, from) {
      const score = readChallengeCode(code);
      if (score == null) return 'That code doesn’t look right. Check the letters and try again.';
      save.activeChallenge = { score, from: from.slice(0, 16) };
      persistSave();
      showToast(`Challenge accepted! Beat ${from || 'your friend'}’s ${score} aliens in your next siege.`, { variant: 'success' });
      return save.activeChallenge;
    },
  });
}

/** After a siege: records, daily challenge progress, friend challenge result and a code to share. */
function recordSiegeEngagement(stats, prevBestKills) {
  const today = localDayKey();
  const newRecord = prevBestKills > 0 && stats.kills > prevBestKills;
  if (stats.kills > save.records.bestKills.v) save.records.bestKills = { v: stats.kills, d: today };
  if (stats.won) {
    save.records.siegesWon += 1;
    if (stats.leaks === 0) save.records.zeroLeakWins += 1;
    challengeEvent('siege-won');
    if (stats.leaks <= 3) challengeEvent('siege-won-3');
  }
  challengeEvent('siege-kills', { amount: stats.kills });
  let challenge = null;
  if (save.activeChallenge) {
    const won = stats.kills > save.activeChallenge.score;
    challenge = { ...save.activeChallenge, won };
    if (won) {
      save.records.challengesWon += 1;
      save.activeChallenge = null;
    }
  }
  const code = makeChallengeCode(stats.kills);
  save.lastChallengeCode = code;
  persistSave();
  checkNewTrophies();
  return { newRecord, kills: stats.kills, prevBest: prevBestKills, code, challenge };
}

/** Granny's Log for a newly earned rank, after the rank-up celebration has played. */
function showPendingStory() {
  const level = siegeRankLevel(save.siegeRecord);
  const beat = STORY_BEATS[level];
  if (!beat || level <= save.storySeen) return;
  save.storySeen = level;
  persistSave();
  window.setTimeout(() => showStory(beat), 3200);
}

/**
 * In battle: the crystal bursts out of the defeated boss where it died, hangs there glowing,
 * then arcs up into the header counter. Never blocks the fight.
 * @param {number} x @param {number} y
 */
function showCrystalDrop(x, y) {
  const el = document.createElement('div');
  el.className = 'crystal-drop';
  el.setAttribute('aria-hidden', 'true');
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerHTML = `
    <span class="crystal-drop-flash"></span>
    <span class="core-reward-rays crystal-drop-rays"></span>
    <span class="crystal-drop-gem"><span class="core-gem core-gem--big"></span></span>
    <strong class="crystal-drop-title">ALIEN CRYSTAL!</strong>`;
  document.body.append(el);
  audio.playCoreEarned();
  window.setTimeout(() => {
    const pill = document.getElementById('topbar-cores-pill');
    const gem = el.querySelector('.crystal-drop-gem');
    if (pill && gem) {
      const to = pill.getBoundingClientRect();
      const fromBox = gem.getBoundingClientRect();
      gem.style.setProperty('--fly-x', `${to.left + to.width / 2 - (fromBox.left + fromBox.width / 2)}px`);
      gem.style.setProperty('--fly-y', `${to.top + to.height / 2 - (fromBox.top + fromBox.height / 2)}px`);
    }
    el.classList.add('is-leaving');
    window.setTimeout(() => {
      el.remove();
      audio.playCoreCollect();
      pill?.classList.remove('core-pill--bump');
      void pill?.offsetWidth;
      pill?.classList.add('core-pill--bump');
    }, 750);
  }, 1500);
}

let coreRewardTimer = 0;

/** @param {string} reason */
function showCoreReward(reason) {
  document.querySelector('.core-reward')?.remove();
  clearTimeout(coreRewardTimer);
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'core-reward';
  el.setAttribute('aria-label', 'Alien crystal collected. Open the Armory to spend it.');
  el.innerHTML = `
    <span class="core-reward-inner">
      <span class="core-reward-rays" aria-hidden="true"></span>
      <span class="core-gem core-gem--big" aria-hidden="true"></span>
      <strong class="core-reward-title">ALIEN CRYSTAL!</strong>
      <span class="core-reward-reason">${reason}</span>
      <span class="core-reward-cta">TAP TO POWER UP A TURRET</span>
    </span>`;
  el.addEventListener('click', () => {
    el.remove();
    openArmory();
  });
  document.body.append(el);
  audio.playCoreEarned();
  coreRewardTimer = window.setTimeout(() => {
    const pill = document.getElementById('topbar-cores-pill');
    const gem = el.querySelector('.core-gem--big');
    if (pill && gem) {
      const to = pill.getBoundingClientRect();
      const from = gem.getBoundingClientRect();
      const inner = el.querySelector('.core-reward-inner');
      inner?.style.setProperty('--fly-x', `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
      inner?.style.setProperty('--fly-y', `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
    }
    el.classList.add('is-leaving');
    window.setTimeout(() => {
      el.remove();
      audio.playCoreCollect();
      pill?.classList.remove('core-pill--bump');
      void pill?.offsetWidth;
      pill?.classList.add('core-pill--bump');
    }, 650);
  }, 2600);
}

/** Claim a turret's next level once the player's Forge XP has passed its threshold. */
function tryUpgradeTurret(id) {
  const next = nextUpgrade(id, save.upgradeCores, isUnlocked(id));
  if (!next?.ready) return false;
  save.upgradeCores -= next.cost;
  save.turretLevels = { ...save.turretLevels, [id]: next.level };
  audio.playTurretUpgrade();
  setTurretLevels(save.turretLevels);
  forgeSquad = null;
  refreshMissionControl();
  persistSave();
  refreshShopBarFromSave();
  refreshTopbar();
  return true;
}

function selectTurret(id) {
  if (id !== 'hedge' && !isUnlocked(id)) return;
  run.selectedTurret = id;
  shopState.selectedId = id;
  tdEngine?.setSelectedType(id);
  if (shopBarEl) updateShopBar(shopBarEl, shopState);
}

function refreshShop() {
  shopState.budget = run.waveBudget;
  shopState.persistentXp = save.xp;
  shopState.unlocked = getUnlockedSet();
  if (shopBarEl) updateShopBar(shopBarEl, shopState);
}

function refreshShopBarFromSave() {
  if (!shopBarEl) return;
  shopState.persistentXp = save.xp;
  shopState.unlocked = getUnlockedSet();
  renderShopBar(shopBarEl, shopState);
}

function setShopActive(active) {
  if (!shopBarEl) return;
  shopBarEl.style.opacity = active ? '' : '0.45';
  shopBarEl.style.pointerEvents = active ? '' : 'none';
}

function addCacheProgress(amount) {
  if (!save.grannyUnlocked || amount <= 0) return;
  run.cacheProgress += amount;
  updateNukeCachePanel();
}

function updateNukeCachePanel() {
  const panel = document.getElementById('nuke-cache-panel');
  if (!panel) return;
  const unlocked = save.grannyUnlocked;
  panel.hidden = !unlocked;
  if (!unlocked) return;

  const { cost } = GRANNY_CACHE;
  const shown = Math.min(run.cacheProgress, cost);
  const pct = cacheFillPercent(run.cacheProgress, cost);

  const visual = document.getElementById('nuke-cache-visual');
  if (visual) {
    visual.style.setProperty('--fill', `${pct}%`);
    visual.classList.toggle('nuke-cache-full', run.cacheProgress >= cost);
  }

  const progressEl = document.getElementById('nuke-cache-progress');
  if (progressEl) progressEl.textContent = `${shown} / ${cost}`;

  const statusEl = document.getElementById('nuke-cache-status');
  const salvoActive = tdEngine?.isCupcakeActive?.() ?? false;
  const cacheReady = run.cacheProgress >= cost;
  if (cacheReady && !nukeCacheWasReady && !salvoActive) {
    audio.playNukeReady();
  }
  nukeCacheWasReady = cacheReady;

  if (statusEl) {
    if (salvoActive) statusEl.textContent = 'Cupcakes inbound…';
    else if (cacheReady) statusEl.textContent = 'Ready — Fire nukes!';
    else statusEl.textContent = 'Blast aliens to fill';
    statusEl.classList.toggle('is-ready', cacheReady && !salvoActive);
  }

  panel.classList.toggle('nuke-cache-ready', cacheReady);

  updateFireNukesButton();
}

function updateFireNukesButton() {
  const btn = document.getElementById('btn-fire-nukes');
  if (!btn) return;
  const unlocked = save.grannyUnlocked;
  btn.hidden = !unlocked;
  if (!unlocked) return;

  const { cost } = GRANNY_CACHE;
  const inWave = tdEngine?.getPhase?.() === 'wave';
  const cacheReady = run.cacheProgress >= cost;
  const salvoActive = tdEngine?.isCupcakeActive?.() ?? false;
  const canFire = tdEngine?.canFireNukes?.() ?? false;
  const showArmed = inWave && cacheReady && !salvoActive;
  const canClick = showArmed && canFire;

  btn.disabled = !canClick;
  btn.classList.toggle('is-armed', showArmed);
  btn.classList.toggle('is-inbound', salvoActive);
  btn.textContent = salvoActive ? 'Nukes inbound…' : 'Fire nukes';
}

/**
 * Small, non-blocking unlock notice. It never interrupts the maths question.
 * Students may visit the Armory now or carry on working.
 */
function dismissWeaponAnnouncement() {
  const host = document.getElementById('weapon-unlock-notice');
  if (host) {
    host.hidden = true;
    host.innerHTML = '';
  }
}

function showPendingWeaponAnnouncement() {
  if (!pendingArmoryUnlock) return;
  const active = Object.entries(screens).find(([,el]) => el?.classList.contains('active'))?.[0];
  if (active === 'siege' || active === 'forge' || active === 'welcome') return;
  const host = document.getElementById('weapon-unlock-notice');
  const id = pendingArmoryUnlock;
  const turret = TURRETS[id];
  if (!host || !turret || isUnlocked(id)) {
    pendingArmoryUnlock = null;
    return;
  }
  pendingArmoryUnlock = null;
  host.innerHTML = `
    <img src="${turret.sprite}" alt="" width="95" height="95" class="unlock-notice-art" />
    <div class="unlock-notice-copy">
      <strong>OI! NEW WEAPON AVAILABLE!</strong>
      <span>${turret.name} can now be unlocked permanently.</span>
      <div class="unlock-notice-actions">
        <button type="button" id="unlock-notice-open">VISIT ARMORY</button>
        <button type="button" id="unlock-notice-later">Later</button>
      </div>
    </div>
  `;
  host.hidden = false;
  host.querySelector('#unlock-notice-open')?.addEventListener('click', openArmory);
  host.querySelector('#unlock-notice-later')?.addEventListener('click', dismissWeaponAnnouncement);
}

/** Check for XP milestones without treating Forge XP as spendable currency. */
function checkNewWeaponMilestone(previousXp) {
  const id = TURRET_ORDER.find((id) =>
    !isUnlocked(id) && previousXp < TURRETS[id].unlockXp && save.xp >= TURRETS[id].unlockXp
  );
  if (!id) return;
  pendingArmoryUnlock = id;
  showPendingWeaponAnnouncement();
}

/** All Forge XP awards pass through here, including siege rewards. */
function creditForgeXp(amount) {
  if (!(amount > 0)) return 0;
  const previousXp = save.xp;
  save.xp += amount;
  persistSave();
  refreshTopbar();
  checkNewWeaponMilestone(previousXp);
  return amount;
}

function awardForgeXp(amount, reason) {
  if (amount <= 0) return;
  creditForgeXp(amount);
  if (reason) {
    showToast(`+${amount} ${ECONOMY.forgeXpLabel} · ${reason}`, { variant: 'success' });
  }
}

/** @param {number} baseAmount @param {import('./difficulty.js').DifficultyLevel} level */
function awardScaledTrainingXp(baseAmount, level) {
  const amount = scaleTrainingXp(baseAmount, level);
  if (amount <= 0) return 0;
  return creditForgeXp(amount);
}

/**
 * Maths topic ranks track correct answers separately from the 10-question siege gate.
 * Their progress continues even when a siege is already ready to play.
 * @param {string} topicId
 * @param {1|2|3|4} level
 * @param {boolean} right
 */
function creditTopicAnswer(topicId, level, right) {
  const result = recordTopicAnswer(save.topicProgress, topicId, level, right, topicXpMultiplier(topicId));
  save.topicProgress = result.progress;
  persistSave();
  announceTopicRankReward(topicId, result);
}

function creditTopicSession(topicId, accuracy) {
  const result = recordTopicSession(save.topicProgress, topicId, accuracy, topicXpMultiplier(topicId));
  save.topicProgress = result.progress;
  persistSave();
  announceTopicRankReward(topicId, result);
}

function announceTopicRankReward(topicId, result) {
  if (!result.rankUp) return;
  const title = getTopic(topicId)?.title || 'Maths';
  awardUpgradeCore(`${title.toUpperCase()} RANK ${result.newRank}`);
  if (result.bonusForgeXp) {
    creditForgeXp(result.bonusForgeXp);
    showToast(`${title.toUpperCase()} · RANK ${result.newRank}! +${result.bonusForgeXp} FORGE XP!`, { variant: 'success', duration: 4500 });
  } else {
    showToast(`${title.toUpperCase()} · RANK ${result.newRank}!`, { variant: 'success', duration: 2800 });
  }
}

/** Every answered question charges the forge, including wrong answers.
 * Correct answers earn the accuracy-based siege-coin boost.
 * Progress is saved immediately, including when students leave mid-session.
 * @param {boolean} right
 * @param {number} [level] Level 3 and 4 bonus answers (after the first ten) also pay stretch coins.
 */
function creditTrainingAnswer(right) {
  // Only right answers charge Granny's defences, so a siege always means ten correct answers.
  if (!right) {
    lastTrainingAnswerCorrect = false;
    return;
  }
  const previouslyReady = isGateOpen(save.trainingGate);
  const previousBonus = bonusSiegeSeconds(save.trainingGate);
  const result = recordTrainingQuestions(save.trainingGate, 1, 1);
  if (!result.added) return;
  save.trainingGate = result.gate;
  lastTrainingAnswerCorrect = right;
  if (previouslyReady) save.stretchCoins += STRETCH_COINS_PER_ANSWER;
  persistSave();
  refreshMissionControl();
  if (!previouslyReady && isGateOpen(save.trainingGate)) awardUpgradeCore('MISSION COMPLETE');
  const extraTime = bonusSiegeSeconds(save.trainingGate);
  if (extraTime > previousBonus) {
    showToast(`BONUS ASSAULT EARNED! +${extraTime} seconds after your normal siege.`, {
      variant: 'success',
      duration: 4200,
    });
  } else if (!previouslyReady && isGateOpen(save.trainingGate)) {
    showToast('Defences fully charged! Finish your activity, then defend Granny!', {
      variant: 'success',
      duration: 4200,
    });
  }
}

/**
 * @param {string} moduleId
 * @param {import('./difficulty.js').DifficultyLevel} level
 * @param {number} accuracy 0–1
 */
function completeTrainingSession(moduleId, level, accuracy) {
  const result = recordTrainingProgress(
    save.levelMastery,
    save.mapProgress,
    moduleId,
    level,
    accuracy
  );
  save.levelMastery = result.mastery;
  save.mapProgress = result.mapProgress;
  creditTopicSession(moduleId, accuracy);

  // Ten-question drills were credited live by their answer callbacks.
  // Place Value is a one-puzzle forge, so it earns one credit on success.
  if (moduleId === 'place-value-siege') creditTrainingAnswer(true);
  persistSave();
  refreshMissionControl();

  if (result.shieldEarned) {
    if (result.firstClearBonus > 0) {
      creditForgeXp(result.firstClearBonus);
      showToast(
        `Perfect! Level ${level} shield earned · +${result.firstClearBonus} ${ECONOMY.forgeXpLabel}`,
        { variant: 'success', duration: 4000 }
      );
    } else {
      showToast(`Perfect! Level ${level} shield earned!`, { variant: 'success', duration: 4000 });
    }
  }

  if (result.mapPieceEarned) {
    window.setTimeout(() => {
      showMapPieceFound(moduleId, mapPiecesEarned(save.mapProgress));
      audio.playTurretUpgrade();
    }, result.shieldEarned ? 1400 : 300);
  }

  if (result.nudge) {
    const delay = result.shieldEarned || result.mapPieceEarned ? 900 : 700;
    window.setTimeout(() => showToast(result.nudge, { variant: 'shop', duration: 4500 }), delay);
  }
  return result;
}

/** @param {string} moduleId */
function createTrainingHandlers(moduleId) {
  const level = getDifficultyLevel();
  return {
    difficultyLevel: level,
    onAwardXp(baseAmount) {
      return awardScaledTrainingXp(baseAmount, level);
    },
    onAnswer(right) {
      if (right) audio.playCorrect();
      else audio.playWrong();
      trackAnswerStreak(right);
      if (right) creditEngagementAnswer(moduleId, level);
      creditTopicAnswer(moduleId, level, right);
      creditTrainingAnswer(right);
    },
    onSessionComplete(accuracy) {
      return completeTrainingSession(moduleId, level, accuracy);
    },
    onHome: showHome,
    siegeReady: () => DEV.skipForge || isGateOpen(save.trainingGate),
    onAction: goToTheAction,
    showToast,
  };
}

/** Straight from a finished maths session into the siege, without passing Maths HQ, so the music plays on. */
function goToTheAction() {
  disposeActiveTraining?.();
  disposeActiveTraining = null;
  beginMission();
}

function maybeNudgeRecommendedLevel(topicId) {
  const rec = recommendModuleLevel(save.levelMastery, topicId);
  const cur = getDifficultyLevel();
  if (cur < rec) {
    showToast(`Granny recommends Level ${rec} here — ${xpMultiplierLabel(rec)}`, {
      variant: 'shop',
      duration: 3800,
    });
  }
}

function persistGate(nextGate) {
  save.trainingGate = nextGate;
  persistSave();
}

function getDifficultyLevel() {
  return normalizeDifficultyLevel(save.settings.difficultyLevel);
}

function setDifficultyLevel(level) {
  save.settings.difficultyLevel = normalizeDifficultyLevel(level);
  persistSave();
}

function getActiveMission() {
  const mission = getMissionForDifficulty(SLICE_MISSION_ID, getDifficultyLevel());
  return mission ? balanceMission(mission, save.siegesCompleted) : null;
}

function refreshDeploymentPanel() {
  const panel = document.getElementById('siege-deploy-panel');
  if (!panel || panel.hidden) return;
  const summary = document.getElementById('siege-deploy-summary');
  const btn = /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-launch-siege'));
  if (summary) {
    const count = deploymentTurretsPlaced;
    summary.textContent = `${count} turret${count === 1 ? '' : 's'} deployed · ${run.waveBudget} coins left`;
  }
  if (btn) btn.disabled = deploymentTurretsPlaced < 1;
}

function showBonusAssaultOffer(seconds) {
  bonusBankProtected = run.waveBudget;
  const panel = document.getElementById('siege-bonus-panel');
  const amount = document.getElementById('siege-bonus-seconds');
  if (amount) amount.textContent = `+${seconds} seconds`;
  if (!panel) return;
  panel.hidden = false;
  bonusChoiceFocus = document.activeElement;
  /** @type {HTMLButtonElement|null} */ (document.getElementById('btn-bonus-accept'))?.focus();
}

function resolveBonusAssault(accept) {
  if (!tdEngine?.chooseBonusAssault(accept)) return;
  const panel = document.getElementById('siege-bonus-panel');
  if (panel) panel.hidden = true;
  if (accept) setShopActive(true);
  else if (bonusChoiceFocus instanceof HTMLElement) bonusChoiceFocus.focus();
  bonusChoiceFocus = null;
}

/** The next siege's opening assault, shrunk by any scouts that extra right answers have zapped. */
function currentHorde() {
  return openingHorde({
    firstSiege: save.siegesCompleted === 0,
    rank: siegeRankLevel(save.siegeRecord),
    extraRight: Math.max(0, (save.trainingGate.questionsDone || 0) - GATE.questionsRequired),
  });
}

/** What the player takes into the next siege: the same coin sum the siege starts with, and bonus time. */
function currentWarChest() {
  const mission = getActiveMission();
  const coins = (mission ? startingSiegeCoins(mission, save.siegesCompleted, save.trainingGate.bonusSiegeCoins) : 90)
    + gearEffects(save.gear).extraStartCoins + save.stretchCoins;
  const answered = save.trainingGate.questionsDone || 0;
  return {
    coins,
    bonusSeconds: bonusSiegeSeconds(save.trainingGate),
    extraLeft: Math.max(0, GATE.maxQuestions - Math.max(answered, GATE.questionsRequired)),
    coinsPerAnswer: STRETCH_COINS_PER_ANSWER,
  };
}

function makeDashboardState() {
  return {
    playerName: save.playerName || 'Recruit',
    xp: save.xp,
    horde: currentHorde(),
    warChest: currentWarChest(),
    onZap: showZapRun,
    unlockedTurrets: getUnlockedSet(),
    enemyDefeated: save.enemyDefeated,
    onArmory: openArmory,
    siegesCompleted: save.siegesCompleted,
    crystalsCollected: save.crystalsCollected,
    crystalsToSpend: save.upgradeCores,
    bestKills: save.bestKills[SLICE_MISSION_ID] ?? 0,
    bestBankedCoins: save.bestBankedCoins[SLICE_MISSION_ID] ?? 0,
    bestStars: save.bestStars,
    primaryMissionId: SLICE_MISSION_ID,
    gate: save.trainingGate,
    levelMastery: save.levelMastery,
    mapProgress: save.mapProgress,
    topicProgress: save.topicProgress,
    difficultyLevel: getDifficultyLevel(),
    recommendedLevel: recommendGlobalLevel(save.levelMastery),
    onDifficultyChange(level) {
      setDifficultyLevel(level);
      showHome({ reroll: false });
    },
    onTopic(topicId) {
      const topic = getTopic(topicId);
      if (!topic?.available) {
        showToast('Granny is still forging that topic!');
        return;
      }
      maybeNudgeRecommendedLevel(topicId);
      if (topicId === 'times-tables') {
        showTimesTables();
        return;
      }
      if (topicId === 'maths-quest') {
        showMathsQuest();
        return;
      }
      if (topic.trainingMode === 'forge' && topic.unitId) {
        showForgeTraining(topic);
        return;
      }
      if (topic.trainingMode === 'drill') {
        if (topicId === 'measurement-length') showMeasurementLength();
        else if (topicId === 'fractions') showFractions();
        else if (topicId === 'angles') showAnglesShapes();
        else if (['operations', 'decimals-percent', 'time', 'mass-capacity'].includes(topicId)) showExpandedMath(topicId);
        else showToast('That training is still in the forge.');
        return;
      }
      showToast('That training is still in the forge.');
    },
    onHoldTheLine() {
      audio.warmUp();
      audio.playLockAndLoad();
      disposeActiveTraining?.();
      disposeActiveTraining = null;
      if (!DEV.skipForge && !isGateOpen(save.trainingGate)) {
        showBattlePrep({ special: isSpecialMission() });
        return;
      }
      beginMission();
    },
    onHome() {
      disposeActiveTraining?.();
      disposeActiveTraining = null;
      showHome();
    },
    showToast,
  };
}

/** Rebuild just the persistent control room, without touching a live maths activity. */
function refreshMissionControl() {
  const host = document.getElementById('mission-control');
  if (!host) return;
  const state = makeDashboardState();
  const scrollTop = host.scrollTop;
  renderMissionControl(host, state);
  host.scrollTop = scrollTop;
  const powerHost = document.getElementById('mission-power');
  const ownedTurrets = TURRET_ORDER.filter((id) => save.unlockedTurrets.includes(id));
  if (!forgeSquad || ![forgeSquad.main, forgeSquad.left, forgeSquad.right].every((id) => ownedTurrets.includes(id))) {
    forgeSquad = pickForgeSquad(ownedTurrets, turretLevel);
    forgeTitle = pickForgeTitle(forgeTitle);
  }
  renderPowerCore(powerHost, {
    done: gateProgress(save.trainingGate).done,
    total: GATE.questionsRequired,
    correct: lastTrainingAnswerCorrect,
    squad: forgeSquad,
    mainLevel: turretLevel(forgeSquad.main),
    title: forgeTitle,
  });
  renderSiegeStats(powerHost, state);
  const active = Object.entries(screens).find(([, el]) => el?.classList.contains('active'))?.[0];
  syncMissionControlAction(active || 'home');
}

/** @param {{ reroll?: boolean }} [opts] Changing level redraws Maths HQ but must keep the mission the player is looking at. */
function showHome(opts) {
  const host = document.getElementById('home-host');
  if (!host) return;
  const state = makeDashboardState();
  if (opts?.reroll !== false) rerollMissionArt();
  renderHome(host, state);
  forgeSquad = null;
  refreshMissionControl();
  renderTopbarBadges(document.getElementById('topbar-badges'), save.siegeRecord, { title: trophyTitle(save.title), onOpen: () => openProfile() });
  showScreen('home');
  showPendingStory();
  showPendingWeaponAnnouncement();
  scheduleTips('home');
}

/** Tips this screen could show now, in order: the opening tour first, then one-off moments. */
function tipsFor(where) {
  const seen = new Set(save.tips.seen);
  if (where === 'siege') return seen.has('siege') ? [] : ['siege'];
  const tour = TOUR_TIPS.filter((id) => !seen.has(id));
  if (tour.length) return tour;
  if (!seen.has('contact') && document.getElementById('btn-hold-line')) return ['contact'];
  if (!seen.has('crystal') && save.upgradeCores > 0) return ['crystal'];
  return [];
}

let tipsTimer = 0;

/** Show any due tips once the screen has settled and nothing else is on top. */
function scheduleTips(where, attempt = 0) {
  clearTimeout(tipsTimer);
  if (save.tips.off || attempt > 8) return;
  tipsTimer = window.setTimeout(() => {
    if (isCoachOpen() || save.tips.off) return;
    const onScreen = screens[where]?.classList.contains('active');
    const blocked = document.body.classList.contains('modal-open') || document.querySelector('.gb-sheet-backdrop');
    if (!onScreen) return;
    if (blocked) {
      scheduleTips(where, attempt + 1);
      return;
    }
    const ids = tipsFor(where);
    if (!ids.length) return;
    showCoachTips(ids, {
      onSeen(id) {
        if (!save.tips.seen.includes(id)) save.tips.seen.push(id);
        persistSave();
      },
      onTurnOff() {
        save.tips.off = true;
        persistSave();
      },
    });
  }, attempt === 0 ? 700 : 1500);
}

/** How to Play's "Show tips again". */
function replayTips() {
  save.tips = { off: false, seen: [] };
  persistSave();
  closeHowTo();
  if (screens.home?.classList.contains('active')) scheduleTips('home');
}

/** Level 3 and 4 players are offered more questions after their ten, for bonus time and coins. */
const STRETCH_MIN_LEVEL = 3;
const STRETCH_COINS_PER_ANSWER = 5;

/** @param {number} level @returns {{ more: number, seconds: number, coins: number }|null} */
function stretchOffer(level) {
  if (level < STRETCH_MIN_LEVEL) return null;
  const done = Math.max(0, save.trainingGate.questionsDone || 0);
  if (done < GATE.questionsRequired || done >= GATE.maxQuestions) return null;
  const target = done < 15 ? 15 : GATE.maxQuestions;
  return { more: target - done, seconds: target === 15 ? 15 : 30, coins: STRETCH_COINS_PER_ANSWER };
}

/** @param {{ special?: boolean }} [opts] A special mission doubles the Forge XP from its answers. */
function showBattlePrep(opts = {}) {
  const host = document.getElementById('battle-prep-host');
  if (!host) return;
  disposeActiveTraining?.();
  disposeActiveTraining = null;
  const level = getDifficultyLevel();
  const xpBoost = opts.special ? SPECIAL_MISSION_XP_MULTIPLIER : 1;
  if (opts.special) {
    window.setTimeout(() => showPop('<img class="gear-pop-art" src="assets/ui/alien-crystal.png" alt="" />', 'SPECIAL MISSION!', `${SPECIAL_MISSION_XP_MULTIPLIER}× Forge XP for every right answer`), 300);
  }
  let prepRecorded = false;
  disposeActiveTraining = initBattlePrep(host, {
    level,
    cycle: save.trainingGate.cycle,
    questionsNeeded: GATE.questionsRequired - gateProgress(save.trainingGate).done,
    remainingNeeded: () => GATE.questionsRequired - gateProgress(save.trainingGate).done,
    stretchOffer: () => stretchOffer(level),
    onAwardXp(baseAmount) {
      awardScaledTrainingXp(baseAmount * xpBoost, level);
    },
    onAnswer: (right, moduleId) => creditMixedAnswer(right, moduleId, level),
    onFinished() {
      // A random mission asks only one or two questions per topic, so it does not count towards
      // map sectors or level shields; those need a full topic drill or Maths Quest.
      if (prepRecorded) return;
      prepRecorded = true;
      battlePrepCoinBonus = save.trainingGate.bonusSiegeCoins;
      persistSave();
      refreshMissionControl();
      showToast(`Battle Prep logged · ${battlePrepCoinBonus} bonus siege coins`, { variant: 'success' });
    },
    onReady() {
      disposeActiveTraining?.();
      disposeActiveTraining = null;
      beginMission();
    },
    onHome: () => disposeTrainingAndGoHome(showHome),
    showToast,
  });
  showScreen('battlePrep');
}

/** One answer from a mixed run (Battle Prep or a zap run), credited like any other maths answer. */
function creditMixedAnswer(right, moduleId, level) {
  if (right) audio.playCorrect();
  else audio.playWrong();
  trackAnswerStreak(right);
  if (right) creditEngagementAnswer(moduleId, level);
  creditTopicAnswer(moduleId, level, right);
  creditTrainingAnswer(right);
}

/** Right answers still worth having: scouts left to zap, and extra answers left to earn coins with. */
function zapsLeft() {
  const horde = currentHorde();
  return Math.min(horde.zapCap - horde.zapped, currentWarChest().extraLeft);
}

/**
 * Once a siege is earned: a short mixed run that zaps scouts out of the horde and fills the war chest.
 * It runs until the scouts are all zapped; once there are none left to zap, it is a run for coins.
 */
function showZapRun() {
  const host = document.getElementById('battle-prep-host');
  const zapping = zapsLeft() > 0;
  const remaining = zapping ? zapsLeft : () => currentWarChest().extraLeft;
  if (!host || remaining() <= 0) return;
  disposeActiveTraining?.();
  disposeActiveTraining = null;
  const level = getDifficultyLevel();
  disposeActiveTraining = initBattlePrep(host, {
    mode: 'zap',
    level,
    cycle: save.trainingGate.cycle,
    questionsNeeded: remaining(),
    remainingNeeded: remaining,
    doneTitle: (right) => (zapping
      ? `${right} scout${right === 1 ? '' : 's'} zapped!`
      : `+${right * STRETCH_COINS_PER_ANSWER} coins for the war chest!`),
    onAwardXp: (baseAmount) => awardScaledTrainingXp(baseAmount, level),
    onAnswer: (right, moduleId) => creditMixedAnswer(right, moduleId, level),
    onFinished() {
      persistSave();
      refreshMissionControl();
    },
    onReady: goToTheAction,
    onHome: () => disposeTrainingAndGoHome(showHome),
    showToast,
  });
  showScreen('battlePrep');
}

function showTimesTables() {
  const host = document.getElementById('times-tables-host');
  if (!host) return;
  const training = createTrainingHandlers('times-tables');
  initTimesTables(host, {
    playerName: save.playerName || 'Recruit',
    completedTables: save.trainingGate.timesTablesDone,
    difficultyLevel: training.difficultyLevel,
    onAwardXp: training.onAwardXp,
    onAnswer: training.onAnswer,
    onSessionComplete({ table, accuracy, passed }) {
      training.onSessionComplete(accuracy);
      if (passed) {
        const result = recordTimesTable(save.trainingGate, table, accuracy);
        if (result.added) persistGate(result.gate);
      }
      return {
        gateAdded: isGateOpen(save.trainingGate),
        reason: isGateOpen(save.trainingGate)
          ? 'Siege unlocked — return to HQ!'
          : 'Your maths progress has been saved.',
      };
    },
    onHome: training.onHome,
    siegeReady: training.siegeReady,
    onAction: training.onAction,
    showToast: training.showToast,
  });
  showScreen('timesTables');
}

/** @type {(() => void)|null} */
let disposeActiveTraining = null;

function disposeTrainingAndGoHome(onHome) {
  disposeActiveTraining?.();
  disposeActiveTraining = null;
  onHome();
}

function showMeasurementLength() {
  const host = document.getElementById('measurement-host');
  if (!host) return;
  disposeActiveTraining?.();
  disposeActiveTraining = null;
  const topic = getTopic('measurement-length');
  const training = createTrainingHandlers('measurement-length');
  disposeActiveTraining = initMeasurementLength(host, {
    difficultyLevel: training.difficultyLevel,
    unitDone: topic?.unitId ? isUnitDone(save.trainingGate, topic.unitId) : false,
    onAwardXp: training.onAwardXp,
    onAnswer: training.onAnswer,
    onSessionComplete({ accuracy, passed }) {
      training.onSessionComplete(accuracy);
      if (passed) creditGateModule('measurement-length', accuracy);
    },
    onHome: () => disposeTrainingAndGoHome(training.onHome),
    siegeReady: training.siegeReady,
    onAction: training.onAction,
    showToast: training.showToast,
  });
  showScreen('measurement');
}

function showFractions() {
  const host = document.getElementById('fractions-host');
  if (!host) return;
  disposeActiveTraining?.();
  disposeActiveTraining = null;
  const training = createTrainingHandlers('fractions');
  disposeActiveTraining = initFractions(host, {
    difficultyLevel: training.difficultyLevel,
    onAwardXp: training.onAwardXp,
    onAnswer: training.onAnswer,
    onSessionComplete({ accuracy }) {
      training.onSessionComplete(accuracy);
      creditGateModule('fractions', accuracy);
    },
    onHome: () => disposeTrainingAndGoHome(training.onHome),
    siegeReady: training.siegeReady,
    onAction: training.onAction,
    showToast: training.showToast,
  });
  showScreen('fractions');
}

function showAnglesShapes() {
  const host = document.getElementById('angles-host');
  if (!host) return;
  disposeActiveTraining?.();
  disposeActiveTraining = null;
  const training = createTrainingHandlers('angles');
  disposeActiveTraining = initAnglesShapes(host, {
    difficultyLevel: training.difficultyLevel,
    onAwardXp: training.onAwardXp,
    onAnswer: training.onAnswer,
    onSessionComplete({ accuracy }) {
      training.onSessionComplete(accuracy);
      creditGateModule('angles', accuracy);
    },
    onHome: () => disposeTrainingAndGoHome(training.onHome),
    siegeReady: training.siegeReady,
    onAction: training.onAction,
    showToast: training.showToast,
  });
  showScreen('angles');
}

function showMathsQuest() {
  const host = document.getElementById('maths-quest-host');
  if (!host) return;
  disposeActiveTraining?.();
  disposeActiveTraining = null;
  const training = createTrainingHandlers('maths-quest');
  disposeActiveTraining = initMathsQuest(host, {
    difficultyLevel: training.difficultyLevel,
    onAwardXp: training.onAwardXp,
    onAnswer: training.onAnswer,
    onSessionComplete(accuracy) {
      training.onSessionComplete(accuracy);
      creditGateModule('maths-quest', accuracy);
      if (accuracy >= MATHS_QUEST.accuracyBonusThreshold) {
        awardUpgradeCore('MATHS QUEST CLEARED');
        challengeEvent('quest80');
      }
    },
    onHome: () => disposeTrainingAndGoHome(training.onHome),
    siegeReady: training.siegeReady,
    onAction: training.onAction,
    showToast: training.showToast,
  });
  showScreen('mathsQuest');
}

function showExpandedMath(topicId) {
  const host = document.getElementById('expanded-host');
  const topic = getTopic(topicId);
  if (!host || !topic) return;
  disposeActiveTraining?.();
  disposeActiveTraining = null;
  const training = createTrainingHandlers(topicId);
  disposeActiveTraining = initExpandedMath(host, {
    topicId,
    difficultyLevel: training.difficultyLevel,
    onAwardXp: training.onAwardXp,
    onAnswer: training.onAnswer,
    onSessionComplete({ accuracy }) {
      training.onSessionComplete(accuracy);
    },
    onHome: () => disposeTrainingAndGoHome(training.onHome),
    siegeReady: training.siegeReady,
    onAction: training.onAction,
    showToast: training.showToast,
  });
  showScreen('expanded');
}

/** @param {string} topicId @param {number} accuracy 0–1 @returns {boolean} */
function creditGateModule(topicId, accuracy) {
  if (accuracy < GATE.passAccuracy) return false;
  const topic = getTopic(topicId);
  if (!topic?.unitId) return false;
  const result = recordTopicUnit(save.trainingGate, topic.id, topic.unitId);
  if (result.added) {
    persistGate(result.gate);
    showToast(`${topic.title} pushed the attack back!`, { variant: 'success' });
    return true;
  }
  return false;
}

/** @param {import('./topics-data.js').MathTopic} topic @returns {boolean} */
function creditTopicTraining(topic) {
  return creditGateModule(topic.id, 1);
}

/** @param {import('./topics-data.js').MathTopic} topic */
function showForgeTraining(topic) {
  // This one-puzzle forge has a larger XP reward; credit it only once per siege.
  if (isTopicDone(save.trainingGate, topic.id)) {
    showToast('Place Value already rewarded this siege. Try another maths mission or defend Granny!');
    return;
  }
  const forgeHost = document.getElementById('forge-host');
  if (!forgeHost) return;
  const mission = getActiveMission();
  if (!mission) return;
  initForge(forgeHost, {
    mission,
    difficultyLevel: getDifficultyLevel(),
    trainingMode: true,
    onBack: showHome,
    showToast,
    onSuccess(rewards) {
      const level = getDifficultyLevel();
      const scaled = scaleTrainingXp(rewards.forgeXp, level);
      if (scaled > 0) {
        awardForgeXp(scaled, `Place Value · ${xpMultiplierLabel(level)}`);
      }
      creditTopicAnswer('place-value-siege', level, true);
      completeTrainingSession('place-value-siege', level, 1);
      if (!creditTopicTraining(topic) && !isTopicDone(save.trainingGate, topic.id)) {
        showToast('Training finished, but it did not count toward the gate — try again.', { variant: 'shop' });
      }
      showHome();
    },
  });
  showScreen('forge');
}

function startWelcome() {
  const input = document.getElementById('player-name');
  if (input && save.playerName) input.value = save.playerName;
  preloadDeployAssets({ unlocked: getUnlockedSet(), grannyUnlocked: save.grannyUnlocked });
  showScreen('welcome');
}

function initSiegeScreen() {
  tdEngine?.destroy();
  tdEngine = null;

  shopBarEl = document.getElementById('shop-bar');
  const canvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById('siege-canvas'));
  const mission = getActiveMission();
  if (!shopBarEl || !canvas || !mission) return;

  shopState = {
    budget: run.waveBudget,
    persistentXp: save.xp,
    unlocked: getUnlockedSet(),
    selectedId: run.selectedTurret,
    onSelect: selectTurret,
    onUnlock: tryUnlockTurret,
    showToast,
    maze: !DEV.lanes,
  };

  renderShopBar(shopBarEl, shopState);
  if (!DEV.lanes) scheduleTips('siege');
  deploymentTurretsPlaced = 0;
  bonusBankProtected = 0;
  document.querySelector('.siege-layout')?.classList.remove('is-bonus-offer', 'is-battle-done');
  const deployPanel = document.getElementById('siege-deploy-panel');
  if (deployPanel) deployPanel.hidden = false;
  const bonusPanel = document.getElementById('siege-bonus-panel');
  if (bonusPanel) bonusPanel.hidden = true;

  previousBattleCry = nextBattleCry(Math.random(), previousBattleCry);
  const launch = document.getElementById('btn-launch-siege');
  if (launch) launch.textContent = previousBattleCry;
  mountTDEngine(canvas, mission);
  selectTurret('granny-blaster');
  tdEngine?.setGoLive(false);
  refreshDeploymentPanel();
  preloadField()
    .then(() => tdEngine?.relayout?.())
    .catch(() => {});
}

function beginMission() {
  audio.warmUp();
  if (!DEV.skipForge && !isGateOpen(save.trainingGate)) {
    showToast('The attack is still coming — finish your drills first!');
    showHome();
    return;
  }

  run = {
    waveBudget: 0,
    runForgeXpEarned: 0,
    startCoins: 0,
    selectedTurret: null,
    cacheProgress: 0,
  };
  nukeCacheWasReady = false;

  // Earning ten maths-question credits is the complete gate. Don't add
  // another mandatory forge puzzle after the child has earned a siege.
  if (DEV.skipForge || isGateOpen(save.trainingGate)) {
    const mission = getActiveMission();
    onForgeSuccess({
      forgeXp: 0,
      placementBudget: mission
        ? startingSiegeCoins(mission, save.siegesCompleted, save.trainingGate.bonusSiegeCoins) + DEV.extraBudget
        : 90 + DEV.extraBudget,
    });
    return;
  }

  const forgeHost = document.getElementById('forge-host');
  const mission = getActiveMission();
  if (forgeHost && mission) {
    initForge(forgeHost, { mission, difficultyLevel: getDifficultyLevel(), onSuccess: onForgeSuccess, showToast });
  }
  showScreen('forge');
}

function onForgeSuccess(rewards) {
  const level = getDifficultyLevel();
  const mission = getActiveMission();
  const baseForgeXp = rewards.forgeXp ?? mission?.rewards.forgeXp ?? 40;
  const forgeXp = scaleTrainingXp(baseForgeXp, level);
  const placementBudget = rewards.placementBudget ?? mission?.rewards.placementBudget ?? 90;

  const startCoins = placementBudget + gearEffects(save.gear).extraStartCoins + save.stretchCoins;
  save.stretchCoins = 0;
  run.waveBudget = startCoins;
  run.startCoins = startCoins;
  run.runForgeXpEarned = forgeXp;
  run.selectedTurret = null;
  battlePrepCoinBonus = 0;
  // The normal maths-to-siege route skips the old Place Value forge.
  // Only award its one-question credit when the puzzle was actually played.
  if (forgeXp > 0) {
    creditForgeXp(forgeXp);
    creditTopicAnswer('place-value-siege', level, true);
    completeTrainingSession('place-value-siege', level, 1);
    const placeValueTopic = getTopic('place-value-siege');
    if (placeValueTopic) creditTopicTraining(placeValueTopic);
  }
  const xpLine =
    forgeXp > 0
      ? `+${forgeXp} ${ECONOMY.forgeXpLabel} (unlocks gear) · `
      : 'Maths mission cleared · ';
  showToast(`${xpLine}${startCoins} ${ECONOMY.siegeCoinsLabel} for this fight.`);
  if (save.grannyUnlocked) {
    addCacheProgress(GRANNY_CACHE.forgeBonusPoints);
  }
  showScreen('siege');
  initSiegeScreen();
}

/** Dev / QA — jump to siege with budget, no forge or training side effects. */
function launchTestSiege() {
  tdEngine?.destroy();
  tdEngine = null;

  const mission = getActiveMission();
  const placementBudget = (mission ? startingSiegeCoins(mission, save.siegesCompleted) : 90) + DEV.extraBudget;

  run = {
    waveBudget: placementBudget,
    runForgeXpEarned: 0,
    startCoins: placementBudget,
    selectedTurret: null,
    cacheProgress: 0,
  };
  nukeCacheWasReady = false;

  preloadDeployAssets({ unlocked: getUnlockedSet(), grannyUnlocked: save.grannyUnlocked });
  showScreen('siege');
  initSiegeScreen();
  if (save.activeChallenge) {
    const { from, score } = save.activeChallenge;
    window.setTimeout(() => showPop('🤝', 'CHALLENGE ON!', `Beat ${from || 'your friend'}’s ${score} aliens!`), 600);
  }
}

/** A lost heart explodes: a flash, the red heart swelling and popping, and shards flying out in a ring. */
const HEART_BURST = `<span class="heart-burst">
  <span class="heart-burst-flash"></span>
  <span class="heart-burst-ring"></span>
  <span class="heart-burst-core">❤️</span>
  ${Array.from({ length: 12 }, (_, i) => `<span class="heart-shard" style="--a:${i * 30 + (i % 2) * 12}deg;--d:${44 + (i % 3) * 16}px"></span>`).join('')}
</span>`;

/**
 * Granny's porch: one heart per alien she can afford to let through. Each leak blows a heart up,
 * shakes the meter and flashes the field red, so kids always see it happen.
 * @param {number} leaks @param {number} max @param {boolean} [hit]
 */
function renderLeakMeter(leaks, max, hit = false) {
  const el = document.getElementById('leak-meter');
  if (!el) return;
  const left = Math.max(0, max - leaks);
  el.innerHTML = `<span class="leak-meter-label">PORCH</span>${Array.from({ length: max }, (_, i) => {
    const breaking = hit && i === left;
    return `<span class="leak-heart${i < left ? '' : ' is-lost'}${breaking ? ' is-breaking' : ''}" aria-hidden="true"><span class="leak-heart-glyph">${i < left ? '❤️' : '🖤'}</span>${breaking ? HEART_BURST : ''}</span>`;
  }).join('')}`;
  el.setAttribute('aria-label', `${left} of ${max} porch hearts left`);
  el.classList.toggle('is-danger', left <= 2);
  if (!hit) return;
  audio.playHeartBurst();
  el.classList.remove('is-hit');
  void el.offsetWidth;
  el.classList.add('is-hit');
  const wrap = el.closest('.siege-canvas-wrap');
  wrap?.classList.remove('is-leak-flash');
  void wrap?.offsetWidth;
  wrap?.classList.add('is-leak-flash');
}

function mountTDEngine(canvas, mission) {
  if (tdEngine) return;

  audio.warmUp();
  nukeCacheWasReady = false;
  const gearFx = gearEffects(save.gear);
  renderLeakMeter(0, (mission?.maxLeaks ?? 5) + gearFx.extraLeaks);
  tdEngine = createTDEngine(canvas, {
    maze: !DEV.lanes,
    mission: {
      ...mission,
      maxLeaks: (mission?.maxLeaks ?? 5) + gearFx.extraLeaks,
      siegeDurationSec: (mission?.siegeDurationSec ?? SIEGE_DURATION_SEC) + gearFx.extraSeconds,
    },
    nukeBoost: { damage: gearFx.nukeDamageMul, aoe: gearFx.nukeAoeMul, salvo: gearFx.nukeSalvoMul },
    firstSiege: save.siegesCompleted === 0,
    hordeRank: siegeRankLevel(save.siegeRecord),
    zapped: currentHorde().zapped,
    bonusSiegeSec: bonusSiegeSeconds(save.trainingGate),
    onBonusOffer: showBonusAssaultOffer,
    spawnGranddaddy: shouldSpawnGranddaddy(save),
    grannyEnabled: () => save.grannyUnlocked,
    onGranddaddySpawn() {
      onGranddaddySpawned(save);
      persistSave();
      showToast('Granddaddy?! Fill the nuke cache, then hit Fire nukes!');
      updateNukeCachePanel();
      tdEngine?.relayout?.();
    },
    onCupcakeUsed() {
      updateNukeCachePanel();
    },
    onCupcakeFinished() {
      updateNukeCachePanel();
    },
    onNukeStateChange() {
      updateNukeCachePanel();
    },
    getBudget: () => run.waveBudget,
    trySpend: (type) => {
      if (type !== 'hedge' && !isUnlocked(type)) {
        showToast(`Unlock that turret with ${ECONOMY.forgeXpLabel} first.`, { variant: 'shop' });
        return false;
      }
      const cost = type === 'hedge' ? HEDGE.placementCost : TURRETS[type]?.placementCost ?? 0;
      if (run.waveBudget < cost) {
        showToast(`Need ${cost} ${ECONOMY.siegeCoinsLabel} to place that.`, { variant: 'warn' });
        return false;
      }
      run.waveBudget -= cost;
      refreshShop();
      refreshDeploymentPanel();
      return true;
    },
    onKillReward({ xp, isBoss, screenX, screenY }) {
      run.waveBudget += Math.round(xp * gearEffects(save.gear).coinMultiplier);
      refreshShop();
      addCacheProgress(isBoss ? GRANNY_CACHE.bossKillPoints : GRANNY_CACHE.killPoints);
      if (isBoss) {
        awardUpgradeCore('BOSS DEFEATED', { x: screenX, y: screenY });
        save.records.bosses += 1;
        challengeEvent('boss');
      }
    },
    onEnemyDestroyed({ key }) {
      save.enemyDefeated = recordEnemyDefeat(save.enemyDefeated, key);
      persistSave();
    },
    onWaveCleared({ wave, remaining = 0 }) {
      const bonus = mission.waveClearBudgetXp ?? 10;
      run.waveBudget += bonus;
      refreshShop();
      addCacheProgress(GRANNY_CACHE.waveClearPoints);
      const msg = remaining
        ? `Wave ${wave} survived! +${bonus} ${ECONOMY.siegeCoinsLabel} — ${remaining} still in the maze!`
        : `Wave ${wave} cleared! +${bonus} ${ECONOMY.siegeCoinsLabel} — reinforce the lawn!`;
      showToast(msg, {
        variant: 'success',
      });
    },
    onLeak({ leaks, maxLeaks, penalty }) {
      renderLeakMeter(leaks, maxLeaks, true);
      run.waveBudget = Math.max(0, run.waveBudget - penalty);
      refreshShop();
      showToast(`Leak! −${penalty} ${ECONOMY.siegeCoinsLabel} (${leaks}/${maxLeaks})`, { variant: 'warn' });
    },
    onTowerRemoved({ refund }) {
      if (refund > 0) {
        run.waveBudget += refund;
        refreshShop();
        refreshDeploymentPanel();
      }
      showToast(refund > 0 ? `Removed — ${refund} ${ECONOMY.siegeCoinsLabel} back.` : 'Removed.', { variant: 'shop' });
    },
    onTurretPlaced() {
      if (tdEngine?.getPhase() === 'deploy') {
        deploymentTurretsPlaced += 1;
        refreshDeploymentPanel();
        if (deploymentTurretsPlaced === 1) showToast('Nice! Keep placing turrets or hit the big battle button.', { variant: 'success' });
      }
    },
    onPhaseChange(phase) {
      const layout = document.querySelector('.siege-layout');
      layout?.classList.toggle('is-bonus-offer', phase === 'bonus-offer');
      layout?.classList.toggle('is-battle-done', phase === 'done' || phase === 'finale');
      if (phase === 'deploy' || phase === 'wave' || phase === 'announce') {
        setShopActive(true);
      } else {
        setShopActive(false);
      }
      updateNukeCachePanel();
    },
    showToast,
    audio,
    onMissionEnd(stats) {
      finishRun(stats);
    },
  });

  if (run.selectedTurret && isUnlocked(run.selectedTurret)) {
    tdEngine.setSelectedType(run.selectedTurret);
  }

  setShopActive(true);
  updateNukeCachePanel();
  if (getFieldImage()) {
    showToast(`${ECONOMY.forgeXpLabel} unlocks turrets forever. ${ECONOMY.siegeCoinsLabel} only last this siege!`, {
      variant: 'shop',
    });
  }
}

function finishRun(stats) {
  const mission = getActiveMission();
  const missionId = SLICE_MISSION_ID;
  const bonus = stats.won ? (mission?.winBonusXp ?? 60) : (mission?.loseBonusXp ?? 20);
  // Taking the optional challenge can never reduce the original victory's banked reward.
  const bankedCoins = stats.bonusPlayed ? Math.max(run.waveBudget, bonusBankProtected) : run.waveBudget;
  const bankBonus = bankBonusForgeXp(bankedCoins);
  const bonusAssaultXp = stats.bonusPlayed ? Math.min(50, (stats.bonusKills || 0) * 2) : 0;

  run.runForgeXpEarned += bonus + bankBonus + bonusAssaultXp;
  creditForgeXp(bonus + bankBonus + bonusAssaultXp);

  const starResult = computeStars({
    won: stats.won,
    leaks: stats.leaks,
    maxLeaks: stats.maxLeaks,
    wavesCleared: stats.wavesCleared ?? 0,
  });
  const prevBestStars = save.bestStars[missionId] ?? 0;
  const prevBestKills = save.bestKills[missionId] ?? 0;

  const brag = computeBragHeadline({
    stats,
    starResult,
    prevBestKills,
    prevBestStars,
  });

  if (starResult.stars > prevBestStars) save.bestStars[missionId] = starResult.stars;
  if (stats.kills > prevBestKills) save.bestKills[missionId] = stats.kills;
  const prevBestBanked = save.bestBankedCoins[missionId] ?? 0;
  if (bankedCoins > prevBestBanked) save.bestBankedCoins[missionId] = bankedCoins;
  if (stats.won && !save.completedMissions.includes(missionId)) {
    save.completedMissions.push(missionId);
  }
  save.siegesCompleted += 1;
  const prevRankLevel = siegeRankLevel(save.siegeRecord);
  save.siegeRecord = recordSiege(save.siegeRecord, starResult.earned);
  save.trainingGate = resetTrainingGate(save.trainingGate);
  persistSave();

  const headlineEl = document.getElementById('results-headline');
  const sublineEl = document.getElementById('results-subline');
  if (headlineEl) headlineEl.textContent = brag.headline;
  if (sublineEl) {
    const xpParts = [`+${bonus} ${ECONOMY.forgeXpLabel} from the fight`];
    if (bankBonus > 0) {
      xpParts.push(`+${bankBonus} from banked ${ECONOMY.siegeCoinsLabel}`);
    }
    if (stats.bonusPlayed) {
      xpParts.push(`+${bonusAssaultXp} XP from ${stats.bonusKills || 0} bonus-assault kills`);
    }
    sublineEl.textContent = `${brag.subline} ${stats.bonusPlayed ? 'BONUS ASSAULT COMPLETED! The original win was protected. ' : ''}${xpParts.join(' · ')}.`;
  }

  const badgesEl = document.getElementById('results-badges');
  if (badgesEl) badgesEl.innerHTML = renderRankResult(save.siegeRecord, prevRankLevel, badgeSrc);
  renderResultsExtras(document.getElementById('results-extras'), recordSiegeEngagement(stats, prevBestKills));

  const maxLeaksEl = document.getElementById('results-max-leaks');
  if (maxLeaksEl) maxLeaksEl.textContent = '0';

  document.getElementById('results-kills').textContent = '0';
  document.getElementById('results-leaks').textContent = '0';
  document.getElementById('results-forge-xp').textContent = '0';
  document.getElementById('results-coins-left').textContent = '0';
  const bestEl = document.getElementById('results-best');
  if (bestEl) bestEl.textContent = '0';

  const nextGoalEl = document.getElementById('results-next-goal');
  const nextGoal = computeNextGoal({ save, missionId, stats });
  if (nextGoalEl) {
    renderNextGoal(nextGoalEl, nextGoal);
  }

  showScreen('results');

  animateResultsStats({
    kills: stats.kills,
    leaks: stats.leaks,
    forgeXp: run.runForgeXpEarned,
    coins: bankedCoins,
    best: save.bestKills[missionId],
    maxLeaks: stats.maxLeaks,
  });

  if (nextGoalEl) {
    const fillEl = nextGoalEl.querySelector('.next-goal-progress-fill');
    const progressText = nextGoalEl.querySelector('.next-goal-progress-text');
    animateProgressFill(fillEl, nextGoal.progress, { delay: 720, duration: 950 });

    const pairMatch = nextGoal.progressLabel.match(/^([\d,]+)\s*\/\s*([\d,]+)(.*)$/);
    if (pairMatch && progressText) {
      animateTallyPair(
        progressText,
        Number(pairMatch[1].replace(/,/g, '')),
        Number(pairMatch[2].replace(/,/g, '')),
        { delay: 720, duration: 950, suffix: pairMatch[3] ?? '' }
      );
    }
  }
}

/**
 * Browsers only allow fullscreen from a click or key press, so the first one of each visit
 * switches to fullscreen. If the player leaves it with Esc, the game does not force them back.
 */
function enterFullscreenOnFirstTap() {
  const root = document.documentElement;
  const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
  if (!request) return;
  const go = () => {
    window.removeEventListener('pointerdown', go, true);
    window.removeEventListener('keydown', go, true);
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    try {
      const result = request.call(root);
      result?.catch?.(() => {});
    } catch {
      /* Some browsers refuse inside an embedded frame; the game simply stays windowed. */
    }
  };
  window.addEventListener('pointerdown', go, true);
  window.addEventListener('keydown', go, true);
}

function bindUI() {
  initPopups();
  enterFullscreenOnFirstTap();

  document.getElementById('topbar-streak')?.addEventListener('click', () => showStreakPanel(streakStatus(save.streak)));
  document.getElementById('topbar-daily')?.addEventListener('click', () => showDailyPanel(dailyState()));

  document.getElementById('btn-launch-siege')?.addEventListener('click', () => {
    if (deploymentTurretsPlaced < 1) {
      showToast('Place at least one turret before challenging the aliens!');
      return;
    }
    if (!tdEngine?.startWave()) return;
    const panel = document.getElementById('siege-deploy-panel');
    if (panel) panel.hidden = true;
    showToast('HERE THEY COME! Protect Granny!', { variant: 'success' });
  });

  document.getElementById('btn-bonus-accept')?.addEventListener('click', () => resolveBonusAssault(true));
  document.getElementById('btn-bonus-decline')?.addEventListener('click', () => resolveBonusAssault(false));

  document.getElementById('btn-welcome-go')?.addEventListener('click', () => {
    audio.warmUp();
    const input = /** @type {HTMLInputElement|null} */ (document.getElementById('player-name'));
    const name = input?.value.trim();
    if (!name) {
      showToast('Tell Granny your name first.');
      return;
    }
  save.playerName = name;
  persistSave();
  preloadDeployAssets({ unlocked: getUnlockedSet(), grannyUnlocked: save.grannyUnlocked });
  showHome();
  });

  document.getElementById('btn-fire-nukes')?.addEventListener('click', () => {
    audio.warmUp();
    if (run.cacheProgress < GRANNY_CACHE.cost) {
      showToast('Nuke cache not full yet — keep blasting!');
      return;
    }
    if (tdEngine?.fireNukes()) {
      run.cacheProgress -= GRANNY_CACHE.cost;
      showToast('Nukes away!', { variant: 'success' });
      save.records.nukes += 1;
      challengeEvent('nuke');
      updateNukeCachePanel();
    }
  });

  document.getElementById('btn-speed')?.addEventListener('click', (e) => {
    const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
    const speeds = [1, 2, 3];
    const cur = Number(btn.dataset.speed) || 1;
    const next = speeds[(speeds.indexOf(cur) + 1) % speeds.length];
    btn.dataset.speed = String(next);
    btn.textContent = `${next}× SPEED`;
    tdEngine?.setSpeed(next);
  });

  document.getElementById('btn-results-done')?.addEventListener('click', () => {
    showHome();
  });

  document.getElementById('btn-sound')?.addEventListener('click', () => {
    audio.warmUp();
    toggleSound();
  });

  document.getElementById('btn-howto')?.addEventListener('click', () => {
    openHowTo();
  });

  document.getElementById('topbar-cores-pill')?.addEventListener('click', () => {
    openArmory();
  });

  if (DEV.enabled) {
    document.body.classList.add('dev-mode');
    const actions = document.querySelector('.topbar-actions');
    const devBtn = document.createElement('button');
    devBtn.type = 'button';
    devBtn.className = 'btn btn-ghost btn-sm dev-play-btn';
    devBtn.textContent = 'Test siege';
    devBtn.setAttribute('aria-label', 'Skip to siege (dev)');
    devBtn.addEventListener('click', () => {
      launchTestSiege();
      showToast('Dev: siege loaded.', { variant: 'success' });
    });
    actions?.insertBefore(devBtn, actions.firstChild);
    showToast(DEV.skipToSiege ? 'Dev mode — loading siege…' : 'Dev mode on.');
  }
}

// ?tips replays the onboarding tips from the start (for testing).
if (new URLSearchParams(location.search).has('tips')) {
  save.tips = { off: false, seen: [] };
  persistSave();
}

bindUI();
checkNewTrophies({ quiet: true });
if (DEV.skipToSiege) {
  if (!save.playerName) save.playerName = 'Dev';
  launchTestSiege();
} else if (save.playerName) {
  preloadDeployAssets({ unlocked: getUnlockedSet(), grannyUnlocked: save.grannyUnlocked });
  showHome();
} else {
  startWelcome();
}
