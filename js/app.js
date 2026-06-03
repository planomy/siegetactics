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

/** @type {{ waveBudget: number, runForgeXpEarned: number, startCoins: number, selectedTurret: string|null, cacheProgress: number, cacheStock: number }} */
let run = {
  waveBudget: 0,
  runForgeXpEarned: 0,
  startCoins: 0,
  selectedTurret: null,
  cacheProgress: 0,
  cacheStock: 0,
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

function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('visible'), 2800);
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

  const stockEl = document.getElementById('nuke-cache-stock');
  if (stockEl) {
    stockEl.textContent = run.cacheStock === 1 ? '1 stocked' : `${run.cacheStock} stocked`;
    stockEl.classList.toggle('has-stock', run.cacheStock > 0);
  }

  panel.classList.toggle('nuke-cache-ready', run.cacheProgress >= cost || run.cacheStock > 0);

  const stockBtn = document.getElementById('btn-stock-cache');
  if (stockBtn) stockBtn.disabled = run.cacheProgress < cost;

  const summonBtn = document.getElementById('btn-summon-granny');
  const onField = tdEngine?.isGrannyOnField?.() ?? false;
  const inWave = tdEngine?.getPhase?.() === 'wave';
  if (summonBtn) {
    summonBtn.disabled = run.cacheStock < 1 || onField || !inWave;
  }

  updateCupcakeButton();
}

function updateCupcakeButton() {
  const btn = document.getElementById('btn-cupcakes');
  if (!btn) return;
  const onField = tdEngine?.isGrannyOnField?.() ?? false;
  btn.hidden = !onField;
  if (!onField) return;
  const canFire = tdEngine?.canFireCupcakes() ?? false;
  const active = tdEngine?.isCupcakeActive?.() ?? false;
  btn.disabled = !canFire;
  if (canFire) btn.textContent = 'Cupcakes!';
  else if (active) btn.textContent = 'Cupcakes inbound…';
  else btn.textContent = 'Cupcakes spent';
}

function startWelcome() {
  const input = document.getElementById('player-name');
  if (input && save.playerName) input.value = save.playerName;
  preloadDeployAssets({ unlocked: getUnlockedSet() });
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
    cacheStock: 0,
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

function initSiegeScreen() {
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
  if (showCountdown) {
    firstSiegeDeploy = false;
    overlay.hidden = false;
  }

  preloadField().then(async () => {
    mountTDEngine(canvas, mission);
    if (showCountdown && numEl && overlay) {
      await runDeployCountdown(numEl);
      overlay.hidden = true;
    }
  });
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
      showToast('Granddaddy?! Stock nuke caches, then summon Granny from the porch!');
      updateNukeCachePanel();
      tdEngine?.relayout?.();
    },
    onGrannySummoned() {
      updateNukeCachePanel();
    },
    onGrannyDeparted() {
      showToast('Granny heads back inside.');
      updateNukeCachePanel();
    },
    onCupcakeUsed() {
      updateNukeCachePanel();
    },
    onCupcakeFinished() {
      updateNukeCachePanel();
    },
    getBudget: () => run.waveBudget,
    trySpend: (type) => {
      if (!isUnlocked(type)) {
        showToast(`Unlock that turret with ${ECONOMY.forgeXpLabel} first.`);
        return false;
      }
      const cost = TURRETS[type]?.placementCost ?? 0;
      if (run.waveBudget < cost) {
        showToast(`Need ${cost} ${ECONOMY.siegeCoinsLabel} to place that.`);
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
      showToast(`Wave ${wave} cleared! +${bonus} ${ECONOMY.siegeCoinsLabel} — reinforce the lawn!`);
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
    showToast(`${ECONOMY.forgeXpLabel} unlocks turrets forever. ${ECONOMY.siegeCoinsLabel} only last this siege!`);
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

  document.getElementById('results-kills').textContent = String(stats.kills);
  document.getElementById('results-leaks').textContent = String(stats.leaks);
  document.getElementById('results-forge-xp').textContent = String(run.runForgeXpEarned);
  document.getElementById('results-coins-left').textContent = String(bankedCoins);
  const maxLeaksEl = document.getElementById('results-max-leaks');
  if (maxLeaksEl) maxLeaksEl.textContent = String(stats.maxLeaks);
  const bestEl = document.getElementById('results-best');
  if (bestEl) bestEl.textContent = String(save.bestKills[missionId]);

  const nextGoalEl = document.getElementById('results-next-goal');
  if (nextGoalEl) {
    renderNextGoal(
      nextGoalEl,
      computeNextGoal({ save, missionId, stats })
    );
  }

  showScreen('results');
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
  preloadDeployAssets({ unlocked: getUnlockedSet() });
  beginMission();
  });

  document.getElementById('btn-start-wave')?.addEventListener('click', () => {
    if (tdEngine?.startWave()) {
      updateStartButton();
    }
  });

  document.getElementById('btn-cupcakes')?.addEventListener('click', () => {
    if (tdEngine?.fireCupcakes()) {
      updateNukeCachePanel();
    }
  });

  document.getElementById('btn-stock-cache')?.addEventListener('click', () => {
    if (run.cacheProgress < GRANNY_CACHE.cost) return;
    run.cacheProgress -= GRANNY_CACHE.cost;
    run.cacheStock += 1;
    showToast('Nuke cache stocked! Summon Granny when the line breaks.');
    updateNukeCachePanel();
  });

  document.getElementById('btn-summon-granny')?.addEventListener('click', () => {
    if (run.cacheStock < 1) return;
    if (tdEngine?.summonGranny()) {
      run.cacheStock -= 1;
      showToast('Granny\'s on the porch — she\'ll frost anything near the house!');
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
