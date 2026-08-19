import { getMissionForDifficulty, SLICE_MISSION_ID } from './missions-data.js?v=20260819b';
import { initForge } from './forge.js';
import { renderShopBar, updateShopBar } from './shop.js';
import { renderArmory, nextUnlockableTurret } from './armory.js';
import { createTDEngine } from './td-engine.js';
import { TURRETS, STARTER_TURRETS } from './turrets-data.js';
import { createAudio } from './audio.js';
import { DEV } from './dev.js';
import { normalizeMetaSave, shouldSpawnGranddaddy, onGranddaddySpawned } from './meta.js';
import { GRANNY_CACHE, cacheFillPercent } from './granny-cache.js';
import { ECONOMY, bankBonusForgeXp } from './economy.js';
import { computeStars, renderStarBadges } from './stars.js';
import { computeBragHeadline, computeNextGoal, renderNextGoal } from './progression.js';
import { preloadField, preloadDeployAssets, getFieldImage } from './preload.js';
import { animateResultsStats, animateProgressFill, animateTallyPair } from './tally.js';
import { renderHome, renderTopbarBadges } from './home.js';
import { initHowToPlay } from './how-to-play.js';
import { showToast, initPopups, openModal, closeModal } from './popups.js';
import { initTimesTables } from './times-tables.js?v=20260819b';
import { initMeasurementLength } from './measurement-length.js?v=20260819b';
import { initFractions } from './fractions.js?v=20260819b';
import { initAnglesShapes } from './angles-shapes.js?v=20260819b';
import { initMathsQuest } from './maths-quest.js?v=20260819b';
import { initExpandedMath } from './expanded-maths.js?v=20260819b';
import { initBattlePrep } from './battle-prep.js?v=20260819b';
import { normalizeDifficultyLevel, scaleTrainingXp, xpMultiplierLabel } from './difficulty.js';
import {
  normalizeLevelMastery,
  defaultLevelMastery,
  recordTrainingProgress,
  recommendModuleLevel,
  recommendGlobalLevel,
  MAP_PASSES_REQUIRED,
} from './level-mastery.js';
import { defaultMapProgress, normalizeMapProgress } from './map-progress.js';
import { getTopic } from './topics-data.js';
import {
  defaultTrainingGate,
  normalizeTrainingGate,
  isGateOpen,
  GATE,
  recordTimesTable,
  recordTopicUnit,
  resetTrainingGate,
  isUnitDone,
  isTopicDone,
  markBattlePrepComplete,
} from './training-gate.js';

const SAVE_KEY = 'grannyboom.siege.v1';

/** @typedef {{ version: number, playerName: string, xp: number, unlockedTurrets: string[], unlockedMissions: string[], completedMissions: string[], bestKills: Record<string, number>, bestBankedCoins: Record<string, number>, bestStars: Record<string, number>, siegesCompleted: number, granddaddySiegeTarget: number|null, granddaddySeen: boolean, grannyUnlocked: boolean, trainingGate: import('./training-gate.js').TrainingGate, levelMastery: import('./level-mastery.js').LevelMasterySave, mapProgress: import('./map-progress.js').MapProgressSave, settings: { sound: boolean, difficultyLevel: import('./difficulty.js').DifficultyLevel } }} SaveData */

/** @type {SaveData} */
const defaultSave = {
  version: 1,
  playerName: '',
  xp: 0,
  unlockedTurrets: [...STARTER_TURRETS],
  unlockedMissions: [SLICE_MISSION_ID],
  completedMissions: [],
  bestKills: {},
  bestBankedCoins: {},
  bestStars: {},
  siegesCompleted: 0,
  granddaddySiegeTarget: null,
  granddaddySeen: false,
  grannyUnlocked: false,
  trainingGate: defaultTrainingGate(),
  levelMastery: defaultLevelMastery(),
  mapProgress: defaultMapProgress(),
  settings: { sound: true, difficultyLevel: 3 },
};

/** @type {SaveData} */
let save = loadSave();

/** @type {{ waveBudget: number, runForgeXpEarned: number, startCoins: number, selectedTurret: string|null, cacheProgress: number }} */
let run = {
  waveBudget: 0,
  runForgeXpEarned: 0,
  startCoins: 0,
  selectedTurret: null,
  cacheProgress: 0,
};

let battlePrepCoinBonus = 0;

/** Tracks nuke-cache edge so the ready siren only fires once per fill. */
let nukeCacheWasReady = false;

/** @type {ReturnType<typeof createTDEngine>|null} */
let tdEngine = null;

/** @type {ReturnType<typeof createAudio>} */
const audio = createAudio({ getEnabled: () => save.settings.sound });

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

const xpDisplay = document.getElementById('topbar-xp');

/** @type {keyof typeof screens} */
let armoryReturnScreen = 'home';

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
      difficultyLevel: normalizeDifficultyLevel(data.settings?.difficultyLevel),
    };
    data.trainingGate = normalizeTrainingGate(data.trainingGate);
    data.levelMastery = normalizeLevelMastery(data.levelMastery);
    data.mapProgress = normalizeMapProgress(data.mapProgress);
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

function toggleSound() {
  save.settings.sound = !save.settings.sound;
  persistSave();
  refreshSoundButton();
  if (!save.settings.sound) audio.stopScuttling();
  const btn = document.getElementById('btn-sound');
  btn?.blur();
  showToast(save.settings.sound ? 'Blasters, booms, and Granny\'s porch rock are on.' : 'Game sounds are off.', {
    variant: 'info',
    title: save.settings.sound ? 'Sound on' : 'Sound muted',
    icon: save.settings.sound ? '🔊' : '🔇',
  });
}

function showScreen(id) {
  Object.entries(screens).forEach(([key, el]) => {
    el?.classList.toggle('active', key === id);
  });
  refreshTopbar();
}

function refreshSoundButton() {
  const btn = document.getElementById('btn-sound');
  if (btn) {
    btn.classList.toggle('is-muted', !save.settings.sound);
    btn.setAttribute('aria-label', save.settings.sound ? 'Mute sound' : 'Unmute sound');
  }
}

function refreshTopbar() {
  if (xpDisplay) xpDisplay.textContent = save.xp.toLocaleString();
  refreshSoundButton();
  renderTopbarBadges(document.getElementById('topbar-badges'), save.bestStars, SLICE_MISSION_ID);
  const armoryBtn = document.getElementById('btn-armory');
  if (armoryBtn) {
    armoryBtn.classList.toggle('topbar-armory-ready', Boolean(nextUnlockableTurret(save.xp, getUnlockedSet())));
  }
}

function renderArmoryScreen() {
  const host = document.getElementById('armory-host');
  if (!host) return;
  renderArmory(host, {
    xp: save.xp,
    unlocked: getUnlockedSet(),
    onUnlock(id) {
      const ok = tryUnlockTurret(id);
      if (ok) renderArmoryScreen();
      return ok;
    },
    onBack: closeArmory,
    showToast,
  });
}

function openArmory() {
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
  initHowToPlay(host, { onBack: closeHowTo });
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

function selectTurret(id) {
  if (!isUnlocked(id)) return;
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

function awardForgeXp(amount, reason) {
  if (amount <= 0) return;
  save.xp += amount;
  persistSave();
  if (reason) {
    showToast(`+${amount} ${ECONOMY.forgeXpLabel} · ${reason}`, { variant: 'success' });
  }
}

/** @param {number} baseAmount @param {import('./difficulty.js').DifficultyLevel} level */
function awardScaledTrainingXp(baseAmount, level) {
  const amount = scaleTrainingXp(baseAmount, level);
  if (amount <= 0) return 0;
  save.xp += amount;
  persistSave();
  return amount;
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
  persistSave();

  if (result.shieldEarned) {
    if (result.firstClearBonus > 0) {
      save.xp += result.firstClearBonus;
      persistSave();
      showToast(
        `Perfect! Level ${level} shield earned · +${result.firstClearBonus} ${ECONOMY.forgeXpLabel}`,
        { variant: 'success', duration: 4000 }
      );
    } else {
      showToast(`Perfect! Level ${level} shield earned!`, { variant: 'success', duration: 4000 });
    }
  }

  if (result.mapPieceEarned) {
    window.setTimeout(
      () =>
        showToast(`Map piece recovered! Sector charted (${MAP_PASSES_REQUIRED}/${MAP_PASSES_REQUIRED}).`, {
          variant: 'success',
          duration: 4500,
        }),
      result.shieldEarned ? 800 : 0
    );
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
    onSessionComplete(accuracy) {
      return completeTrainingSession(moduleId, level, accuracy);
    },
    onHome: showHome,
    showToast,
  };
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
  return getMissionForDifficulty(SLICE_MISSION_ID, getDifficultyLevel());
}

function showHome() {
  const host = document.getElementById('home-host');
  if (!host) return;
  renderHome(host, {
    playerName: save.playerName || 'Recruit',
    xp: save.xp,
    siegesCompleted: save.siegesCompleted,
    bestKills: save.bestKills[SLICE_MISSION_ID] ?? 0,
    bestBankedCoins: save.bestBankedCoins[SLICE_MISSION_ID] ?? 0,
    bestStars: save.bestStars,
    primaryMissionId: SLICE_MISSION_ID,
    gate: save.trainingGate,
    levelMastery: save.levelMastery,
    mapProgress: save.mapProgress,
    difficultyLevel: getDifficultyLevel(),
    recommendedLevel: recommendGlobalLevel(save.levelMastery),
    onDifficultyChange(level) {
      setDifficultyLevel(level);
      showHome();
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
      if (!DEV.skipForge && !isGateOpen(save.trainingGate)) {
        showBattlePrep();
        return;
      }
      beginMission();
    },
    showToast,
  });
  renderTopbarBadges(document.getElementById('topbar-badges'), save.bestStars, SLICE_MISSION_ID);
  showScreen('home');
}

function showBattlePrep() {
  const host = document.getElementById('battle-prep-host');
  if (!host) return;
  disposeActiveTraining?.();
  disposeActiveTraining = null;
  const level = getDifficultyLevel();
  let prepRecorded = false;
  disposeActiveTraining = initBattlePrep(host, {
    level,
    cycle: save.trainingGate.cycle,
    onAwardXp(baseAmount) {
      awardScaledTrainingXp(baseAmount, level);
    },
    onFinished(moduleResults, overall) {
      if (prepRecorded) return;
      prepRecorded = true;
      let mastery = save.levelMastery;
      let mapProgress = save.mapProgress;
      let shieldBonus = 0;
      let shieldsEarned = 0;
      let mapPiecesEarned = 0;
      for (const [moduleId, stats] of Object.entries(moduleResults)) {
        const result = recordTrainingProgress(mastery, mapProgress, moduleId, level, stats.accuracy);
        mastery = result.mastery;
        mapProgress = result.mapProgress;
        shieldBonus += result.firstClearBonus;
        if (result.shieldEarned) shieldsEarned += 1;
        if (result.mapPieceEarned) mapPiecesEarned += 1;
      }
      save.levelMastery = mastery;
      save.mapProgress = mapProgress;
      save.trainingGate = markBattlePrepComplete(save.trainingGate);
      if (shieldBonus > 0) save.xp += shieldBonus;
      battlePrepCoinBonus = Math.round(overall * 25);
      persistSave();
      const rewards = [
        `${battlePrepCoinBonus} bonus siege coins`,
        shieldsEarned > 0 ? `${shieldsEarned} shield${shieldsEarned === 1 ? '' : 's'}` : '',
        mapPiecesEarned > 0 ? `${mapPiecesEarned} map piece${mapPiecesEarned === 1 ? '' : 's'}` : '',
      ].filter(Boolean).join(' · ');
      showToast(`Battle Prep logged · ${rewards}`, { variant: 'success' });
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

function showTimesTables() {
  const host = document.getElementById('times-tables-host');
  if (!host) return;
  const training = createTrainingHandlers('times-tables');
  initTimesTables(host, {
    playerName: save.playerName || 'Recruit',
    completedTables: save.trainingGate.timesTablesDone,
    difficultyLevel: training.difficultyLevel,
    onAwardXp: training.onAwardXp,
    onSessionComplete({ table, accuracy, passed }) {
      training.onSessionComplete(accuracy);
      if (!passed) return { gateAdded: false };
      const result = recordTimesTable(save.trainingGate, table, accuracy);
      if (result.added) {
        persistGate(result.gate);
        showToast('Times Tables practice logged!', { variant: 'success' });
        return { gateAdded: true };
      }
      return { gateAdded: false, reason: 'Practice complete — Battle Prep opens the siege.' };
    },
    onHome: training.onHome,
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
    onSessionComplete({ accuracy, passed }) {
      training.onSessionComplete(accuracy);
      if (passed) creditGateModule('measurement-length', accuracy);
    },
    onHome: () => disposeTrainingAndGoHome(training.onHome),
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
    onSessionComplete({ accuracy }) {
      training.onSessionComplete(accuracy);
      creditGateModule('fractions', accuracy);
    },
    onHome: () => disposeTrainingAndGoHome(training.onHome),
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
    onSessionComplete({ accuracy }) {
      training.onSessionComplete(accuracy);
      creditGateModule('angles', accuracy);
    },
    onHome: () => disposeTrainingAndGoHome(training.onHome),
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
    onSessionComplete(accuracy) {
      training.onSessionComplete(accuracy);
      creditGateModule('maths-quest', accuracy);
    },
    onHome: () => disposeTrainingAndGoHome(training.onHome),
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
    onSessionComplete({ accuracy }) {
      training.onSessionComplete(accuracy);
    },
    onHome: () => disposeTrainingAndGoHome(training.onHome),
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
  if (isTopicDone(save.trainingGate, topic.id)) {
    showToast(`${topic.title} already counts this cycle — pick another topic or table!`);
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
  };

  renderShopBar(shopBarEl, shopState);
  mountTDEngine(canvas, mission);
  preloadField()
    .then(() => tdEngine?.relayout?.())
    .catch(() => {});

  tdEngine?.setGoLive(true);
  tdEngine?.startWave();
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

  const placeValueTopic = getTopic('place-value-siege');
  const forgeAlreadyDone = placeValueTopic ? isTopicDone(save.trainingGate, placeValueTopic.id) : false;

  if (DEV.skipForge || forgeAlreadyDone) {
    const mission = getActiveMission();
    onForgeSuccess({
      forgeXp: forgeAlreadyDone ? 0 : (mission?.rewards.forgeXp ?? 40),
      placementBudget: (mission?.rewards.placementBudget ?? 90) + DEV.extraBudget + battlePrepCoinBonus,
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

  run.waveBudget = placementBudget;
  run.startCoins = placementBudget;
  run.runForgeXpEarned = forgeXp;
  run.selectedTurret = null;
  battlePrepCoinBonus = 0;
  if (forgeXp > 0) {
    save.xp += forgeXp;
    persistSave();
  }
  completeTrainingSession('place-value-siege', level, 1);
  const placeValueTopic = getTopic('place-value-siege');
  if (placeValueTopic) {
    creditTopicTraining(placeValueTopic);
  }
  const xpLine =
    forgeXp > 0
      ? `+${forgeXp} ${ECONOMY.forgeXpLabel} (unlocks gear) · `
      : 'Forge already done this cycle · ';
  showToast(`${xpLine}${placementBudget} ${ECONOMY.siegeCoinsLabel} for this fight.`);
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
  const placementBudget = (mission?.rewards.placementBudget ?? 90) + DEV.extraBudget;

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
}

function mountTDEngine(canvas, mission) {
  if (tdEngine) return;

  audio.warmUp();
  nukeCacheWasReady = false;
  tdEngine = createTDEngine(canvas, {
    mission,
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
      if (!isUnlocked(type)) {
        showToast(`Unlock that turret with ${ECONOMY.forgeXpLabel} first.`, { variant: 'shop' });
        return false;
      }
      const cost = TURRETS[type]?.placementCost ?? 0;
      if (run.waveBudget < cost) {
        showToast(`Need ${cost} ${ECONOMY.siegeCoinsLabel} to place that.`, { variant: 'warn' });
        return false;
      }
      run.waveBudget -= cost;
      refreshShop();
      return true;
    },
    onKillReward({ xp, isBoss }) {
      run.waveBudget += xp;
      refreshShop();
      addCacheProgress(isBoss ? GRANNY_CACHE.bossKillPoints : GRANNY_CACHE.killPoints);
    },
    onWaveCleared({ wave }) {
      const bonus = mission.waveClearBudgetXp ?? 10;
      run.waveBudget += bonus;
      refreshShop();
      addCacheProgress(GRANNY_CACHE.waveClearPoints);
      showToast(`Wave ${wave} cleared! +${bonus} ${ECONOMY.siegeCoinsLabel} — reinforce the lawn!`, {
        variant: 'success',
      });
    },
    onLeak({ leaks, maxLeaks, penalty }) {
      run.waveBudget = Math.max(0, run.waveBudget - penalty);
      refreshShop();
      showToast(`Leak! −${penalty} ${ECONOMY.siegeCoinsLabel} (${leaks}/${maxLeaks})`, { variant: 'warn' });
    },
    onPhaseChange(phase) {
      if (phase === 'deploy' || phase === 'wave' || phase === 'announce') {
        setShopActive(true);
      } else if (phase === 'done') {
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
  const bankedCoins = run.waveBudget;
  const bankBonus = bankBonusForgeXp(bankedCoins);

  run.runForgeXpEarned += bonus + bankBonus;
  save.xp += bonus + bankBonus;

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
    sublineEl.textContent = `${brag.subline} ${xpParts.join(' · ')}.`;
  }

  const badgesEl = document.getElementById('results-badges');
  if (badgesEl) renderStarBadges(badgesEl, starResult);

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

function bindUI() {
  initPopups();

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
      updateNukeCachePanel();
    }
  });

  document.getElementById('btn-speed')?.addEventListener('click', (e) => {
    const btn = /** @type {HTMLButtonElement} */ (e.currentTarget);
    const speeds = [1, 2, 3];
    const cur = Number(btn.dataset.speed) || 1;
    const next = speeds[(speeds.indexOf(cur) + 1) % speeds.length];
    btn.dataset.speed = String(next);
    btn.textContent = `${next}×`;
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

  document.getElementById('btn-armory')?.addEventListener('click', () => {
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

bindUI();
if (DEV.skipToSiege) {
  if (!save.playerName) save.playerName = 'Dev';
  launchTestSiege();
} else if (save.playerName) {
  preloadDeployAssets({ unlocked: getUnlockedSet(), grannyUnlocked: save.grannyUnlocked });
  showHome();
} else {
  startWelcome();
}
