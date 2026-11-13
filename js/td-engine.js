import { TURRETS, TURRET_ORDER, TURRET_MAX_HP, loadTurretSprites, loadWreckedTurretSprites } from './turrets-data.js';
import { effectiveTurret, turretLevel } from './turret-upgrades.js?v=20261112a2';
import { AMMO, loadAmmoSprites } from './ammo-data.js?v=20261112a1';
import { FIELD_LAYOUT, targetPathsForRow } from './field-layout.js?v=20261112a1';
import { drawAlienPortalVfx } from './portal-vfx.js';
import { buildPlacementCells, pickPlacementCell } from './placement-grid.js?v=20261112a1';
import { loadEnemySprites, pickMothershipSprite, spriteKeyForEnemy, spriteSizeForEnemy, scaledHp, scaledSpeed } from './enemies-data.js';
import { getFieldImage, preloadField } from './preload.js';
import { CUPCAKE, pickCupcakeTarget, steerAngle } from './cupcakes.js';
import { waveConfigFor, ANNOUNCE_SPLASH_SEC, SIEGE_DURATION_SEC, BONUS_TIME_SEC } from './waves-data.js?v=20261113h1';
import { ECONOMY } from './economy.js';
import {
  MAZE_FIELD_SRC,
  MAZE_LAYOUT,
  HEDGE,
  HEDGE_MAX_HP,
  HEDGE_SPRITES,
  CELL_COUNT,
  cellIndex,
  cellColRow,
  cellCenter,
  cellSize,
  cellAtPoint,
  isGoalCell,
  isReservedCell,
  computeFlowField,
  nextCell,
  bestEntryCell,
  traceRoute,
  blockingKeepsRoute,
  drawHedge,
  MAZE_GATES,
  openGates,
  gateOpeningAfter,
  gateForUnit,
  FLYING_UNITS,
  HEDGE_SMASHERS,
} from './maze-field.js?v=20261113m7';
import { createGardenLife, LAWN_SCENE, LANE_SCENE } from './garden-life.js?v=20261113g2';

/** Build time in seconds — cost ÷ 10, minimum 1s. */
export function buildTimeForPlacementCost(cost) {
  return Math.max(1, cost / 10);
}

const { ENEMY_PATHS, TURRET_ROWS } = FIELD_LAYOUT;

/** How long a wrecked turret stays on its square, and how much of that it spends fading out. */
const WRECK_CLEAR_SECONDS = 2.5;
const WRECK_FADE_SECONDS = 0.7;

/**
 * @typedef {import('./placement-grid.js').PlacementCell} PlacementCell
 */

/**
 * @typedef {Object} Tower
 * @property {string} type
 * @property {number} row
 * @property {number} col
 * @property {number} x
 * @property {number} y
 * @property {number} cooldown
 * @property {number} hp
 * @property {number} maxHp
 * @property {boolean} wrecked
 * @property {number} buildRemaining - Seconds until turret is operational
 * @property {number} buildTotal
 * @property {number} [variant] - Which hedge design (hedges only)
 */

/**
 * @typedef {Object} Enemy
 * @property {number} id
 * @property {number} path - Dirt track (0–4)
 * @property {number} progress
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} speed
 * @property {boolean} isBoss
 * @property {'mothership'|'granddaddy'|null} bossKind
 * @property {import('./enemies-data.js').EnemySpriteKey|null} [spriteKey]
 * @property {import('./enemies-data.js').EnemySpriteKey|null} [mothershipSprite]
 * @property {number} bobPhase
 * @property {number} bobSpeed
 * @property {number} bobAmp
 * @property {number} slowUntil
 * @property {number} freezeUntil
 * @property {number} attackCooldown
 * @property {number} attackRate
 * @property {number} attackDamage
 * @property {number} attackRange
 * @property {number} [nx] - Maze mode: normalised position
 * @property {number} [ny]
 * @property {number} [cell] - Maze mode: cell index it last arrived in (-1 = still at the gate)
 * @property {number} [targetCell] - Maze mode: cell index it is walking to (-2 = porch)
 * @property {number} [jx] - Maze mode: personal offset inside each cell so crowds spread out
 * @property {number} [jy]
 * @property {boolean} [reached]
 * @property {boolean} [flying] - Maze mode: floats straight over hedges to the porch
 * @property {{x:number,y:number}} [from] - Maze mode: where a flyer set off
 */

/**
 * @typedef {Object} EnemyShot
 * @property {number} x
 * @property {number} y
 * @property {number} tx
 * @property {number} ty
 * @property {number} speed
 * @property {number} damage
 * @property {number} towerRow
 * @property {number} towerCol
 */

/**
 * @typedef {Object} CupcakeMissile
 * @property {number} x
 * @property {number} y
 * @property {number} angle
 * @property {number|null} targetId
 * @property {number} speed
 * @property {{ x: number, y: number, life: number }[]} trail
 * @property {boolean} alive
 */

/**
 * @typedef {Object} Projectile
 * @property {number} x
 * @property {number} y
 * @property {number} tx
 * @property {number} ty
 * @property {number} damage
 * @property {number} speed
 * @property {string} type
 * @property {number} aoe
 * @property {number} targetId
 * @property {number} angle
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   mission: import('./missions-data.js').Mission,
 *   getBudget: () => number,
 *   trySpend: (type: string) => boolean,
 *   onMissionEnd: (stats: { kills: number, leaks: number, won: boolean, maxLeaks: number, wavesCleared: number, bonusKills?: number, bonusPlayed?: boolean }) => void,
 *   onBonusOffer?: (seconds: number) => void,
 *   bonusSiegeSec?: number,
 *   firstSiege?: boolean,
 *   hordeRank?: number,
 *   zapped?: number,
 *   onKillReward?: (info: { isBoss: boolean, xp: number, screenX?: number, screenY?: number }) => void,
 *   onEnemyDestroyed?: (info: { key: import('./enemies-data.js').EnemySpriteKey }) => void,
 *   onWaveCleared?: (info: { wave: number, nextWave: number|null }) => void,
 *   onLeak?: (info: { leaks: number, maxLeaks: number, penalty: number }) => void,
 *   onPhaseChange?: (phase: 'deploy'|'announce'|'wave'|'bonus-offer'|'finale'|'done') => void,
 *   audio?: {
 *     playTurretFire: (type: string) => void,
 *     playNukeFire: () => void,
 *     playNukeExplosion: (info?: { isBoss?: boolean }) => void,
 *     playDeath: (info: { craft?: string, isBoss?: boolean, bossKind?: 'mothership'|'granddaddy'|null }) => void,
 *     playBoss: (kind: 'mothership'|'granddaddy') => void,
 *     fadeOutMothership?: () => void,
 *     stopMothership?: () => void,
 *     playWaveWarning: (waveNum: number) => void,
 *     playGranddaddyWarning: () => void,
 *     startScuttling: (waveNum: number) => void,
 *     stopScuttling: () => void,
 *     pauseScuttling: () => void,
 *     resumeScuttling: () => void,
 *     warmUp?: () => void,
 *   },
 *   showToast: (msg: string) => void,
 *   spawnGranddaddy?: boolean,
 *   grannyEnabled?: boolean | (() => boolean),
 *   onGranddaddySpawn?: () => void,
 *   onCupcakeUsed?: () => void,
 *   onCupcakeFinished?: () => void,
 *   onNukeStateChange?: () => void,
 * }} opts
 */
export function createTDEngine(canvas, opts) {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  /** @type {number[]} */
  let pathY = [];
  /** @type {number[]} */
  let turretRowY = [];
  let padPositions = /** @type {PlacementCell[]} */ ([]);
  let pathStartX = 0;
  let pathEndX = 0;
  /** @type {{ x: number, y: number, valid: boolean, cell: PlacementCell|null }} */
  let placementPreview = { x: 0, y: 0, valid: false, cell: null };
  let pointerActive = false;

  /** @type {Tower[]} */
  let towers = [];
  /** @type {Enemy[]} */
  let enemies = [];
  /** @type {Projectile[]} */
  let projectiles = [];
  /** @type {EnemyShot[]} */
  let enemyShots = [];
  let nextEnemyId = 1;
  let wreckToastAt = 0;
  let cupcakeUsed = false;
  /** @type {CupcakeMissile[]} */
  let cupcakeMissiles = [];
  /** @type {{ active: boolean, remaining: number, cooldown: number }} */
  let cupcakeSalvo = { active: false, remaining: 0, cooldown: 0 };
  /** @type {{ x: number, y: number, time: number, duration: number }[]} */
  let cupcakeBursts = [];
  /** @type {{ x: number, y: number, time: number, duration: number, size: number, isBoss: boolean, sparks: { angle: number, color: string }[] }[]} */
  let nukeKillBursts = [];
  let cupcakeFinishedNotified = false;
  let grannyRockTime = 0;
  let grannyNukePose = false;
  let portalAnimTime = 0;
  let portalSpawnPulse = 0;
  let granddaddySpawnedThisSiege = false;
  let nukeUiSig = '';
  let siegeTimeLeft = 0;
  let siegeTimerEnded = false;
  let siegeArmed = false;
  let bonusPlayed = false;
  let bonusOffered = false;
  let baseLeaks = 0;
  let baseKills = 0;

  const maze = Boolean(opts.maze);
  let mazeBlocked = new Uint8Array(CELL_COUNT);
  let mazeDist = computeFlowField(mazeBlocked);
  /** @typedef {{ gate: import('./maze-field.js').MazeGate, route: {col:number,row:number}[] }} GateRoute */
  /** @param {Float64Array} dist @param {Uint8Array} blocked @returns {GateRoute[]} */
  const routesFor = (dist, blocked) => MAZE_GATES.map((gate) => ({ gate, route: traceRoute(dist, blocked, gate) }));
  let mazeRoutes = routesFor(mazeDist, mazeBlocked);
  /** Routes the aliens would take if the hovered placement went ahead. */
  /** @type {GateRoute[]|null} */
  let mazeGhostRoutes = null;
  let mazeCellW = 0;
  let mazeCellH = 0;
  const garden = createGardenLife(maze ? LAWN_SCENE : LANE_SCENE);

  function syncNukeUi() {
    if (!opts.onNukeStateChange) return;
    const sig = [
      phase,
      cupcakeUsed,
      cupcakeSalvo.active,
      cupcakeMissiles.length > 0,
      enemies.length > 0,
    ].join('|');
    if (sig === nukeUiSig) return;
    nukeUiSig = sig;
    opts.onNukeStateChange();
  }

  function isCacheUnlocked() {
    if (typeof opts.grannyEnabled === 'function') return opts.grannyEnabled();
    return Boolean(opts.grannyEnabled);
  }

  let phase = /** @type {'deploy'|'announce'|'wave'|'bonus-offer'|'finale'|'done'} */ ('deploy');
  /** @type {{ won: boolean, startedAt: number }|null} */
  let pendingMissionEnd = null;
  let waveTime = 0;
  let speedMult = 1;
  let goLive = false;
  let waveKills = 0;
  let totalKills = 0;
  let totalLeaks = 0;
  let currentWaveIndex = 0;
  let wavesCompleted = 0;
  let rafId = 0;
  let lastTs = 0;

  /** @type {string|null} */
  let selectedType = null;

  /** @type {{ spawned: number, nextSpawnAt: number, burstLeft: number }} */
  let spawner = { spawned: 0, nextSpawnAt: 0, burstLeft: 0 };

  /** @type {{ active: boolean, waveNum: number, codename: string, startMs: number, duration: number }} */
  let splash = { active: false, waveNum: 1, codename: '', startMs: 0, duration: ANNOUNCE_SPLASH_SEC };

  function splashProgress() {
    if (!splash.active) return 0;
    return Math.min(1, (performance.now() - splash.startMs) / (splash.duration * 1000));
  }

  /** @type {Record<string, HTMLImageElement>} */
  let enemySprites = {};

  const siegeDuration = opts.mission.siegeDurationSec ?? SIEGE_DURATION_SEC;
  const bonusAvailable = Math.max(0, Math.min(BONUS_TIME_SEC, opts.bonusSiegeSec || 0));
  const maxLeaks = opts.mission.maxLeaks ?? 5;
  /** Granny's Gear can make the cupcake nukes bigger and fire more of them. */
  const nukeBoost = { damage: 1, aoe: 1, salvo: 1, ...(opts.nukeBoost ?? {}) };
  const NUKE_DAMAGE = CUPCAKE.damage * nukeBoost.damage;
  const NUKE_AOE = CUPCAKE.aoe * nukeBoost.aoe;
  const NUKE_SALVO = Math.round(CUPCAKE.salvoCount * nukeBoost.salvo);
  const leakCoinPenalty = opts.mission.leakCoinPenalty ?? ECONOMY.leakCoinPenalty;
  const killBudgetXp = opts.mission.killBudgetXp ?? 1;
  const bossKillBudgetXp = opts.mission.bossKillBudgetXp ?? 4;
  let defeated = false;

  function updateCanvasCursor() {
    canvas.style.cursor = selectedType && canPlaceTurrets() ? 'none' : '';
  }

  function isTowerOperational(t) {
    return !t.wrecked && t.buildRemaining <= 0;
  }

  function tickBuildTimers(dt) {
    for (const t of towers) {
      if (t.buildRemaining > 0) {
        t.buildRemaining = Math.max(0, t.buildRemaining - dt);
      }
      if (t.wrecked) t.wreckAge = (t.wreckAge ?? 0) + dt;
    }
    // A wreck crumbles away after a moment so its square can be built on again.
    const crumbled = towers.filter((t) => t.wrecked && t.wreckAge >= WRECK_CLEAR_SECONDS);
    if (crumbled.length) {
      const sz = Math.max(36, cellRadius() * 2.6);
      crumbled.forEach((t) => spawnNukeKillBurst(t.x, t.y - sz * 0.4, false, 0.85));
      towers = towers.filter((t) => !crumbled.includes(t));
      if (maze) rebuildMaze();
    }
  }

  /** Hedges live outside TURRETS so they never reach the Armory or upgrades. */
  function defOf(type) {
    return type === 'hedge' ? HEDGE : effectiveTurret(type);
  }

  /** Lane mode: a turret row only covers the dirt tracks beside it. Maze mode: range alone decides. */
  function rowCoversEnemy(row, enemy) {
    return maze || targetPathsForRow(row).has(enemy.path);
  }

  function rebuildMaze() {
    mazeBlocked = new Uint8Array(CELL_COUNT);
    towers.forEach((t) => {
      mazeBlocked[cellIndex(t.col, t.row)] = 1;
    });
    mazeDist = computeFlowField(mazeBlocked);
    mazeRoutes = routesFor(mazeDist, mazeBlocked);
  }

  function currentWaveNum() {
    return wavesCompleted + 1;
  }

  /** Turret sprites stand on the lower part of their cell; hedges fill it. */
  function mazeCellPx(col, row) {
    const c = cellCenter(col, row);
    const cx = c.x * width;
    const cy = c.y * height;
    return { cx, cy, x: cx, y: cy + mazeCellH * 0.36 };
  }

  /** Cells aliens are standing in or walking into — building there is not allowed. */
  function mazeCellsUnderfoot() {
    const cells = new Set();
    enemies.forEach((e) => {
      if (e.flying) return;
      if (e.cell !== undefined && e.cell >= 0) cells.add(e.cell);
      if (e.targetCell !== undefined && e.targetCell >= 0) cells.add(e.targetCell);
    });
    return cells;
  }

  /**
   * @returns {{ x: number, y: number, valid: boolean, cell: PlacementCell|null, reason?: string, routes?: GateRoute[] }}
   */
  function pickMazeCell(px, py) {
    const hit = width > 0 && height > 0 ? cellAtPoint(px / width, py / height) : null;
    if (!hit) return { x: px, y: py, valid: false, cell: null, reason: 'off' };
    const pos = mazeCellPx(hit.col, hit.row);
    const cell = /** @type {PlacementCell} */ ({ row: hit.row, col: hit.col, x: pos.x, y: pos.y });
    const base = { x: pos.x, y: pos.y, cell };
    if (isCellOccupied(hit.row, hit.col)) return { ...base, valid: false, reason: 'taken' };
    if (isReservedCell(hit.col, hit.row)) return { ...base, valid: false, reason: 'reserved' };
    const underfoot = mazeCellsUnderfoot();
    if (underfoot.has(cellIndex(hit.col, hit.row))) return { ...base, valid: false, reason: 'alien' };
    const check = blockingKeepsRoute(mazeBlocked, hit.col, hit.row, [...underfoot]);
    if (!check.ok || !check.trial) return { ...base, valid: false, reason: 'blocks' };
    return { ...base, valid: true, routes: routesFor(check.dist, check.trial) };
  }

  function setPhase(next) {
    phase = next;
    updateCanvasCursor();
    opts.onPhaseChange?.(next);
  }

  loadEnemySprites()
    .then((sprites) => {
      enemySprites = sprites;
      render();
    })
    .catch(() => {});

  /** @type {Record<string, HTMLImageElement>} */
  let turretSprites = {};
  loadTurretSprites()
    .then((sprites) => {
      turretSprites = sprites;
      render();
    })
    .catch(() => {});

  /** @type {Record<string, HTMLImageElement>} */
  let wreckedSprites = {};
  function loadWreckedWhenIdle() {
    loadWreckedTurretSprites()
      .then((sprites) => {
        wreckedSprites = sprites;
        render();
      })
      .catch(() => {});
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(loadWreckedWhenIdle, { timeout: 4000 });
  } else {
    setTimeout(loadWreckedWhenIdle, 2000);
  }

  /** @type {Record<string, HTMLImageElement|null>} */
  let ammoSprites = {};
  loadAmmoSprites()
    .then((sprites) => {
      ammoSprites = sprites;
      render();
    })
    .catch(() => {});

  /** @type {HTMLImageElement|null} */
  let fieldImg = getFieldImage();
  /** @type {HTMLImageElement|null} */
  let grannyImg = null;
  const grannyLoader = new Image();
  grannyLoader.src = 'assets/granny-porch.png';
  grannyLoader.onload = () => {
    grannyImg = grannyLoader;
    render();
  };
  /** @type {HTMLImageElement|null} */
  let grannyNukeImg = null;
  const grannyNukeLoader = new Image();
  grannyNukeLoader.src = 'assets/granny-nuke.png';
  grannyNukeLoader.onload = () => {
    grannyNukeImg = grannyNukeLoader;
    render();
  };
  /** @type {HTMLImageElement|null} */
  let cupcakeImg = null;
  const cupcakeLoader = new Image();
  cupcakeLoader.src = 'assets/cupcake-missile.png';
  cupcakeLoader.onload = () => {
    cupcakeImg = cupcakeLoader;
    render();
  };
  /** @type {HTMLImageElement|null} */
  let mazePortalImg = null;
  /** @type {(HTMLImageElement|null)[]} */
  const hedgeImgs = HEDGE_SPRITES.map(() => null);
  let hedgesPlaced = 0;
  let flyerWarned = false;
  if (maze) {
    HEDGE_SPRITES.forEach((src, i) => {
      const img = new Image();
      img.onload = () => {
        hedgeImgs[i] = img;
        render();
      };
      img.src = src;
    });
    const portalLoader = new Image();
    portalLoader.onload = () => {
      mazePortalImg = portalLoader;
      render();
    };
    portalLoader.src = MAZE_LAYOUT.portalSprite.src;
    fieldImg = null;
    const lawn = new Image();
    lawn.decoding = 'async';
    lawn.onload = () => {
      fieldImg = lawn;
      render();
    };
    lawn.src = MAZE_FIELD_SRC;
  } else if (!fieldImg) {
    preloadField().then((img) => {
      fieldImg = img;
      render();
    }).catch(() => {});
  }

  function cellRadius() {
    if (width <= 0) return 12;
    if (maze) return Math.max(8, Math.min(mazeCellW, mazeCellH * 1.15) * 0.44);
    const cols = FIELD_LAYOUT.gridColX;
    const colW =
      cols.length > 1 ? (cols[1] - cols[0]) * width : ((pathEndX - pathStartX) * width) / 7;
    return Math.max(8, Math.min(14, colW * 0.34));
  }

  function isCellOccupied(row, col) {
    return towers.some((t) => t.row === row && t.col === col);
  }

  function updatePlacementPreview(px, py) {
    if (!selectedType || !canPlaceTurrets() || width <= 0 || height <= 0) {
      placementPreview = { x: px, y: py, valid: false, cell: null };
      mazeGhostRoutes = null;
      return;
    }
    if (maze) {
      const pick = pickMazeCell(px, py);
      placementPreview = { x: pick.x, y: pick.y, valid: pick.valid, cell: pick.cell };
      mazeGhostRoutes = pick.routes ?? null;
      return;
    }
    const pick = pickPlacementCell(padPositions, px, py, width, height, isCellOccupied);
    placementPreview = {
      x: pick.x,
      y: pick.y,
      valid: pick.valid,
      cell: pick.cell,
    };
  }

  function layout() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    pathY = FIELD_LAYOUT.enemyPathY.map((n) => height * n);
    turretRowY = FIELD_LAYOUT.turretRowY.map((n) => height * n);
    pathStartX = width * FIELD_LAYOUT.pathStartX;
    pathEndX = width * FIELD_LAYOUT.pathEndX;
    padPositions = buildPlacementCells(width, height);
    const mc = cellSize();
    mazeCellW = mc.w * width;
    mazeCellH = mc.h * height;
    towers.forEach((tower) => {
      if (maze) {
        const pos = mazeCellPx(tower.col, tower.row);
        tower.x = pos.x;
        tower.y = pos.y;
        return;
      }
      const cell = padPositions.find((c) => c.row === tower.row && c.col === tower.col);
      if (cell) {
        tower.x = cell.x;
        tower.y = cell.y;
      }
    });
    if (pointerActive) updatePlacementPreview(placementPreview.x, placementPreview.y);
  }

  function getWaveConfig() {
    const waveNum = wavesCompleted + 1;
    return waveConfigFor(waveNum, {
      spawnGranddaddy: opts.spawnGranddaddy && !granddaddySpawnedThisSiege && waveNum >= 3,
      firstSiege: Boolean(opts.firstSiege),
      rank: opts.hordeRank ?? 0,
      zapped: opts.zapped ?? 0,
    });
  }

  function formatSiegeTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function initSpawner() {
    spawner = { spawned: 0, nextSpawnAt: 0.4, burstLeft: 0 };
  }

  function spawnEnemy(path, hp, speed, bossKind = null, spriteKey = null, lawn = null) {
    const bobBase = Math.max(2, height * 0.007);
    const sizeScale = bossKind === 'granddaddy' ? 0.35 : bossKind === 'mothership' ? 0.45 : 1;
    const attackRate =
      bossKind === 'granddaddy' ? 2.0 : bossKind === 'mothership' ? 2.6 : 3.4 + Math.random() * 1.2;
    const attackDamage = bossKind === 'granddaddy' ? 20 : bossKind === 'mothership' ? 14 : 9;
    const attackRange = bossKind === 'granddaddy' ? 125 : bossKind === 'mothership' ? 110 : 92;
    enemies.push({
      id: nextEnemyId++,
      path,
      progress: 0,
      hp,
      maxHp: hp,
      speed,
      isBoss: bossKind !== null,
      bossKind,
      spriteKey,
      mothershipSprite: bossKind === 'mothership' ? pickMothershipSprite() : null,
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 4.8 + Math.random() * 3.6,
      bobAmp: bobBase * (0.3 + Math.random() * 0.35) * sizeScale,
      slowUntil: 0,
      freezeUntil: 0,
      attackCooldown: 0.8 + Math.random() * 1.5,
      attackRate,
      attackDamage,
      attackRange,
      ...(maze ? spawnOnLawn(lawn ?? lawnSpawnFor(spriteKey ?? bossKind ?? 'monster1', 0)) : {}),
    });
    if (maze && !flyerWarned && enemies[enemies.length - 1]?.flying && bossKind !== 'mothership') {
      flyerWarned = true;
      opts.showToast('Raiders FLY over hedges — only turrets can stop them!');
    }
    if (bossKind === 'mothership') opts.audio?.playBoss('mothership');
    if (bossKind === 'granddaddy') opts.audio?.playGranddaddyWarning();
  }

  function spawnFromConfig(cfg, index) {
    const slot = cfg.spawnQueue[index];
    if (!slot) return;

    const ramp = 1 + index * (cfg.hpRamp ?? 0.02);
    const rush = index >= cfg.clumpAt ? 1.14 : 1;
    const path = index % ENEMY_PATHS;

    if (slot.unit === 'granddaddy') {
      const hp = scaledHp('granddaddy', cfg.hpScale, ramp);
      spawnEnemy(2, hp, scaledSpeed('granddaddy', cfg.speedMul, rush), 'granddaddy');
      granddaddySpawnedThisSiege = true;
      opts.onGranddaddySpawn?.();
      return;
    }

    if (slot.unit === 'mothership') {
      const hp = scaledHp('mothership', cfg.hpScale, ramp);
      spawnEnemy(2, hp, scaledSpeed('mothership', cfg.speedMul, rush), 'mothership', null, maze ? lawnSpawnFor('mothership', index) : null);
      return;
    }

    const hp = scaledHp(slot.unit, cfg.hpScale, ramp);
    const speed = scaledSpeed(slot.unit, cfg.speedMul, rush);
    spawnEnemy(path, hp, speed, null, slot.unit, maze ? lawnSpawnFor(slot.unit, index) : null);
  }

  function updateSpawner() {
    if (siegeTimerEnded) return;
    const cfg = getWaveConfig();
    if (!cfg || spawner.spawned >= cfg.totalSpawns) return;
    if (waveTime < spawner.nextSpawnAt) return;

    spawnFromConfig(cfg, spawner.spawned);
    spawner.spawned += 1;
    portalSpawnPulse = 1;

    const inClump = spawner.spawned >= cfg.clumpAt;
    if (inClump) {
      if (spawner.burstLeft <= 0) {
        spawner.burstLeft = Math.min(cfg.burstSize, cfg.totalSpawns - spawner.spawned);
      }
      spawner.burstLeft -= 1;
      spawner.nextSpawnAt = waveTime + (spawner.burstLeft > 0 ? 0.12 : cfg.burstGap);
    } else {
      spawner.nextSpawnAt = waveTime + cfg.spawnIntervalSec;
    }
  }

  /** @param {string} unit @param {number} index */
  function lawnSpawnFor(unit, index) {
    const gate = unit === 'granddaddy' ? MAZE_GATES[0] : gateForUnit(unit, index, openGates(currentWaveNum()));
    return { gate, flying: FLYING_UNITS.has(unit) };
  }

  /** @param {{ gate: import('./maze-field.js').MazeGate, flying: boolean }} lawn */
  function spawnOnLawn(lawn) {
    const { gate, flying } = lawn;
    const entry = bestEntryCell(mazeDist, gate) ?? gate.entries[0];
    const sideways = gate.id === 'west' ? 0 : (Math.random() - 0.5) * 0.03;
    const nx = gate.spawn.x + sideways;
    const ny = gate.spawn.y + (gate.id === 'west' ? (Math.random() - 0.5) * 0.04 : 0);
    return {
      nx,
      ny,
      flying,
      from: { x: nx, y: ny },
      cell: -1,
      targetCell: flying ? -2 : cellIndex(entry.col, entry.row),
      jx: (Math.random() - 0.5) * 0.36,
      jy: (Math.random() - 0.5) * 0.36,
      reached: false,
    };
  }

  /** Normalised point an alien heads for: its target cell (with its own offset) or the porch. */
  function mazeTargetPoint(e) {
    if (e.targetCell === -2) return MAZE_LAYOUT.porch;
    const { col, row } = cellColRow(e.targetCell ?? 0);
    const c = cellCenter(col, row);
    const s = cellSize();
    return { x: c.x + (e.jx ?? 0) * s.w, y: c.y + (e.jy ?? 0) * s.h };
  }

  /** Arrived at a cell: follow the flow field one step further (or onto the porch). */
  function mazeAdvance(e) {
    if (e.targetCell === -2) {
      e.reached = true;
      return;
    }
    e.cell = e.targetCell ?? -1;
    const { col, row } = cellColRow(e.cell);
    if (isGoalCell(col, row)) {
      e.targetCell = -2;
      return;
    }
    const next = nextCell(mazeDist, mazeBlocked, col, row);
    if (next) e.targetCell = cellIndex(next.col, next.row);
  }

  function mazeMove(e, pxStep) {
    if (e.flying) {
      const p = MAZE_LAYOUT.porch;
      const dx = (p.x - (e.nx ?? 0)) * width;
      const dy = (p.y - (e.ny ?? 0)) * height;
      const d = Math.hypot(dx, dy);
      if (d <= pxStep) {
        e.nx = p.x;
        e.ny = p.y;
        e.reached = true;
        e.progress = 1;
        return;
      }
      e.nx = (e.nx ?? 0) + (dx / d) * pxStep / width;
      e.ny = (e.ny ?? 0) + (dy / d) * pxStep / height;
      const from = e.from ?? p;
      const total = Math.hypot((p.x - from.x) * width, (p.y - from.y) * height) || 1;
      e.progress = Math.min(0.999, 1 - d / total);
      return;
    }
    let left = pxStep;
    for (let guard = 0; guard < 4 && left > 0 && !e.reached; guard++) {
      const tp = mazeTargetPoint(e);
      const dx = (tp.x - (e.nx ?? 0)) * width;
      const dy = (tp.y - (e.ny ?? 0)) * height;
      const d = Math.hypot(dx, dy);
      if (d <= left) {
        e.nx = tp.x;
        e.ny = tp.y;
        left -= d;
        const before = e.targetCell;
        mazeAdvance(e);
        if (before === e.targetCell && !e.reached) break;
      } else {
        e.nx = (e.nx ?? 0) + dx / d * left / width;
        e.ny = (e.ny ?? 0) + dy / d * left / height;
        left = 0;
      }
    }
    const here = e.cell !== undefined && e.cell >= 0 ? mazeDist[e.cell] : mazeDist[e.targetCell ?? 0] + 1;
    e.progress = e.reached ? 1 : Math.min(0.999, 1 - (Number.isFinite(here) ? here + 1 : CELL_COUNT) / (CELL_COUNT * 1.5));
  }

  function enemyWorldPos(enemy) {
    if (maze) return { x: (enemy.nx ?? 0) * width, y: (enemy.ny ?? 0) * height };
    const x = pathStartX + (pathEndX - pathStartX) * enemy.progress;
    return { x, y: pathY[enemy.path] };
  }

  /** Visual position with per-ship bob (logic stays on the dirt path). */
  function enemyDrawPos(enemy) {
    const pos = enemyWorldPos(enemy);
    const bob = Math.sin(waveTime * enemy.bobSpeed + enemy.bobPhase) * enemy.bobAmp;
    return { x: pos.x, y: pos.y + bob };
  }

  function notifyEnemyKilled(enemy) {
    if (enemy.bossKind === 'mothership' && !enemies.some((e) => e.bossKind === 'mothership')) {
      opts.audio?.fadeOutMothership?.();
    }
  }

  function onEnemyDestroyed(enemy) {
    const pos = enemyDrawPos(enemy);
    const baseSize = Math.max(32, height * 0.082);
    const size = spriteSizeForEnemy(enemy, baseSize);
    spawnNukeKillBurst(pos.x, pos.y, enemy.isBoss, size / baseSize);
    notifyEnemyKilled(enemy);
    waveKills += 1;
    totalKills += 1;
    rewardKill(enemy.isBoss, pos.x, pos.y);
    opts.onEnemyDestroyed?.({ key: spriteKeyForEnemy(enemy) });
    opts.audio?.playDeath({
      craft: spriteKeyForEnemy(enemy),
      isBoss: enemy.isBoss,
      bossKind: enemy.bossKind,
    });
  }

  function findTarget(tower) {
    const def = defOf(tower.type);
    let best = null;
    let bestP = -1;
    for (const e of enemies) {
      if (!rowCoversEnemy(tower.row, e)) continue;
      const pos = enemyWorldPos(e);
      const dist = Math.hypot(pos.x - tower.x, pos.y - tower.y);
      if (dist > def.range) continue;
      if (e.progress > bestP) {
        bestP = e.progress;
        best = e;
      }
    }
    return best;
  }

  function fireTower(tower, dt) {
    if (tower.wrecked || tower.buildRemaining > 0) return;
    const def = defOf(tower.type);
    if (def.role === 'decoy' || def.role === 'magnet' || def.role === 'repair' || def.role === 'wall') return;

    tower.cooldown -= dt;
    if (tower.cooldown > 0) return;

    if (def.role === 'glue') {
      if (!splashGlueGoo(tower, def)) return;
      tower.cooldown = def.fireRate;
      opts.audio?.playTurretFire(tower.type);
      return;
    }

    const target = findTarget(tower);
    if (!target) return;
    tower.cooldown = def.fireRate;

    if (def.damage === 0 && def.slow) {
      target.slowUntil = waveTime + (def.slowDuration ?? 2);
      opts.audio?.playTurretFire(tower.type);
      return;
    }

    const pos = enemyWorldPos(target);
    const dx = pos.x - tower.x;
    const dy = pos.y - tower.y;
    projectiles.push({
      x: tower.x,
      y: tower.y,
      tx: pos.x,
      ty: pos.y,
      damage: def.damage,
      speed: def.boltSpeed ?? 320,
      type: tower.type,
      aoe: def.aoe ?? 0,
      targetId: target.id,
      angle: Math.atan2(dy, dx),
    });
    opts.audio?.playTurretFire(tower.type);
  }

  function findTowerTarget(enemy) {
    const pos = enemyWorldPos(enemy);
    let bestDecoy = null;
    let bestDecoyDist = Infinity;
    let best = null;
    let bestDist = Infinity;
    for (const t of towers) {
      if (t.wrecked || t.buildRemaining > 0) continue;
      if (!rowCoversEnemy(t.row, enemy)) continue;
      const dist = Math.hypot(pos.x - t.x, pos.y - t.y);
      if (dist > enemy.attackRange) continue;
      const def = defOf(t.type);
      if (def.role === 'wall' && !HEDGE_SMASHERS.has(enemy.spriteKey ?? '')) continue;
      if (def.role === 'decoy') {
        if (dist < bestDecoyDist) {
          bestDecoyDist = dist;
          bestDecoy = t;
        }
      } else if (dist < bestDist) {
        bestDist = dist;
        best = t;
      }
    }
    return bestDecoy ?? best;
  }

  function enemyLuredByDecoy(enemy) {
    const pos = enemyWorldPos(enemy);
    for (const t of towers) {
      if (t.wrecked || t.buildRemaining > 0) continue;
      const def = defOf(t.type);
      if (def.role !== 'decoy') continue;
      if (!rowCoversEnemy(t.row, enemy)) continue;
      if (Math.hypot(pos.x - t.x, pos.y - t.y) <= enemy.attackRange) return true;
    }
    return false;
  }

  function splashGlueGoo(tower, def) {
    let hit = false;
    for (const e of enemies) {
      if (!rowCoversEnemy(tower.row, e)) continue;
      const pos = enemyWorldPos(e);
      if (Math.hypot(pos.x - tower.x, pos.y - tower.y) > def.range) continue;
      e.slowUntil = Math.max(e.slowUntil, waveTime + (def.slowDuration ?? 3));
      hit = true;
    }
    return hit;
  }

  function applyTurretStatus(sourceType, x, y, aoe, primaryId) {
    const def = defOf(sourceType);
    if (!def) return;
    const tag = (e) => {
      if (def.slow || def.slowDuration || def.role === 'glue') {
        e.slowUntil = Math.max(e.slowUntil, waveTime + (def.slowDuration ?? 2.5));
      }
      if (def.freezeDuration || def.role === 'freeze') {
        const duration = def.freezeDuration ?? 1.5;
        if (e.isBoss) {
          e.slowUntil = Math.max(e.slowUntil, waveTime + duration * 0.85);
        } else {
          e.freezeUntil = Math.max(e.freezeUntil, waveTime + duration);
        }
      }
    };
    if (aoe > 0) {
      enemies.forEach((e) => {
        const pos = enemyWorldPos(e);
        if (Math.hypot(pos.x - x, pos.y - y) <= aoe) tag(e);
      });
    } else {
      const e = enemies.find((en) => en.id === primaryId);
      if (e) tag(e);
    }
  }

  function updateRepairTowers(dt) {
    for (const shed of towers) {
      if (!isTowerOperational(shed)) continue;
      const def = defOf(shed.type);
      if (def.role !== 'repair') continue;
      for (const t of towers) {
        if (t === shed || t.wrecked || t.hp >= t.maxHp) continue;
        if (Math.hypot(t.x - shed.x, t.y - shed.y) > (def.repairRadius ?? 90)) continue;
        t.hp = Math.min(t.maxHp, t.hp + (def.repairHpPerSec ?? 5) * dt);
      }
    }
  }

  function fireEnemy(enemy, dt) {
    if (enemy.freezeUntil > waveTime) return;
    enemy.attackCooldown -= dt;
    if (enemy.attackCooldown > 0) return;
    const tower = findTowerTarget(enemy);
    if (!tower) return;
    enemy.attackCooldown = enemy.attackRate;
    const pos = enemyWorldPos(enemy);
    enemyShots.push({
      x: pos.x,
      y: pos.y,
      tx: tower.x,
      ty: tower.y,
      speed: 240,
      damage: enemy.attackDamage * (tower.type === 'hedge' ? 4 : 1),
      towerRow: tower.row,
      towerCol: tower.col,
    });
  }

  function damageTower(row, col, damage) {
    const tower = towers.find((t) => t.row === row && t.col === col);
    if (!tower || tower.wrecked) return;
    tower.hp = Math.max(0, tower.hp - damage);
    if (tower.hp <= 0) {
      tower.wrecked = true;
      tower.wreckAge = 0;
      const name = defOf(tower.type)?.name ?? 'Turret';
      if (waveTime - wreckToastAt > 2.2) {
        wreckToastAt = waveTime;
        opts.showToast(tower.type === 'hedge' ? 'A Bruiser smashed a hedge!' : `${name} wrecked!`);
      }
    }
  }

  function spawnNukeKillBurst(x, y, isBoss, sizeScale = 1) {
    const baseSize = Math.max(28, height * 0.045) * sizeScale * (isBoss ? 1.55 : 1);
    const palette = isBoss
      ? ['rgba(255,107,53,0.95)', 'rgba(255,209,102,0.9)', 'rgba(255,69,0,0.85)', 'rgba(255,255,255,0.75)']
      : ['rgba(157,78,221,0.95)', 'rgba(124,252,0,0.9)', 'rgba(255,107,203,0.85)', 'rgba(199,125,255,0.8)', 'rgba(255,255,255,0.7)'];
    const sparkCount = isBoss ? 14 : 8;
    const sparks = Array.from({ length: sparkCount }, (_, i) => ({
      angle: (Math.PI * 2 * i) / sparkCount + Math.random() * 0.35,
      color: palette[i % palette.length],
      spread: 0.42 + Math.random() * 0.35,
    }));
    nukeKillBursts.push({
      x,
      y,
      time: 0,
      duration: isBoss ? CUPCAKE.killBurstDurationBoss : CUPCAKE.killBurstDuration,
      size: baseSize,
      isBoss,
      sparks,
    });
  }

  function applyCupcakeExplosion(x, y) {
    const hadBoss = enemies.some((e) => {
      const pos = enemyWorldPos(e);
      return e.isBoss && Math.hypot(pos.x - x, pos.y - y) <= NUKE_AOE;
    });
    opts.audio?.playNukeExplosion({ isBoss: hadBoss });
    cupcakeBursts.push({ x, y, time: 0, duration: 0.5 });
    enemies.forEach((e) => {
      const pos = enemyWorldPos(e);
      if (Math.hypot(pos.x - x, pos.y - y) <= NUKE_AOE) {
        e.hp -= NUKE_DAMAGE;
      }
    });
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0) {
        const e = enemies[i];
        enemies.splice(i, 1);
        onEnemyDestroyed(e);
      }
    }
  }

  function lockedCupcakeTargetIds() {
    return new Set(
      cupcakeMissiles.filter((m) => m.alive && m.targetId != null).map((m) => /** @type {number} */ (m.targetId))
    );
  }

  function resolveCupcakeTarget(targetId) {
    let e = enemies.find((en) => en.id === targetId);
    if (e) return e;
    return pickCupcakeTarget(enemies, lockedCupcakeTargetIds());
  }

  function grannyPoseConfig() {
    if (grannyNukePose && grannyNukeImg) {
      return { ...FIELD_LAYOUT.grannyNuke, ...(maze ? MAZE_LAYOUT.grannyNuke : {}) };
    }
    return { ...FIELD_LAYOUT.grannyPorch, ...(maze ? MAZE_LAYOUT.grannyPorch : {}) };
  }

  function grannyLayout() {
    const nuking = grannyNukePose && grannyNukeImg;
    const cfg = grannyPoseConfig();
    const img = nuking ? grannyNukeImg : grannyImg;
    const scale = cfg.heightScale ?? (nuking ? 0.21 : 0.17);
    const h = Math.max(52, height * scale);
    const aspect = img ? img.width / img.height : 0.73;
    const w = h * aspect;
    const rightX = width * cfg.rightX;
    const baseY = height * cfg.baseY;
    const x = rightX - w;
    const flipX = cfg.flipX !== false;
    return { x, baseY, w, h, rightX, flipX, cfg, img };
  }

  function grannyMuzzlePos() {
    const { x, baseY, w, h, flipX, cfg } = grannyLayout();
    const m = cfg.muzzle ?? FIELD_LAYOUT.grannyPorch.muzzle ?? { x: 0.28, y: 0.07 };
    const mx = flipX ? x + w * (1 - m.x) : x + w * m.x;
    const my = baseY - h * (1 - m.y);
    return { x: mx, y: my };
  }

  function launchCupcakeMissile() {
    const target = pickCupcakeTarget(enemies, lockedCupcakeTargetIds());
    if (!target) return;
    const muzzle = grannyMuzzlePos();
    const tpos = enemyWorldPos(target);
    const angle = Math.atan2(tpos.y - muzzle.y, tpos.x - muzzle.x);
    cupcakeMissiles.push({
      x: muzzle.x,
      y: muzzle.y,
      angle,
      targetId: target.id,
      speed: CUPCAKE.speed,
      trail: [],
      alive: true,
    });
    opts.audio?.playNukeFire();
  }

  function startCupcakeSalvo() {
    if (!isCacheUnlocked() || cupcakeUsed || phase !== 'wave') return false;
    if (enemies.length === 0) return false;
    cupcakeUsed = true;
    cupcakeFinishedNotified = false;
    grannyNukePose = true;
    cupcakeSalvo = {
      active: true,
      remaining: NUKE_SALVO,
      cooldown: 0.15,
    };
    opts.showToast('Eat my cupcakes!');
    opts.onCupcakeUsed?.();
    return true;
  }

  function updateCupcakes(dt) {
    const step = dt * speedMult;

    if (cupcakeSalvo.active) {
      cupcakeSalvo.cooldown -= step;
      if (cupcakeSalvo.cooldown <= 0 && cupcakeSalvo.remaining > 0) {
        launchCupcakeMissile();
        cupcakeSalvo.remaining -= 1;
        cupcakeSalvo.cooldown = CUPCAKE.salvoInterval;
      }
      if (cupcakeSalvo.remaining <= 0 && cupcakeSalvo.cooldown <= 0) {
        cupcakeSalvo.active = false;
      }
    }

    cupcakeMissiles.forEach((m) => {
      if (!m.alive) return;
      let target = m.targetId != null ? resolveCupcakeTarget(m.targetId) : null;
      if (target) m.targetId = target.id;
      else {
        m.alive = false;
        return;
      }

      const tpos = enemyWorldPos(target);
      const desired = Math.atan2(tpos.y - m.y, tpos.x - m.x);
      m.angle = steerAngle(m.angle, desired, CUPCAKE.turnRate * step);
      m.x += Math.cos(m.angle) * m.speed * step;
      m.y += Math.sin(m.angle) * m.speed * step;

      m.trail.push({ x: m.x, y: m.y, life: 1 });
      if (m.trail.length > CUPCAKE.trailMax) m.trail.shift();
      m.trail.forEach((p) => {
        p.life -= CUPCAKE.trailFade * step;
      });
      m.trail = m.trail.filter((p) => p.life > 0);

      if (Math.hypot(tpos.x - m.x, tpos.y - m.y) <= CUPCAKE.hitRadius) {
        applyCupcakeExplosion(m.x, m.y);
        m.alive = false;
      }
    });
    cupcakeMissiles = cupcakeMissiles.filter((m) => m.alive);

    tickBurstEffects(step);

    if (
      cupcakeUsed &&
      !cupcakeSalvo.active &&
      cupcakeMissiles.length === 0 &&
      cupcakeBursts.length === 0 &&
      nukeKillBursts.length === 0 &&
      !cupcakeFinishedNotified
    ) {
      cupcakeFinishedNotified = true;
      cupcakeUsed = false;
      grannyNukePose = false;
      opts.onCupcakeFinished?.();
    }
  }

  function tickBurstEffects(dt) {
    nukeKillBursts.forEach((b) => {
      b.time += dt;
    });
    nukeKillBursts = nukeKillBursts.filter((b) => b.time < b.duration);
    cupcakeBursts.forEach((b) => {
      b.time += dt;
    });
    cupcakeBursts = cupcakeBursts.filter((b) => b.time < b.duration);
  }

  function drawCupcakeMissiles() {
    const scale = Math.max(0.85, height / 576);
    const size = 22 * scale;

    cupcakeMissiles.forEach((m) => {
      m.trail.forEach((p, i) => {
        const alpha = p.life * 0.45 * (0.35 + (i / CUPCAKE.trailMax) * 0.65);
        const r = size * 0.22 * p.life;
        ctx.fillStyle = `rgba(120, 120, 120, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle - CUPCAKE.forwardAngle);
      if (cupcakeImg) {
        const aspect = cupcakeImg.width / cupcakeImg.height || 1;
        const h = size;
        const w = h * aspect;
        ctx.drawImage(cupcakeImg, -w / 2, -h / 2, w, h);
      } else {
        ctx.fillStyle = '#ff6bcb';
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.38, size * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff5';
        ctx.beginPath();
        ctx.arc(0, -size * 0.18, size * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.arc(size * 0.12, -size * 0.28, size * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    drawCupcakeBursts();
  }

  function drawCupcakeBursts() {
    cupcakeBursts.forEach((b) => {
      const t = b.time / b.duration;
      const alpha = (1 - t) * 0.75;
      const radius = NUKE_AOE * (0.35 + t * 0.85);
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius);
      grd.addColorStop(0, `rgba(255, 245, 200, ${alpha})`);
      grd.addColorStop(0.35, `rgba(255, 140, 40, ${alpha * 0.8})`);
      grd.addColorStop(0.7, `rgba(255, 80, 20, ${alpha * 0.35})`);
      grd.addColorStop(1, 'rgba(255, 80, 20, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 220, 120, ${(1 - t) * 0.55})`;
      ctx.lineWidth = 3 * (1 - t);
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius * 0.55 + t * radius * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  function drawNukeKillBursts() {
    nukeKillBursts.forEach((b) => {
      const t = b.time / b.duration;
      const alpha = 1 - t;

      const flashR = b.size * (0.35 + t * 1.35);
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, flashR);
      grd.addColorStop(0, `rgba(255, 250, 210, ${alpha * 0.95})`);
      grd.addColorStop(0.3, `rgba(255, 130, 45, ${alpha * 0.7})`);
      grd.addColorStop(1, 'rgba(255, 80, 20, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, flashR, 0, Math.PI * 2);
      ctx.fill();

      if (b.isBoss && t < 0.85) {
        const ringR = b.size * (0.2 + t * 1.1);
        ctx.strokeStyle = `rgba(255, 220, 140, ${alpha * (1 - t * 0.9)})`;
        ctx.lineWidth = Math.max(2, b.size * 0.04 * (1 - t));
        ctx.beginPath();
        ctx.arc(b.x, b.y, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      b.sparks.forEach((s) => {
        const spread = s.spread ?? 0.5;
        const dist = b.size * (spread * (b.isBoss ? 0.55 : 0.25) + t * (b.isBoss ? 1.35 : 1.5));
        const px = b.x + Math.cos(s.angle) * dist;
        const py = b.y + Math.sin(s.angle) * dist;
        const r = b.size * (b.isBoss ? 0.09 : 0.12) * (0.55 + (1 - t) * 0.45);
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.65})`;
      ctx.lineWidth = 2 * (1 - t);
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + t * 0.8;
        const len = b.size * (0.25 + t * 0.9);
        ctx.beginPath();
        ctx.moveTo(b.x + Math.cos(a) * b.size * 0.1, b.y + Math.sin(a) * b.size * 0.1);
        ctx.lineTo(b.x + Math.cos(a) * len, b.y + Math.sin(a) * len);
        ctx.stroke();
      }
    });
  }

  function drawGranny() {
    if (!isCacheUnlocked() || !grannyImg) return;
    const nuking = grannyNukePose && grannyNukeImg;
    const { x, baseY, w, h, rightX, flipX, img } = grannyLayout();
    const sprite = img ?? grannyImg;
    const rock = nuking
      ? Math.sin(grannyRockTime * 5.5) * 0.018
      : Math.sin(grannyRockTime * 2.2) * 0.035;
    const pivotX = flipX ? rightX - w / 2 : x + w / 2;
    const pivotY = baseY;

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(rock);
    ctx.translate(-pivotX, -pivotY);
    if (flipX) {
      ctx.drawImage(sprite, rightX, baseY - h, -w, h);
    } else {
      ctx.drawImage(sprite, x, baseY - h, w, h);
    }
    ctx.restore();
  }

  function rewardKill(isBoss, x, y) {
    let xp = isBoss ? bossKillBudgetXp : killBudgetXp;
    if (x != null && y != null) {
      for (const t of towers) {
        if (t.wrecked) continue;
        const def = defOf(t.type);
        if (def.role !== 'magnet' || !isTowerOperational(t)) continue;
        if (Math.hypot(x - t.x, y - t.y) <= (def.magnetRadius ?? 100)) {
          xp += def.magnetBonus ?? 1;
        }
      }
    }
    const rect = canvas.getBoundingClientRect();
    opts.onKillReward?.({
      isBoss,
      xp,
      screenX: x != null ? rect.left + x : undefined,
      screenY: y != null ? rect.top + y : undefined,
    });
  }

  function applyDamage(x, y, damage, aoe, primaryId, sourceType) {
    if (aoe > 0) {
      enemies.forEach((e) => {
        const pos = enemyWorldPos(e);
        if (Math.hypot(pos.x - x, pos.y - y) <= aoe) {
          e.hp -= damage;
        }
      });
    } else {
      const e = enemies.find((en) => en.id === primaryId);
      if (e) e.hp -= damage;
    }
    if (sourceType) applyTurretStatus(sourceType, x, y, aoe, primaryId);

    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0) {
        const dead = enemies[i];
        enemies.splice(i, 1);
        onEnemyDestroyed(dead);
      }
    }
  }

  function tickPortalAnim(dt) {
    if (phase === 'deploy' || phase === 'announce' || phase === 'wave') {
      portalAnimTime += dt;
      if (portalSpawnPulse > 0) {
        portalSpawnPulse = Math.max(0, portalSpawnPulse - dt * 2.8);
      }
    }
  }

  function tickGrannyRock(dt) {
    if (isCacheUnlocked()) grannyRockTime += dt;
  }

  function tickSiegeClock(dt) {
    siegeTimeLeft = Math.max(0, siegeTimeLeft - dt);
    if (siegeTimeLeft <= 0 && !siegeTimerEnded) {
      siegeTimerEnded = true;
      opts.showToast('Time! Blast what\'s left!');
    }
  }

  function shouldAnimate() {
    return phase === 'announce' || phase === 'wave' || phase === 'deploy' || phase === 'finale';
  }

  function update(dt) {
    garden.update(dt);
    if (phase === 'finale') {
      tickBurstEffects(dt);
      if (
        pendingMissionEnd &&
        ((nukeKillBursts.length === 0 && cupcakeBursts.length === 0) ||
          performance.now() - pendingMissionEnd.startedAt > 1200)
      ) {
        endMission(pendingMissionEnd.won);
      }
      return;
    }

    if (phase === 'deploy') {
      tickBuildTimers(dt);
      tickPortalAnim(dt);
      tickGrannyRock(dt);
      return;
    }

    if (phase === 'announce') {
      tickBuildTimers(dt);
      tickPortalAnim(dt);
      tickGrannyRock(dt);
      if (siegeArmed) tickSiegeClock(dt);
      if (splashProgress() >= 1) {
        splash.active = false;
        beginWaveCombat();
      }
      return;
    }

    if (phase === 'wave') {
      tickPortalAnim(dt);
      tickGrannyRock(dt);
    } else {
      return;
    }

    tickBuildTimers(dt * speedMult);
    tickSiegeClock(dt);

    waveTime += dt;
    updateSpawner();

    enemies.forEach((e) => {
      let spd = e.speed;
      if (e.freezeUntil > waveTime) spd = 0;
      else if (e.slowUntil > waveTime) spd *= 0.45;
      if (enemyLuredByDecoy(e)) spd *= 0.35;
      if (maze) mazeMove(e, spd * dt * speedMult * (pathEndX - pathStartX));
      else e.progress += spd * dt * speedMult;
    });

    enemies = enemies.filter((e) => {
      if (e.progress >= 1) {
        totalLeaks += 1;
        opts.onLeak?.({ leaks: totalLeaks, maxLeaks, penalty: leakCoinPenalty });
        return false;
      }
      return true;
    });

    if (totalLeaks >= maxLeaks) {
      requestMissionEnd(bonusPlayed);
      return;
    }

    updateCupcakes(dt);

    updateRepairTowers(dt * speedMult);

    towers.forEach((t) => fireTower(t, dt * speedMult));
    enemies.forEach((e) => fireEnemy(e, dt * speedMult));

    projectiles.forEach((p) => {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      const step = p.speed * dt * speedMult;
      if (step >= dist) {
        applyDamage(p.tx, p.ty, p.damage, p.aoe, p.targetId, p.type);
        p.speed = 0;
      } else {
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        p.angle = Math.atan2(dy, dx);
      }
    });
    projectiles = projectiles.filter((p) => p.speed > 0);

    enemyShots.forEach((s) => {
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const dist = Math.hypot(dx, dy);
      const step = s.speed * dt * speedMult;
      if (step >= dist) {
        damageTower(s.towerRow, s.towerCol, s.damage);
        s.speed = 0;
      } else {
        s.x += (dx / dist) * step;
        s.y += (dy / dist) * step;
      }
    });
    enemyShots = enemyShots.filter((s) => s.speed > 0);

    checkWaveClear();
    syncNukeUi();
  }

  function checkWaveClear() {
    const cfg = getWaveConfig();
    if (!cfg) return;

    if (siegeTimerEnded || siegeTimeLeft <= 0) {
      if (enemies.length === 0) finishAtTimeLimit();
      return;
    }

    if (spawner.spawned >= cfg.totalSpawns && enemies.length === 0) {
      finishCurrentWave();
    }
  }

  /** Stop at the original minute and let students choose whether to play the
   * earned extra time. Their 60-second result is locked in either way.
   */
  function finishAtTimeLimit() {
    if (!bonusPlayed && !bonusOffered && bonusAvailable > 0 && totalLeaks < maxLeaks) {
      bonusOffered = true;
      baseLeaks = totalLeaks;
      baseKills = totalKills;
      opts.audio?.stopScuttling?.();
      setPhase('bonus-offer');
      opts.onBonusOffer?.(bonusAvailable);
      return;
    }
    requestMissionEnd(bonusPlayed ? true : totalLeaks < maxLeaks);
  }

  /** Called only from an explicit user click on the bonus choice panel. */
  function chooseBonusAssault(accept) {
    if (phase !== 'bonus-offer') return false;
    if (!accept) {
      requestMissionEnd(true);
      return true;
    }
    bonusPlayed = true;
    siegeTimeLeft = bonusAvailable;
    siegeTimerEnded = false;
    opts.showToast(`BONUS ASSAULT! +${bonusAvailable}s. Your first victory is safe!`);
    showWaveSplash(wavesCompleted + 1);
    return true;
  }

  function showWaveSplash(waveNum) {
    const cfg = getWaveConfig();
    const opening = maze ? MAZE_GATES.find((g) => g.opensAtWave === waveNum && g.announce) : null;
    if (opening?.announce) opts.showToast(opening.announce);
    splash = {
      active: true,
      waveNum,
      codename: cfg.codename,
      startMs: performance.now(),
      duration: ANNOUNCE_SPLASH_SEC,
    };
    opts.audio?.playWaveWarning(waveNum);
    opts.audio?.startScuttling(waveNum);
    setPhase('announce');
    if (!rafId) {
      lastTs = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  function beginWaveCombat() {
    setPhase('wave');
    waveTime = 0;
    waveKills = 0;
    enemies = [];
    projectiles = [];
    enemyShots = [];
    cupcakeMissiles = [];
    cupcakeSalvo = { active: false, remaining: 0, cooldown: 0 };
    cupcakeBursts = [];
    nukeKillBursts = [];
    cupcakeUsed = false;
    cupcakeFinishedNotified = false;
    grannyNukePose = false;
    initSpawner();
    opts.audio?.startScuttling(wavesCompleted + 1);
    lastTs = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function canPlaceTurrets() {
    return phase === 'deploy' || phase === 'wave' || phase === 'announce';
  }

  function startWave() {
    if (phase !== 'deploy') return false;
    if (wavesCompleted === 0) {
      totalKills = 0;
      totalLeaks = 0;
      defeated = false;
      siegeTimeLeft = siegeDuration;
      siegeTimerEnded = false;
      siegeArmed = true;
      granddaddySpawnedThisSiege = false;
    }
    currentWaveIndex = wavesCompleted;
    showWaveSplash(wavesCompleted + 1);
    return true;
  }

  function tryAutoStartWave() {
    if (!goLive || phase !== 'deploy') return;
    startWave();
  }

  function finishCurrentWave() {
    if (defeated) return;
    opts.audio?.stopScuttling();
    wavesCompleted += 1;
    opts.onWaveCleared?.({
      wave: wavesCompleted,
      nextWave: siegeTimeLeft > 0 ? wavesCompleted + 1 : null,
    });
    projectiles = [];
    enemyShots = [];
    if (siegeTimeLeft <= 0 || siegeTimerEnded) {
      finishAtTimeLimit();
      return;
    }
    showWaveSplash(wavesCompleted + 1);
  }

  function requestMissionEnd(won) {
    if (phase === 'done' || phase === 'finale') return;
    if (nukeKillBursts.length > 0 || cupcakeBursts.length > 0) {
      pendingMissionEnd = { won, startedAt: performance.now() };
      enemies = [];
      projectiles = [];
      enemyShots = [];
      setPhase('finale');
      if (!rafId) {
        lastTs = 0;
        rafId = requestAnimationFrame(loop);
      }
      return;
    }
    endMission(won);
  }

  function endMission(won) {
    if (phase === 'done') return;
    pendingMissionEnd = null;
    opts.audio?.stopScuttling();
    opts.audio?.fadeOutMothership?.();
    defeated = !won;
    setPhase('done');
    cancelAnimationFrame(rafId);
    rafId = 0;
    opts.onMissionEnd({
      kills: totalKills,
      leaks: bonusPlayed ? baseLeaks : totalLeaks,
      won: bonusPlayed ? true : won,
      maxLeaks,
      wavesCleared: wavesCompleted,
      bonusPlayed,
      bonusKills: bonusPlayed ? Math.max(0, totalKills - baseKills) : 0,
    });
    if (won) {
      opts.showToast(bonusPlayed ? 'Bonus assault complete! Granny keeps her victory!' : `Time! ${wavesCompleted} wave${wavesCompleted === 1 ? '' : 's'} cleared.`);
    } else if (!won && totalLeaks >= maxLeaks) {
      opts.showToast('Too many got through — Granny needs a redo!');
    }
  }

  /** @param {GateRoute} gr */
  function traceRouteLine({ gate, route }) {
    ctx.beginPath();
    ctx.moveTo(gate.spawn.x * width, gate.spawn.y * height);
    route.forEach(({ col, row }) => {
      const c = cellCenter(col, row);
      ctx.lineTo(c.x * width, c.y * height);
    });
    ctx.lineTo(MAZE_LAYOUT.porch.x * width, MAZE_LAYOUT.porch.y * height);
  }

  /** Grid and alien route on the lawn while the player is building. */
  function drawMazeOverlay() {
    const placing = Boolean(selectedType) && canPlaceTurrets();
    if (!placing && phase !== 'deploy') return;
    ctx.save();
    if (placing) {
      for (let row = 0; row < MAZE_LAYOUT.rows; row++) {
        for (let col = 0; col < MAZE_LAYOUT.cols; col++) {
          const c = cellCenter(col, row);
          const x = c.x * width - mazeCellW / 2;
          const y = c.y * height - mazeCellH / 2;
          if (isReservedCell(col, row)) {
            ctx.fillStyle = 'rgba(255, 210, 80, 0.12)';
            ctx.fillRect(x + 1, y + 1, mazeCellW - 2, mazeCellH - 2);
          }
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, mazeCellW - 1, mazeCellH - 1);
        }
      }
    }
    const pulse = 0.55 + 0.25 * Math.sin(portalAnimTime * 3);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([2, 10]);
    ctx.lineDashOffset = -portalAnimTime * 30;
    const waveNum = currentWaveNum();
    const soon = gateOpeningAfter(waveNum);
    const shown = (/** @type {GateRoute} */ gr) => gr.gate.opensAtWave <= waveNum || gr.gate === soon;
    const ghosts = pointerActive ? mazeGhostRoutes : null;
    ctx.lineWidth = 5;
    mazeRoutes.filter(shown).forEach((gr) => {
      if (!gr.route.length) return;
      traceRouteLine(gr);
      const upcoming = gr.gate.opensAtWave > waveNum;
      ctx.strokeStyle = upcoming
        ? `rgba(255, 120, 60, ${ghosts ? 0.25 : pulse * 0.6})`
        : `rgba(255, 214, 90, ${ghosts ? 0.35 : pulse})`;
      ctx.stroke();
    });
    ghosts?.filter(shown).forEach((gr) => {
      if (!gr.route.length) return;
      traceRouteLine(gr);
      ctx.strokeStyle = `rgba(120, 240, 255, ${pulse + 0.2})`;
      ctx.stroke();
    });
    ctx.restore();
  }

  /** Side gates swirl once open; the next one to open flashes a warning. */
  function drawGateMarkers() {
    const waveNum = currentWaveNum();
    MAZE_GATES.forEach((gate) => {
      if (gate.id === 'west' || gate.opensAtWave > waveNum) return;
      drawAlienPortalVfx(ctx, {
        width,
        height,
        time: portalAnimTime + gate.opensAtWave,
        portal: { cx: gate.spawn.x, cy: gate.spawn.y, radius: 0.05, socketCount: 6 },
        spawnPulse: 1,
      });
    });
    const soon = gateOpeningAfter(waveNum);
    if (!soon || phase === 'done' || phase === 'finale') return;
    const x = soon.spawn.x * width;
    const y = Math.min(height - 22, Math.max(22, soon.spawn.y * height));
    const r = Math.max(12, height * 0.026);
    const blink = 0.55 + 0.45 * Math.sin(portalAnimTime * 6);
    ctx.save();
    ctx.fillStyle = `rgba(220, 40, 30, ${0.55 + blink * 0.4})`;
    ctx.strokeStyle = '#fff3d6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r * (1 + blink * 0.12), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(r * 1.4)}px Bangers, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y + 1);
    ctx.font = `${Math.round(r * 0.85)}px Bangers, sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(40, 10, 0, 0.85)';
    const label = `${soon.name.toUpperCase()} OPENS NEXT WAVE`;
    const ly = soon.spawn.y > 0.5 ? y - r * 1.9 : y + r * 1.9;
    ctx.strokeText(label, x, ly);
    ctx.fillStyle = '#ffd36b';
    ctx.fillText(label, x, ly);
    ctx.restore();
  }

  function drawPortalVfx() {
    const portal = maze ? MAZE_LAYOUT.portal : FIELD_LAYOUT.alienPortal;
    if (!portal) return;
    drawAlienPortalVfx(ctx, {
      width,
      height,
      time: portalAnimTime,
      portal,
      spawnPulse: portalSpawnPulse,
    });
  }

  function drawField() {
    if (fieldImg) {
      ctx.drawImage(fieldImg, 0, 0, width, height);
      if (maze && mazePortalImg) {
        const ps = MAZE_LAYOUT.portalSprite;
        const pw = ps.w * width;
        const ph = ps.h * height;
        ctx.drawImage(mazePortalImg, ps.cx * width - ps.anchorX * pw, ps.cy * height - ps.anchorY * ph, pw, ph);
      }
    } else {
      const grd = ctx.createLinearGradient(0, 0, 0, height);
      grd.addColorStop(0, '#1a3d1a');
      grd.addColorStop(1, '#0f2610');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);

      pathY.forEach((y) => {
        ctx.fillStyle = 'rgba(90, 60, 30, 0.55)';
        ctx.fillRect(pathStartX, y - 12, pathEndX - pathStartX, 24);
      });
      turretRowY.forEach((y) => {
        ctx.fillStyle = 'rgba(60, 120, 60, 0.25)';
        ctx.fillRect(pathStartX, y - 10, pathEndX - pathStartX, 20);
      });
    }
  }

  function drawTurretAt(type, x, y, { wrecked = false, ghost = false, valid = true, variant = 0 } = {}) {
    const sz = Math.max(36, cellRadius() * 2.6);
    const anchorY = FIELD_LAYOUT.turretAnchorY;
    const def = defOf(type);
    if (type === 'hedge') {
      ctx.save();
      if (wrecked || (ghost && !valid)) ctx.filter = 'grayscale(1) brightness(0.55)';
      if (ghost) ctx.globalAlpha = valid ? 0.85 : 0.7;
      const img = hedgeImgs[variant % hedgeImgs.length];
      if (img) {
        // Square top-down tiles: overfill the cell a touch so neighbours knit into one wall.
        const dw = mazeCellW * 1.08;
        const dh = mazeCellH * 1.12;
        const cy = y - mazeCellH * 0.36;
        ctx.drawImage(img, x - dw / 2, cy - dh / 2, dw, dh);
      } else {
        drawHedge(ctx, x, y - mazeCellH * 0.36, mazeCellW, mazeCellH);
      }
      ctx.restore();
      return;
    }
    const img = wrecked ? wreckedSprites[type] ?? turretSprites[type] : turretSprites[type];

    ctx.save();
    if (wrecked && !wreckedSprites[type]) {
      ctx.filter = 'grayscale(1) brightness(0.55)';
    }
    if (ghost && !valid) {
      ctx.filter = 'grayscale(1) brightness(0.5)';
      ctx.globalAlpha = 0.75;
    } else if (ghost) {
      ctx.globalAlpha = 0.88;
    }

    if (!wrecked && !ghost && turretLevel(type) === 3) {
      ctx.filter = 'saturate(1.35) brightness(1.12) drop-shadow(0 0 6px rgba(255, 210, 70, 0.9))';
    } else if (!wrecked && !ghost && turretLevel(type) === 2) {
      ctx.filter = 'saturate(1.2) brightness(1.06)';
    }

    if (img) {
      if (def?.flipX) {
        ctx.translate(x, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -sz / 2, -sz * anchorY, sz, sz);
      } else {
        ctx.drawImage(img, x - sz / 2, y - sz * anchorY, sz, sz);
      }
    } else {
      ctx.fillStyle = wrecked ? '#555' : def?.color ?? '#888';
      ctx.beginPath();
      ctx.arc(x, y - sz * (anchorY - 0.5), sz / 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlacementPreview() {
    if (!selectedType || !canPlaceTurrets() || !pointerActive) return;
    drawTurretAt(selectedType, placementPreview.x, placementPreview.y, {
      variant: hedgesPlaced,
      ghost: true,
      valid: placementPreview.valid,
    });
  }

  function drawBuildRing(t) {
    if (t.buildRemaining <= 0 || t.wrecked) return;
    const sz = Math.max(36, cellRadius() * 2.6);
    const anchorY = FIELD_LAYOUT.turretAnchorY;
    const progress = 1 - t.buildRemaining / t.buildTotal;
    const r = Math.max(22, cellRadius() * 1.15);
    const cy = t.y - sz * anchorY * 0.55;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 50, 45, 0.28)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(t.x, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
  }

  /** Upgraded turrets stand on a pulsing aura in their colour; level 3 glows gold and throws sparks. */
  function drawUpgradeAura(t, sz) {
    const level = turretLevel(t.type);
    if (level < 2) return;
    const def = defOf(t.type);
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 260 + t.x);
    const cy = t.y - sz * 0.05;
    const r = sz * (level === 3 ? 0.62 : 0.52) * (0.92 + pulse * 0.1);
    const colour = level === 3 ? '255, 205, 60' : hexToRgb(def?.color ?? '#7cfc00');
    ctx.save();
    const glow = ctx.createRadialGradient(t.x, cy, r * 0.1, t.x, cy, r);
    glow.addColorStop(0, `rgba(${colour}, ${0.42 + pulse * 0.25})`);
    glow.addColorStop(1, `rgba(${colour}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(t.x, cy, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    if (level === 3) {
      const now = performance.now() / 1000;
      for (let i = 0; i < 4; i++) {
        const a = now * 1.6 + i * (Math.PI / 2) + t.x;
        const sx = t.x + Math.cos(a) * sz * 0.42;
        const sy = t.y - sz * 0.45 + Math.sin(a * 1.3) * sz * 0.22;
        ctx.fillStyle = `rgba(255, 236, 140, ${0.55 + 0.45 * Math.sin(a * 2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1.5, sz * 0.035), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Gold stars under an upgraded turret show its level at a glance. */
  function drawUpgradeStars(t, sz) {
    const level = turretLevel(t.type);
    if (level < 2) return;
    ctx.save();
    ctx.font = `900 ${Math.max(10, Math.round(sz * 0.22))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(30, 16, 0, 0.85)';
    ctx.fillStyle = level === 3 ? '#ffd84a' : '#fff1a8';
    const text = '★'.repeat(level);
    const y = t.y + sz * 0.16;
    ctx.strokeText(text, t.x, y);
    ctx.fillText(text, t.x, y);
    ctx.restore();
  }

  function hexToRgb(hex) {
    const h = String(hex).replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  }

  function drawTowers() {
    const sz = Math.max(36, cellRadius() * 2.6);
    const anchorY = FIELD_LAYOUT.turretAnchorY;
    const drawOrder = maze ? [...towers].sort((a, b) => a.y - b.y) : towers;
    drawOrder.forEach((t) => {
      const building = t.buildRemaining > 0 && !t.wrecked;
      if (building) {
        ctx.save();
        ctx.globalAlpha = 0.72;
        drawTurretAt(t.type, t.x, t.y, { wrecked: t.wrecked, variant: t.variant });
        ctx.restore();
      } else if (t.wrecked) {
        // Shakes, then fades and sinks as it crumbles away.
        const left = WRECK_CLEAR_SECONDS - (t.wreckAge ?? 0);
        const crumbling = Math.max(0, Math.min(1, left / WRECK_FADE_SECONDS));
        const shake = left < WRECK_FADE_SECONDS + 0.6 ? Math.sin((t.wreckAge ?? 0) * 60) * 1.6 : 0;
        ctx.save();
        ctx.globalAlpha = crumbling;
        ctx.translate(shake, (1 - crumbling) * sz * 0.25);
        drawTurretAt(t.type, t.x, t.y, { wrecked: true, variant: t.variant });
        ctx.restore();
      } else {
        drawUpgradeAura(t, sz);
        drawTurretAt(t.type, t.x, t.y, { wrecked: false, variant: t.variant });
        drawUpgradeStars(t, sz);
      }
      drawBuildRing(t);

      if (!t.wrecked && t.hp < t.maxHp) {
        const barW = sz * 0.85;
        const barY = t.y - sz * anchorY - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(t.x - barW / 2, barY, barW, 4);
        ctx.fillStyle = t.hp / t.maxHp > 0.35 ? '#7cfc00' : '#ff6b35';
        ctx.fillRect(t.x - barW / 2, barY, barW * (t.hp / t.maxHp), 4);
      }
    });
  }

  function drawEnemies() {
    const baseSize = Math.max(32, height * 0.082);
    enemies.forEach((e) => {
      const pos = enemyDrawPos(e);
      const key = spriteKeyForEnemy(e);
      const img = enemySprites[key];
      const size = spriteSizeForEnemy(e, baseSize);

      if (e.flying) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + size * 0.75, size * 0.36, size * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (img) {
        ctx.drawImage(img, pos.x - size / 2, pos.y - size / 2, size, size);
      } else {
        ctx.fillStyle = e.bossKind === 'granddaddy' ? '#ff6b35' : e.bossKind === 'mothership' ? '#7cfc00' : '#9d4edd';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const barW = size * 0.9;
      const barY = pos.y - size / 2 - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(pos.x - barW / 2, barY, barW, 4);
      ctx.fillStyle = '#7cfc00';
      ctx.fillRect(pos.x - barW / 2, barY, barW * (e.hp / e.maxHp), 4);
    });
  }

  function drawProjectiles() {
    const scale = Math.max(0.85, height / 576);
    projectiles.forEach((p) => {
      const def = defOf(p.type);
      const ammo = AMMO[p.type];
      const img = ammoSprites[p.type];
      const size = (ammo?.size ?? (def?.boltSize ?? 5) * 4) * scale;

      if (img) {
        const aspect = img.width / img.height || 1;
        const w = aspect >= 1 ? size : size * aspect;
        const h = aspect >= 1 ? size / aspect : size;
        ctx.save();
        ctx.translate(p.x, p.y);
        if (ammo?.forwardAngle !== undefined) {
          ctx.rotate(p.angle - ammo.forwardAngle);
        }
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else {
        const r = def?.boltSize ?? 5;
        ctx.fillStyle = def?.color ?? '#fff';
        ctx.shadowColor = def?.color ?? '#fff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }

  function drawEnemyShots() {
    const r = Math.max(4, height * 0.009);
    enemyShots.forEach((s) => {
      ctx.save();
      ctx.shadowColor = '#ff8c42';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  function drawWaveAnnounceBar() {
    if (!splash.active || phase !== 'announce') return;
    const t = splashProgress();
    const margin = Math.max(14, width * 0.06);
    const barW = width - margin * 2;
    const barH = Math.max(7, height * 0.012);
    const barX = margin;
    const barY = 42;
    const prefix = bonusPlayed ? 'BONUS ' : '';
    const label = splash.codename
      ? `${prefix}Wave ${splash.waveNum} — ${splash.codename}`
      : `${prefix}Wave ${splash.waveNum} incoming`;

    ctx.save();
    ctx.font = `bold ${Math.max(11, height * 0.022)}px Bangers, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(255, 213, 74, 0.92)';
    ctx.fillText(label, width / 2, barY - 4);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = 'rgba(255, 140, 66, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    if (t > 0) {
      const fillW = barW * t;
      const grd = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grd.addColorStop(0, '#ff6b35');
      grd.addColorStop(1, '#ffd54a');
      ctx.fillStyle = grd;
      ctx.fillRect(barX, barY, fillW, barH);
    }
    ctx.restore();
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, width, 36);
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 14px Bangers, sans-serif';
    ctx.textAlign = 'left';
    const budget = opts.getBudget();
    if (phase === 'wave' || phase === 'announce') {
      const waveNum = phase === 'announce' ? splash.waveNum : wavesCompleted + 1;
      const timeLabel = siegeArmed ? formatSiegeTime(siegeTimeLeft) : formatSiegeTime(siegeDuration);
      ctx.fillText(`${bonusPlayed ? 'BONUS ' : ''}Time ${timeLabel}`, 12, 24);
      ctx.fillText(`Wave ${waveNum}`, 118, 24);
      ctx.fillText(`Blasted: ${totalKills}`, 200, 24);
      ctx.fillText(`Coins: ${budget}`, width - 110, 24);
    } else if (phase === 'deploy') {
      ctx.fillText('Build your defences — YOU start the wave!', 12, 24);
      ctx.fillText(`Coins: ${budget}`, width - 110, 24);
    }
  }

  function render() {
    drawField();
    if (phase !== 'finale') {
      if (maze) drawMazeOverlay();
      garden.draw(ctx, width, height, 'ground');
      drawPortalVfx();
      if (maze) drawGateMarkers();
      drawGranny();
      drawTowers();
      drawPlacementPreview();
      drawEnemies();
      garden.draw(ctx, width, height, 'air');
      drawProjectiles();
      drawEnemyShots();
      drawCupcakeMissiles();
      drawHUD();
      drawWaveAnnounceBar();
    }
    drawNukeKillBursts();
    if (phase === 'finale') drawCupcakeBursts();
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    render();
    if (shouldAnimate()) rafId = requestAnimationFrame(loop);
    else rafId = 0;
  }

  function canvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function handleTap(clientX, clientY) {
    ensureAudioUnlocked();
    if (!canPlaceTurrets()) return;
    if (!selectedType) {
      opts.showToast('Pick a turret below first.');
      return;
    }
    if (width <= 0 || height <= 0) {
      relayout();
    }
    const { x, y } = canvasCoords(clientX, clientY);
    updatePlacementPreview(x, y);
    const pick = maze
      ? pickMazeCell(x, y)
      : pickPlacementCell(padPositions, x, y, width, height, isCellOccupied);
    if (!pick.cell) {
      opts.showToast(maze ? 'Build on the open lawn.' : 'Stay on the grass lanes — not the dirt tracks.');
      return;
    }
    if (!pick.valid) {
      const reason = 'reason' in pick ? pick.reason : 'taken';
      opts.showToast(
        reason === 'blocks'
          ? "That would trap the aliens — leave them a path!"
          : reason === 'reserved'
            ? 'Keep the gate and porch steps clear.'
            : reason === 'alien'
              ? 'An alien is standing there!'
              : 'That spot is taken.'
      );
      return;
    }
    if (!opts.trySpend(selectedType)) return;
    const def = defOf(selectedType);
    const maxHp =
      selectedType === 'hedge'
        ? HEDGE_MAX_HP
        : TURRET_MAX_HP[/** @type {keyof typeof TURRET_MAX_HP} */ (selectedType)] ?? 80;
    const buildTotal = selectedType === 'hedge' ? 0 : buildTimeForPlacementCost(def?.placementCost ?? 15);
    towers.push({
      type: selectedType,
      row: pick.cell.row,
      col: pick.cell.col,
      x: pick.cell.x,
      y: pick.cell.y,
      cooldown: 0,
      hp: maxHp,
      maxHp,
      wrecked: false,
      buildRemaining: buildTotal,
      buildTotal,
      variant: selectedType === 'hedge' ? hedgesPlaced++ % HEDGE_SPRITES.length : 0,
    });
    if (maze) {
      rebuildMaze();
      updatePlacementPreview(x, y);
    }
    opts.onTurretPlaced?.();
    tryAutoStartWave();
    render();
  }

  function relayout() {
    layout();
    render();
  }

  function ensureAudioUnlocked() {
    opts.audio?.warmUp?.();
  }

  function onPointerMove(clientX, clientY) {
    ensureAudioUnlocked();
    pointerActive = true;
    const { x, y } = canvasCoords(clientX, clientY);
    updatePlacementPreview(x, y);
    if (canPlaceTurrets() && selectedType) render();
  }

  canvas.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
  canvas.addEventListener('mouseleave', () => {
    pointerActive = false;
    render();
  });
  canvas.addEventListener('click', (e) => handleTap(e.clientX, e.clientY));
  canvas.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: true }
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches[0]) {
        e.preventDefault();
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: false }
  );
  canvas.addEventListener(
    'touchend',
    (e) => {
      if (e.changedTouches[0]) {
        handleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    },
    { passive: true }
  );

  window.addEventListener('resize', () => {
    layout();
    render();
  });

  layout();
  render();
  lastTs = 0;
  rafId = requestAnimationFrame(loop);
  requestAnimationFrame(() => {
    relayout();
  });

  return {
    setSelectedType(type) {
      selectedType = type;
      updateCanvasCursor();
      render();
    },
    startWave,
    chooseBonusAssault,
    getWavesCompleted: () => wavesCompleted,
    setSpeed(mult) {
      speedMult = mult;
    },
    setGoLive(live) {
      goLive = live;
      tryAutoStartWave();
    },
    getPhase: () => phase,
    canFireNukes() {
      if (phase !== 'wave') return false;
      if (cupcakeUsed || cupcakeSalvo.active || cupcakeMissiles.length > 0) return false;
      return enemies.length > 0;
    },
    isCupcakeActive() {
      return cupcakeSalvo.active || cupcakeMissiles.length > 0;
    },
    fireNukes() {
      if (!isCacheUnlocked()) return false;
      if (phase !== 'wave') return false;
      if (cupcakeSalvo.active || cupcakeMissiles.length > 0) return false;
      if (cupcakeUsed) return false;
      if (enemies.length === 0) {
        opts.showToast('No aliens to nuke!');
        return false;
      }
      return startCupcakeSalvo();
    },
    relayout,
    destroy() {
      opts.audio?.stopScuttling();
      opts.audio?.stopMothership?.();
      cancelAnimationFrame(rafId);
    },
  };
}
