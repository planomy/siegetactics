import { getMission, SLICE_MISSION_ID } from './missions-data.js';
import { initForge } from './forge.js';
import { renderShopBar, updateShopBar } from './shop.js';
import { createTDEngine } from './td-engine.js';
import { TURRETS, STARTER_TURRETS } from './turrets-data.js';
import { createAudio } from './audio.js';
import { DEV } from './dev.js';
import { normalizeMetaSave, shouldSpawnGranddaddy, onGranddaddySpawned } from './meta.js';
import { GRANNY_CACHE, cacheFillPercent } from './granny-cache.js';
import { ECONOMY, bankBonusForgeXp } from './economy.js';
import { computeStars, renderStarBadges } from './stars.js';
import { computeBragHeadline, computeNextGoal, renderNextGoal } from './progression.js';
import { preloadField, preloadDeployAssets, runDeployCountdown, getFieldImage } from './preload.js';
import { animateResultsStats, animateProgressFill, animateTallyPair } from './tally.js';

const SAVE_KEY = 'grannyboom.siege.v1';

/** @typedef {{ version: number, playerName: string, xp: number, unlockedTurrets: string[], unlockedMissions: string[], completedMissions: string[], bestKills: Record<string, number>, bestStars: Record<string, number>, siegesCompleted: number, granddaddySiegeTarget: number|null, granddaddySeen: boolean, grannyUnlocked: boolean, settings: { sound: boolean } }} SaveData */

/** @type {SaveData} */
const defaultSave = {
  version: 1,
  playerName: '',
  xp: 0,
  unlockedTurrets: [...STARTER_TURRETS],
  unlockedMissions: [SLICE_MISSION_ID],
  completedMissions: [],
  bestKills: {},
  bestStars: {},
  siegesCompleted: 0,
  granddaddySiegeTarget: null,
  granddaddySeen: false,
  grannyUnlocked: false,
  settings: { sound: true },
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
  forge: document.getElementById('screen-forge'),
  siege: document.getElementById('screen-siege'),
  results: document.getElementById('screen-results'),
};

const toastEl = document.getElementById('toast');
const xpDisplay = document.getElementById('topbar-xp');
const nameDisplay = document.getElementById('topbar-name');

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...defaultSave, unlockedTurrets: [...STARTER_TURRETS] };
    const data = { ...defaultSave, ...JSON.parse(raw) };
    if (!data.unlockedTurrets?.length) {
      data.unlockedTurrets = [...STARTER_TURRETS];
    }
    if (!data.bestStars) data.bestStars = {};
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

function showToast(msg, opts = {}) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.dataset.variant = opts.variant || 'info';
  toastEl.classList.add('visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('visible'), opts.duration ?? 3200);
}

function showScreen(id) {
  Object.entries(screens).forEach(([key, el]) => {
    el?.classList.toggle('active', key === id);
  });
  refreshTopbar();
}

function refreshSoundButton() {
  const btn = document.getElementById('btn-sound');
  if (btn) btn.textContent = save.settings.sound ? 'Sound on' : 'Sound off';
}

function toggleSound() {
  save.settings.sound = !save.settings.sound;
  persistSave();
  refreshSoundButton();
  if (!save.settings.sound) audio.stopScuttling();
  showToast(save.settings.sound ? 'Sound on.' : 'Sound muted.');
}

function refreshTopbar() {
  if (xpDisplay) xpDisplay.textContent = save.xp.toLocaleString();
  if (nameDisplay) nameDisplay.textContent = save.playerName || 'Recruit';
  refreshSoundButton();
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
  shopState.unlocked = getUnlockedSet();
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

function setShopActive(active) {
  if (!shopBarEl) return;
  shopBarEl.style.opacity = active ? '' : '0.45';
  shopBarEl.style.pointerEvents = active ? '' : 'none';
}

function updateStartButton() {
  const btn = document.getElementById('btn-start-wave');
  if (!btn || !tdEngine) return;
  btn.disabled = tdEngine.getPhase() !== 'deploy';
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

function startWelcome() {
  const input = document.getElementById('player-name');
  if (input && save.playerName) input.value = save.playerName;
  preloadDeployAssets({ unlocked: getUnlockedSet(), grannyUnlocked: save.grannyUnlocked });
  showScreen('welcome');
}

/** First siege deploy this session gets a 3-2-1 overlay while assets finish. */
let firstSiegeDeploy = true;

function beginMission() {
  run = {
    waveBudget: 0,
    runForgeXpEarned: 0,
    startCoins: 0,
    selectedTurret: null,
    cacheProgress: 0,
  };
  if (DEV.skipForge) {
    const mission = getMission(SLICE_MISSION_ID);
    onForgeSuccess({
      forgeXp: mission?.rewards.forgeXp ?? 40,
      placementBudget: (mission?.rewards.placementBudget ?? 90) + DEV.extraBudget,
    });
    return;
  }
  const forgeHost = document.getElementById('forge-host');
  if (forgeHost) {
    initForge(forgeHost, { onSuccess: onForgeSuccess, showToast });
  }
  showScreen('forge');
}

function onForgeSuccess(rewards) {
  const mission = getMission(SLICE_MISSION_ID);
  const forgeXp = rewards.forgeXp ?? mission?.rewards.forgeXp ?? 40;
  const placementBudget = rewards.placementBudget ?? mission?.rewards.placementBudget ?? 90;

  run.waveBudget = placementBudget;
  run.startCoins = placementBudget;
  run.runForgeXpEarned = forgeXp;
  run.selectedTurret = null;
  save.xp += forgeXp;
  persistSave();
  showToast(
    `+${forgeXp} ${ECONOMY.forgeXpLabel} (unlocks gear) · ${placementBudget} ${ECONOMY.siegeCoinsLabel} for this fight.`
  );
  if (save.grannyUnlocked) {
    addCacheProgress(GRANNY_CACHE.forgeBonusPoints);
  }
  showScreen('siege');
  initSiegeScreen();
}

function hideDeployOverlay() {
  const overlay = document.getElementById('siege-countdown');
  if (overlay) overlay.hidden = true;
}

async function initSiegeScreen() {
  tdEngine?.destroy();
  tdEngine = null;

  shopBarEl = document.getElementById('shop-bar');
  const canvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById('siege-canvas'));
  const mission = getMission(SLICE_MISSION_ID);
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

  const overlay = document.getElementById('siege-countdown');
  const numEl = document.getElementById('siege-countdown-num');
  const showCountdown = firstSiegeDeploy && overlay && numEl;

  try {
    if (showCountdown) {
      firstSiegeDeploy = false;
      overlay.hidden = false;
      numEl.textContent = '3';
    } else {
      hideDeployOverlay();
    }

    const countdownTask = showCountdown ? runDeployCountdown(numEl) : Promise.resolve();

    try {
      await preloadField();
    } catch {
      /* field fallback gradient still playable */
    }

    mountTDEngine(canvas, mission);
    await countdownTask;
  } finally {
    hideDeployOverlay();
  }
}

function mountTDEngine(canvas, mission) {
  if (tdEngine) return;

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
    onPauseChange(paused) {
      const pauseBtn = document.getElementById('btn-pause');
      if (pauseBtn) pauseBtn.textContent = paused ? 'Resume' : 'Pause';
      if (tdEngine?.getPhase() === 'wave') {
        setShopActive(paused);
        if (paused) showToast('Paused — pick turrets, place on grass, then Resume.');
      }
    },
    onPhaseChange(phase) {
      if (phase === 'deploy') {
        setShopActive(true);
        updateStartButton();
      } else if (phase === 'wave') {
        setShopActive(tdEngine?.isPaused() ?? false);
        updateStartButton();
      } else if (phase === 'announce' || phase === 'done') {
        setShopActive(false);
        updateStartButton();
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

  const startBtn = document.getElementById('btn-start-wave');
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.textContent = 'Launch attack';
  }
  updateNukeCachePanel();
  if (getFieldImage()) {
    showToast(`${ECONOMY.forgeXpLabel} unlocks turrets forever. ${ECONOMY.siegeCoinsLabel} only last this siege!`, {
      variant: 'shop',
    });
  }
}

function finishRun(stats) {
  const mission = getMission(SLICE_MISSION_ID);
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
  if (stats.won && !save.completedMissions.includes(missionId)) {
    save.completedMissions.push(missionId);
  }
  save.siegesCompleted += 1;
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
  beginMission();
  });

  document.getElementById('btn-start-wave')?.addEventListener('click', () => {
    if (tdEngine?.startWave()) {
      updateStartButton();
    }
  });

  document.getElementById('btn-fire-nukes')?.addEventListener('click', () => {
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

  document.getElementById('btn-pause')?.addEventListener('click', () => {
    const paused = tdEngine?.togglePause();
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = paused ? 'Resume' : 'Pause';
  });

  document.getElementById('btn-results-done')?.addEventListener('click', () => {
    beginMission();
  });

  document.getElementById('btn-sound')?.addEventListener('click', () => {
    audio.warmUp();
    toggleSound();
  });

  document.getElementById('btn-howto')?.addEventListener('click', () => {
    showToast(
      `${ECONOMY.forgeXpLabel} unlocks gear forever · ${ECONOMY.siegeCoinsLabel} place turrets · blast aliens to earn more coins!`
    );
  });

  if (DEV.enabled) {
    document.body.classList.add('dev-mode');
    showToast('Dev mode on.');
  }
}

bindUI();
startWelcome();
