import { TURRETS, TURRET_ORDER, TURRET_MAX_HP, loadTurretSprites, loadWreckedTurretSprites, damageVsEnemy } from './turrets-data.js?v=20261118b1';
import { effectiveTurret, turretLevel } from './turret-upgrades.js?v=20261118b1';
import { AMMO, loadAmmoSprites } from './ammo-data.js?v=20261112a1';
import { FIELD_LAYOUT, targetPathsForRow } from './field-layout.js?v=20261112a1';
import { drawAlienPortalVfx } from './portal-vfx.js';
import { buildPlacementCells, pickPlacementCell } from './placement-grid.js?v=20261112a1';
import { loadEnemySprites, pickMothershipSprite, spriteKeyForEnemy, spriteSizeForEnemy, scaledHp, scaledSpeed, scoreForEnemy } from './enemies-data.js?v=20261118b3';
import { getFieldImage, preloadField } from './preload.js?v=20261114t1';
import { CUPCAKE, pickCupcakeTarget, steerAngle } from './cupcakes.js';
import { waveConfigFor, ANNOUNCE_SPLASH_SEC, SIEGE_DURATION_SEC, BONUS_TIME_SEC } from './waves-data.js?v=20261118w8';
import { ECONOMY } from './economy.js';
import {
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
  randomFlyerFlankPoint,
  HEDGE_SMASHERS,
} from './maze-field.js?v=20261119d2';
import { createGardenLife, LAWN_SCENE, LANE_SCENE } from './garden-life.js?v=20261115y4';
import {
  YARD_PROPS,
  pickYardLayout,
  loadYardSprites,
  stampYardBlocked,
  yardOccupies,
  yardNestProp,
} from './yard-obstacles.js?v=20261119t9';

/** Build time in seconds — cost ÷ 10, minimum 1s. */
export function buildTimeForPlacementCost(cost) {
  return Math.max(1, cost / 10);
}

const { ENEMY_PATHS, TURRET_ROWS } = FIELD_LAYOUT;

/** How long a wrecked turret stays on its square, and how much of that it spends fading out. */
const WRECK_CLEAR_SECONDS = 2.5;
/** Maze mode: seconds after a wave's last spawn before the next wave rolls in. */
const MAZE_WAVE_ROLL_SEC = 5;
/** Maze mode: aliens walk right past turrets for much longer, so their shots hit softer. */
const MAZE_ALIEN_DAMAGE = 0.5;
const WRECK_FADE_SECONDS = 0.7;
/** Rare motherships against a normal mothership: tougher, a touch slower so there's time to land the hits. */
const RARE_HP = { rare: 1.8, legendary: 4 };
const RARE_SPEED = { rare: 0.85, legendary: 0.6 };
/** Drawn width, in regular-alien sizes (rare art is wide, so its height follows the art). */
const RARE_DRAW = { rare: 2.6, legendary: 5.5 };

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
 *   mission: import('./missions-data.js?v=20261114v1').Mission,
 *   getBudget: () => number,
 *   trySpend: (type: string) => boolean,
 *   onMissionEnd: (stats: { kills: number, score: number, leaks: number, won: boolean, maxLeaks: number, wavesCleared: number, bonusKills?: number, bonusPlayed?: boolean }) => void,
 *   onBonusOffer?: (seconds: number) => void,
 *   bonusSiegeSec?: number,
 *   firstSiege?: boolean,
 *   hordeRank?: number,
 *   pressure?: { hpMul?: number, countMul?: number },
 *   zapped?: number,
 *   onKillReward?: (info: { isBoss: boolean, rare: boolean, xp: number, screenX?: number, screenY?: number }) => void,
 *   onEnemyDestroyed?: (info: { key: import('./enemies-data.js').EnemySpriteKey }) => void,
 *   onWaveCleared?: (info: { wave: number, nextWave: number|null }) => void,
 *   onLeak?: (info: { leaks: number, maxLeaks: number, penalty: number }) => void,
 *   onPhaseChange?: (phase: 'deploy'|'announce'|'wave'|'bonus-offer'|'finale'|'done') => void,
 *   onPauseChange?: (paused: boolean) => void,
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
 *   rareShip?: import('./rare-ships.js').RareShip|null,
 *   rareFirst?: boolean,
 *   onRareShipSpawn?: (ship: import('./rare-ships.js').RareShip) => void,
 *   onRareShipEscaped?: (ship: import('./rare-ships.js').RareShip) => void,
 *   onRareShipDestroyed?: (ship: import('./rare-ships.js').RareShip, at: { screenX: number, screenY: number }) => void,
 *   onCupcakeUsed?: () => void,
 *   onCupcakeFinished?: () => void,
 *   onNukeStateChange?: () => void,
 *   yardLayout?: string|number|null,
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
  /** A rare mothership leads the end of the opening assault, once per siege. */
  const rareShip = opts.rareShip ?? null;
  const rareSprite = rareShip ? Object.assign(new Image(), { src: rareShip.src }) : null;
  let rareSpawned = false;
  let nukeUiSig = '';
  let siegeTimeLeft = 0;
  let siegeTimerEnded = false;
  let siegeArmed = false;
  let bonusPlayed = false;
  let bonusOffered = false;
  let baseLeaks = 0;
  let baseKills = 0;

  const maze = Boolean(opts.maze);
  const yardWant = opts.yardLayout;
  const yardLayout =
    maze && yardWant !== 'none' && yardWant !== 'off'
      // null → random among layouts that force a real path bend (not corner decoration).
      ? pickYardLayout(yardWant == null || yardWant === '' ? null : yardWant)
      : null;
  const yardItems = yardLayout?.items ?? [];
  /** @type {Record<string, HTMLImageElement>} */
  let yardSprites = {};
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
  /** Freeze combat so kids can place turrets mid-fight (Fieldrunners-style). */
  let battlePaused = false;
  /** @type {{ won: boolean, startedAt: number }|null} */
  let pendingMissionEnd = null;
  let waveTime = 0;
  let speedMult = 1;
  let goLive = false;
  let waveKills = 0;
  let totalKills = 0;
  /** Weighted arcade score (not kill count — friend challenges still use kills). */
  let totalScore = 0;
  let totalLeaks = 0;
  let currentWaveIndex = 0;
  let wavesCompleted = 0;
  let rafId = 0;
  let lastTs = 0;

  /** @type {string|null} */
  let selectedType = null;

  /** @type {{ spawned: number, nextSpawnAt: number, burstLeft: number, lastAt: number }} */
  let spawner = { spawned: 0, nextSpawnAt: 0, burstLeft: 0, lastAt: 0 };

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
    if (removalTarget && (removalTarget.wrecked || !towers.includes(removalTarget))) clearRemoval();
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
    if (yardItems.length) stampYardBlocked(mazeBlocked, yardItems);
    // Wrecks stop blocking immediately so the breach opens — kids can plug it again.
    towers.forEach((t) => {
      if (t.wrecked) return;
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
    if (yardItems.length && yardOccupies(yardItems, hit.col, hit.row)) {
      return { ...base, valid: false, reason: 'yard' };
    }
    // Live turret/hedge blocks the square; a wreck can be rebuilt over.
    if (towers.some((t) => !t.wrecked && t.row === hit.row && t.col === hit.col)) {
      return { ...base, valid: false, reason: 'taken' };
    }
    if (isReservedCell(hit.col, hit.row)) return { ...base, valid: false, reason: 'reserved' };
    const placeIdx = cellIndex(hit.col, hit.row);
    const underfoot = mazeCellsUnderfoot();
    // Plug breaches while aliens pour through: ignore underfoot on this cell, and only
    // keep routes for open (+ next) gates so a mid-fight rebuild isn't blocked by a flank
    // that hasn't opened yet.
    const mustReach = [...underfoot].filter((idx) => idx !== placeIdx);
    const check = blockingKeepsRoute(
      mazeBlocked,
      hit.col,
      hit.row,
      mustReach,
      openGates(currentWaveNum() + 1)
    );
    if (!check.ok || !check.trial) return { ...base, valid: false, reason: 'blocks' };
    return { ...base, valid: true, routes: routesFor(check.dist, check.trial) };
  }

  /* ---------- Removing a placed hedge or turret ---------- */

  /** @type {any} */
  let removalTarget = null;
  /** @type {HTMLElement|null} */
  let removalUi = null;

  /** What the tapped square holds. */
  function towerAt(px, py) {
    if (width <= 0 || height <= 0) return null;
    if (maze) {
      const hit = cellAtPoint(px / width, py / height);
      return hit ? towers.find((t) => t.row === hit.row && t.col === hit.col) ?? null : null;
    }
    const pick = pickPlacementCell(padPositions, px, py, width, height, () => false);
    return pick.cell ? towers.find((t) => t.row === pick.cell.row && t.col === pick.cell.col) ?? null : null;
  }

  /** A turret's top pokes into the empty square above it, so a tap there may mean that turret. */
  function towerPokingInto(px, py) {
    if (!maze || width <= 0 || height <= 0) return null;
    const hit = cellAtPoint(px / width, py / height);
    return hit ? towers.find((t) => t.type !== 'hedge' && t.row === hit.row + 1 && t.col === hit.col) ?? null : null;
  }

  /** @param {any} tower */
  function tapTower(tower) {
    if (tower.wrecked) opts.showToast('That wreck will crumble away in a moment.');
    else if (tower === removalTarget) clearRemoval();
    else selectForRemoval(tower);
  }

  /** Full refund while it is still being built (a misplaced tap); half once it is working. */
  function refundFor(tower) {
    const cost = defOf(tower.type)?.placementCost ?? 0;
    return tower.buildRemaining > 0 ? cost : Math.floor(cost / 2);
  }

  function clearRemoval() {
    removalTarget = null;
    removalUi?.remove();
    removalUi = null;
  }

  function positionRemovalUi() {
    if (!removalUi || !removalTarget) return;
    const rect = canvas.getBoundingClientRect();
    const size = maze ? Math.max(mazeCellW, mazeCellH) * 1.25 : cellRadius() * 2.6;
    const cy = maze ? removalTarget.y - mazeCellH * 0.36 : removalTarget.y;
    removalUi.style.left = `${rect.left + removalTarget.x}px`;
    removalUi.style.top = `${rect.top + cy}px`;
    removalUi.style.setProperty('--ring', `${Math.round(size)}px`);
  }

  function selectForRemoval(tower) {
    clearRemoval();
    removalTarget = tower;
    const refund = refundFor(tower);
    removalUi = document.createElement('div');
    removalUi.className = 'siege-remove';
    removalUi.innerHTML = `<span class="siege-remove-ring" aria-hidden="true"></span>
      <button type="button" class="siege-remove-btn">REMOVE${refund > 0 ? ` <b>+${refund}</b>` : ''}</button>`;
    removalUi.querySelector('button')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeTower(tower);
    });
    document.body.append(removalUi);
    positionRemovalUi();
  }

  function removeTower(tower) {
    if (!towers.includes(tower)) {
      clearRemoval();
      return;
    }
    const refund = refundFor(tower);
    towers = towers.filter((t) => t !== tower);
    if (maze) rebuildMaze();
    const sz = Math.max(36, cellRadius() * 2.6);
    spawnNukeKillBurst(tower.x, tower.y - sz * 0.4, false, 0.7);
    clearRemoval();
    opts.onTowerRemoved?.({ type: tower.type, refund });
    render();
  }

  window.addEventListener('keydown', onRemovalKey);
  function onRemovalKey(e) {
    if (e.key === 'Escape' && removalTarget) clearRemoval();
  }

  function setPhase(next) {
    phase = next;
    if (next !== 'announce' && next !== 'wave') battlePaused = false;
    if (!canPlaceTurrets()) clearRemoval();
    updateCanvasCursor();
    opts.onPhaseChange?.(next);
  }

  function pauseBattle() {
    if (phase !== 'announce' && phase !== 'wave') return false;
    if (battlePaused) return true;
    battlePaused = true;
    opts.audio?.pauseScuttling?.();
    opts.onPauseChange?.(true);
    render();
    return true;
  }

  function resumeBattle() {
    if (!battlePaused) return false;
    battlePaused = false;
    lastTs = 0;
    opts.audio?.resumeScuttling?.();
    opts.onPauseChange?.(false);
    if (!rafId && shouldAnimate()) {
      rafId = requestAnimationFrame(loop);
    }
    render();
    return true;
  }

  function isBattlePaused() {
    return battlePaused;
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
    if (yardItems.length) {
      loadYardSprites()
        .then((sprites) => {
          yardSprites = sprites;
          render();
        })
        .catch(() => {});
      rebuildMaze();
    }
  }
  if (!fieldImg) {
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
    if (yardItems.length && yardOccupies(yardItems, col, row)) return true;
    return towers.some((t) => !t.wrecked && t.row === row && t.col === col);
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
    const cfg = waveConfigFor(waveNum, {
      spawnGranddaddy: opts.spawnGranddaddy && !granddaddySpawnedThisSiege && waveNum >= 3,
      firstSiege: Boolean(opts.firstSiege),
      rank: opts.hordeRank ?? 0,
      zapped: opts.zapped ?? 0,
      pressure: opts.pressure,
    });
    if (waveNum !== 1 || !rareShip) return cfg;
    const rareSlot = { unit: 'rare', isBoss: true };
    const spawnQueue = opts.rareFirst ? [rareSlot, ...cfg.spawnQueue] : [...cfg.spawnQueue, rareSlot];
    return { ...cfg, spawnQueue, totalSpawns: spawnQueue.length };
  }

  function formatSiegeTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function initSpawner() {
    spawner = { spawned: 0, nextSpawnAt: waveTime + 0.4, burstLeft: 0, lastAt: waveTime };
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
      opts.showToast('Flyers FLY over hedges — watch the flanks above and below the portal!');
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

    if (slot.unit === 'rare') {
      if (!rareShip || rareSpawned) return;
      rareSpawned = true;
      const legendary = rareShip.tier === 'legendary';
      const hp = Math.round(scaledHp('mothership', cfg.hpScale, ramp) * (legendary ? RARE_HP.legendary : RARE_HP.rare));
      const speed = scaledSpeed('mothership', cfg.speedMul) * (legendary ? RARE_SPEED.legendary : RARE_SPEED.rare);
      spawnEnemy(2, hp, speed, 'mothership', null, maze ? lawnSpawnFor('mothership', index) : null);
      const ship = enemies[enemies.length - 1];
      ship.rare = rareShip;
      if (legendary) {
        ship.attackDamage = 20;
        ship.attackRange = 125;
      }
      opts.onRareShipSpawn?.(rareShip);
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
    spawner.lastAt = waveTime;
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
    const flying = FLYING_UNITS.has(unit);
    // Wave 3+: flyer craft peel onto high / low flanks beside the portal (not motherships).
    /** @type {'above'|'below'|null} */
    let flyerFlank = null;
    if (flying && unit !== 'mothership' && currentWaveNum() >= 3) {
      flyerFlank = index % 2 === 0 ? 'above' : 'below';
    }
    return { gate, flying, flyerFlank };
  }

  /** @param {{ gate: import('./maze-field.js').MazeGate, flying: boolean, flyerFlank?: 'above'|'below'|null }} lawn */
  function spawnOnLawn(lawn) {
    const { gate, flying, flyerFlank } = lawn;
    const entry = bestEntryCell(mazeDist, gate) ?? gate.entries[0];
    let nx;
    let ny;
    if (flyerFlank) {
      const at = randomFlyerFlankPoint(flyerFlank);
      nx = at.x;
      ny = at.y;
    } else {
      const sideways = gate.id === 'west' ? 0 : (Math.random() - 0.5) * 0.03;
      nx = gate.spawn.x + sideways;
      ny = gate.spawn.y + (gate.id === 'west' ? (Math.random() - 0.5) * 0.04 : 0);
    }
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
    totalScore += scoreForEnemy(enemy);
    rewardKill(enemy.isBoss, pos.x, pos.y, Boolean(enemy.rare));
    if (enemy.rare) {
      const rect = canvas.getBoundingClientRect();
      opts.onRareShipDestroyed?.(enemy.rare, { screenX: rect.left + pos.x, screenY: rect.top + pos.y });
    } else {
      opts.onEnemyDestroyed?.({ key: spriteKeyForEnemy(enemy) });
    }
    opts.audio?.playDeath({
      craft: spriteKeyForEnemy(enemy),
      isBoss: enemy.isBoss,
      bossKind: enemy.bossKind,
    });
  }

  function findTarget(tower) {
    const def = defOf(tower.type);
    const bias = def.bias ?? 'any';
    let best = null;
    let bestScore = -Infinity;
    for (const e of enemies) {
      if (!rowCoversEnemy(tower.row, e)) continue;
      const pos = enemyWorldPos(e);
      const dist = Math.hypot(pos.x - tower.x, pos.y - tower.y);
      if (dist > def.range) continue;
      // Prefer the matching class when biased, then whoever is closest to the porch.
      let classBonus = 0;
      if (bias === 'air' && e.flying) classBonus = 1;
      else if (bias === 'ground' && !e.flying) classBonus = 1;
      else if (bias === 'air' && !e.flying) classBonus = -0.35;
      else if (bias === 'ground' && e.flying) classBonus = -0.35;
      const score = classBonus * 10 + e.progress;
      if (score > bestScore) {
        bestScore = score;
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
      damage: enemy.attackDamage * (tower.type === 'hedge' ? 4 : maze ? MAZE_ALIEN_DAMAGE : 1),
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
      if (maze) rebuildMaze();
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

  function rewardKill(isBoss, x, y, rare = false) {
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
      rare,
      xp,
      screenX: x != null ? rect.left + x : undefined,
      screenY: y != null ? rect.top + y : undefined,
    });
  }

  function applyDamage(x, y, damage, aoe, primaryId, sourceType) {
    const def = sourceType ? defOf(sourceType) : null;
    if (aoe > 0) {
      enemies.forEach((e) => {
        const pos = enemyWorldPos(e);
        if (Math.hypot(pos.x - x, pos.y - y) <= aoe) {
          e.hp -= damageVsEnemy(def, e, damage);
        }
      });
    } else {
      const e = enemies.find((en) => en.id === primaryId);
      if (e) e.hp -= damageVsEnemy(def, e, damage);
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

    // Paused mid-fight: clock and aliens freeze; build / place still works.
    if (battlePaused && (phase === 'announce' || phase === 'wave')) {
      tickBuildTimers(dt);
      tickPortalAnim(dt);
      tickGrannyRock(dt);
      return;
    }

    // Maze waves overlap: aliens still in the maze keep walking (and getting
    // shot) through the next wave's announcement instead of freezing.
    const rolling = maze && phase === 'announce' && enemies.length > 0;
    if (phase === 'announce') {
      tickPortalAnim(dt);
      tickGrannyRock(dt);
      if (siegeArmed) tickSiegeClock(dt);
      if (splashProgress() >= 1) {
        splash.active = false;
        beginWaveCombat();
      }
      if (!rolling) {
        tickBuildTimers(dt);
        return;
      }
    } else if (phase === 'wave') {
      tickPortalAnim(dt);
      tickGrannyRock(dt);
    } else {
      return;
    }

    tickBuildTimers(dt * speedMult);
    if (!rolling) tickSiegeClock(dt);

    waveTime += dt;
    if (phase === 'wave') updateSpawner();

    enemies.forEach((e) => {
      let spd = e.speed;
      if (e.freezeUntil > waveTime) spd = 0;
      else if (e.slowUntil > waveTime) spd *= 0.45;
      if (enemyLuredByDecoy(e)) spd *= 0.35;
      if (maze) mazeMove(e, spd * dt * speedMult * (pathEndX - pathStartX));
      else e.progress += spd * dt * speedMult;
    });

    enemies = enemies.filter((e) => {
      if (e.progress >= 1 && e.rare) {
        notifyEnemyKilled(e);
        opts.onRareShipEscaped?.(e.rare);
        return false;
      }
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

    if (phase === 'wave') checkWaveClear();
    syncNukeUi();
  }

  function checkWaveClear() {
    const cfg = getWaveConfig();
    if (!cfg) return;

    if (siegeTimerEnded || siegeTimeLeft <= 0) {
      if (enemies.length === 0) finishAtTimeLimit();
      return;
    }

    if (spawner.spawned < cfg.totalSpawns) return;
    // In the maze a long route must not cost waves, so the next one rolls in
    // a few seconds after the last alien appears.
    if (enemies.length === 0 || (maze && waveTime - spawner.lastAt >= MAZE_WAVE_ROLL_SEC)) {
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
    waveKills = 0;
    if (!maze) {
      waveTime = 0;
      enemies = [];
      projectiles = [];
      enemyShots = [];
    }
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
      totalScore = 0;
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
      remaining: enemies.length,
    });
    if (!maze) {
      projectiles = [];
      enemyShots = [];
    }
    if (siegeTimeLeft <= 0 || siegeTimerEnded) {
      finishAtTimeLimit();
      return;
    }
    showWaveSplash(wavesCompleted + 1);
  }

  function requestMissionEnd(won) {
    if (phase === 'done' || phase === 'finale') return;
    const flying = enemies.find((e) => e.rare);
    if (flying?.rare) opts.onRareShipEscaped?.(flying.rare);
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
      score: totalScore,
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
    // Grid + porch/gate tint while planning — no yard-red flood (pool block looked like a hazard zone).
    if (placing && phase === 'deploy') {
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
    const pulse = 0.75 + 0.2 * Math.sin(portalAnimTime * 3);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Longer dashes / shorter gaps so the route reads on green grass.
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -portalAnimTime * 36;
    const waveNum = currentWaveNum();
    const soon = gateOpeningAfter(waveNum);
    const shown = (/** @type {GateRoute} */ gr) => gr.gate.opensAtWave <= waveNum || gr.gate === soon;
    const ghosts = pointerActive ? mazeGhostRoutes : null;
    mazeRoutes.filter(shown).forEach((gr) => {
      if (!gr.route.length) return;
      const upcoming = gr.gate.opensAtWave > waveNum;
      const alpha = ghosts ? (upcoming ? 0.45 : 0.55) : (upcoming ? 0.7 * pulse : pulse);
      // Dark understroke for contrast, then bright amber/orange on top.
      traceRouteLine(gr);
      ctx.lineWidth = 8;
      ctx.strokeStyle = `rgba(40, 18, 0, ${Math.min(0.55, alpha * 0.65)})`;
      ctx.stroke();
      traceRouteLine(gr);
      ctx.lineWidth = 5;
      ctx.strokeStyle = upcoming
        ? `rgba(255, 130, 40, ${alpha})`
        : `rgba(255, 200, 50, ${alpha})`;
      ctx.stroke();
    });
    ghosts?.filter(shown).forEach((gr) => {
      if (!gr.route.length) return;
      traceRouteLine(gr);
      ctx.lineWidth = 7;
      ctx.strokeStyle = `rgba(10, 40, 60, ${0.45})`;
      ctx.stroke();
      traceRouteLine(gr);
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = `rgba(80, 230, 255, ${Math.min(1, pulse + 0.25)})`;
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

  /** Draw one turret (and its chrome) at its lawn position. */
  function drawOneTower(t) {
    const sz = Math.max(36, cellRadius() * 2.6);
    const anchorY = FIELD_LAYOUT.turretAnchorY;
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
  }

  function drawTowers() {
    const drawOrder = maze ? [...towers].sort((a, b) => a.y - b.y) : towers;
    drawOrder.forEach(drawOneTower);
  }

  /** @param {(typeof enemies)[number]} e */
  function drawOneEnemy(e) {
    const baseSize = Math.max(32, height * 0.082);
    const pos = enemyDrawPos(e);
    const key = spriteKeyForEnemy(e);
    const img = e.rare ? rareSprite : enemySprites[key];
    const size = e.rare ? baseSize * (e.rare.tier === 'legendary' ? RARE_DRAW.legendary : RARE_DRAW.rare) : spriteSizeForEnemy(e, baseSize);

    const drawH = e.rare && img?.naturalWidth ? size * (img.naturalHeight / img.naturalWidth) : size;
    if (e.flying) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y + drawH * 0.75, size * 0.36, Math.max(drawH, size * 0.33) * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (e.rare && img?.naturalWidth) {
      drawRareAura(pos, size, drawH, e.rare.tier === 'legendary');
      ctx.drawImage(img, pos.x - size / 2, pos.y - drawH / 2, size, drawH);
    } else if (img && !e.rare) {
      ctx.drawImage(img, pos.x - size / 2, pos.y - size / 2, size, size);
    } else {
      ctx.fillStyle = e.bossKind === 'granddaddy' ? '#ff6b35' : e.bossKind === 'mothership' ? '#7cfc00' : '#9d4edd';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const barW = e.rare ? size * 0.6 : size * 0.9;
    const barY = pos.y - drawH / 2 - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(pos.x - barW / 2, barY, barW, 4);
    ctx.fillStyle = '#7cfc00';
    ctx.fillRect(pos.x - barW / 2, barY, barW * (e.hp / e.maxHp), 4);
  }

  function drawEnemies() {
    enemies.forEach(drawOneEnemy);
  }

  /** Ground aliens only — flyers stay above the yard stack. */
  function drawFlyingEnemies() {
    enemies.filter((e) => e.flying).forEach(drawOneEnemy);
  }

  /** A pulsing glow under a rare ship so it stands out from the horde. */
  function drawRareAura(pos, w, h, legendary) {
    const pulse = 0.55 + 0.45 * Math.sin(waveTime * 5);
    const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, w * 0.62);
    glow.addColorStop(0, legendary ? `rgba(255, 60, 40, ${0.5 * pulse})` : `rgba(255, 214, 90, ${0.45 * pulse})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, w * 0.62, Math.max(h, w * 0.4) * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
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
    const hudH = 72;
    const hudY = 48;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, width, hudH);
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 28px Bangers, sans-serif';
    ctx.textAlign = 'left';
    const budget = opts.getBudget();
    if (phase === 'wave' || phase === 'announce') {
      const waveNum = phase === 'announce' ? splash.waveNum : wavesCompleted + 1;
      const timeLabel = siegeArmed ? formatSiegeTime(siegeTimeLeft) : formatSiegeTime(siegeDuration);
      const gap = 28;
      let x = 12;
      const paint = (label) => {
        ctx.fillText(label, x, hudY);
        x += ctx.measureText(label).width + gap;
      };
      paint(`${bonusPlayed ? 'BONUS ' : ''}Time ${timeLabel}`);
      paint(`Wave ${waveNum}`);
      paint(`Blasted: ${totalKills}`);
      paint(`Score: ${totalScore.toLocaleString()}`);
      ctx.textAlign = 'right';
      ctx.fillText(`Coins: ${budget}`, width - 12, hudY);
      ctx.textAlign = 'left';
    } else if (phase === 'deploy') {
      ctx.fillText('Build your defences — YOU start the wave!', 12, hudY);
      ctx.textAlign = 'right';
      ctx.fillText(`Coins: ${budget}`, width - 12, hudY);
      ctx.textAlign = 'left';
    }
  }

  /** @type {Map<string, { feet: number[], pad: number }>} */
  const yardFootCache = new Map();

  /**
   * Find where the art actually touches the ground.
   * Uses a *solid* alpha threshold so soft fringe / drop-shadow in the PNG
   * doesn’t leave the metal foot or wood plank floating above the lawn.
   * Box props (planters) plant on the wide front plank, not soil drips.
   * @param {HTMLImageElement} img @param {string} id @param {'feet'|'box'=} mode
   */
  function yardFootInfo(img, id, mode = 'feet') {
    const key = `${id}:${mode}`;
    const hit = yardFootCache.get(key);
    if (hit) return hit;
    /** @type {number[]} */
    const feet = [];
    let pad = 0;
    const probe = document.createElement('canvas');
    const pw = 64;
    // Corn bed / wheelbarrow need a deep probe under the art.
    const ph = Math.min(220, img.naturalHeight || 220);
    probe.width = pw;
    probe.height = ph;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    if (!pctx || !img.naturalWidth) {
      const empty = { feet, pad: 0 };
      yardFootCache.set(key, empty);
      return empty;
    }
    pctx.drawImage(img, 0, img.naturalHeight - ph, img.naturalWidth, ph, 0, 0, pw, ph);
    const data = pctx.getImageData(0, 0, pw, ph).data;
    const rowSolid = (row) => {
      let solid = 0;
      for (let col = 0; col < pw; col++) {
        if (data[(row * pw + col) * 4 + 3] > 120) solid += 1;
      }
      return solid;
    };
    let solidLowest = -1;
    // Planter boards span most of the width; ignore narrow soil crumbs under them.
    const minSolidCols =
      mode === 'box' ? Math.max(10, Math.floor(pw * 0.35)) : Math.max(2, Math.floor(pw * 0.06));
    for (let row = ph - 1; row >= 0; row--) {
      if (rowSolid(row) >= minSolidCols) {
        solidLowest = row;
        break;
      }
    }
    // Feet along the planted row (plank / tyre line), not random drips below.
    const footRow = solidLowest >= 0 ? solidLowest : ph - 1;
    for (let col = 0; col < pw; col++) {
      if (data[(footRow * pw + col) * 4 + 3] > 120) {
        feet.push((col + 0.5) / pw);
      } else {
        // Fall back: nearest solid above in this column (handles plank gaps).
        for (let row = footRow; row >= Math.max(0, footRow - 8); row--) {
          if (data[(row * pw + col) * 4 + 3] > 120) {
            feet.push((col + 0.5) / pw);
            break;
          }
        }
      }
    }
    if (solidLowest >= 0) pad = (ph - 1 - solidLowest) / img.naturalHeight;
    const info = { feet, pad };
    yardFootCache.set(key, info);
    return info;
  }

  /**
   * Contact shadow hugging the silhouette’s real ground edge (wheels, foot).
   * Uses the same vertical placement as the sprite so the dark edge lands on
   * y=0 (the planted contact line) — never padY below it (that looked floaty).
   */
  function drawYardSilhouetteShadow(img, drawW, drawH, padY) {
    if (!img?.complete || img.naturalWidth <= 0) return;
    const y0 = -drawH + padY;
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.scale(1.0, 0.1);
    ctx.filter = 'brightness(0)';
    ctx.drawImage(img, -drawW / 2, y0, drawW, drawH);
    ctx.filter = 'none';
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.scale(0.78, 0.048);
    ctx.filter = 'brightness(0)';
    ctx.drawImage(img, -drawW / 2, y0, drawW, drawH);
    ctx.filter = 'none';
    ctx.restore();
  }

  /** Thin contact soak for planter boxes — hugs the front plank at y=0. */
  function drawYardBoxShadow(drawW) {
    const half = drawW * 0.46;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 0.15, half, Math.max(1.8, mazeCellH * 0.03), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.beginPath();
    ctx.ellipse(0, 0.7, half * 0.9, Math.max(1.2, mazeCellH * 0.018), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Where a contact column actually meets the ground in draw-space.
   * Iso rear wheels sit higher in the PNG — grass must follow that row,
   * not the global image bottom (that left stray tufts floating underneath).
   */
  function yardContactLocalY(img, u, drawH, padY) {
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    const col = Math.max(0, Math.min(nw - 1, Math.floor(u * nw)));
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = nh;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    if (!pctx) return padY;
    pctx.drawImage(img, col, 0, 1, nh, 0, 0, 1, nh);
    const data = pctx.getImageData(0, 0, 1, nh).data;
    let row = -1;
    for (let y = nh - 1; y >= 0; y--) {
      if (data[y * 4 + 3] > 120) {
        row = y;
        break;
      }
    }
    if (row < 0) return padY;
    // Same mapping as drawImage(img, -drawW/2, -drawH+padY, drawW, drawH).
    return -drawH + padY + ((row + 0.5) / nh) * drawH;
  }

  /**
   * Grass + tiny dirt locked to each wheel / metal foot contact.
   * @param {number[]} contacts normalised 0–1 x along the sprite
   */
  function drawYardWheelGrass(img, contacts, drawW, drawH, padY, seed) {
    if (!contacts?.length || !img?.naturalWidth) return;
    for (let i = 0; i < contacts.length; i++) {
      const jitter = Math.sin(seed * 1.7 + i * 2.3) * 0.5 + 0.5;
      const x = (contacts[i] - 0.5) * drawW;
      const y = yardContactLocalY(img, contacts[i], drawH, padY);
      // Soft dirt right under the tyre / foot.
      ctx.fillStyle = `rgba(${62 + (i % 3) * 12}, ${48 + (i % 2) * 8}, 28, ${0.42 + jitter * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(x, y + 1.1, Math.max(4.2, drawW * 0.042), Math.max(1.7, mazeCellH * 0.026), 0, 0, Math.PI * 2);
      ctx.fill();
      // Grass blades overlapping UP onto the contact edge.
      const blades = 4 + (jitter > 0.5 ? 1 : 0);
      for (let b = 0; b < blades; b++) {
        const bx = x + (b - (blades - 1) / 2) * 2.0 + (jitter - 0.5);
        const bladeH = mazeCellH * (0.05 + jitter * 0.045 + (b % 3) * 0.01);
        ctx.strokeStyle = b % 2 === 0 ? 'rgba(36, 92, 32, 0.85)' : 'rgba(52, 118, 44, 0.68)';
        ctx.lineWidth = Math.max(1.1, mazeCellW * 0.022);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, y + 0.2);
        ctx.lineTo(bx + (i % 2 === 0 ? -1.1 : 1.1) * (0.75 + b * 0.12), y - bladeH);
        ctx.stroke();
      }
    }
  }

  /**
   * Soft pin under each contact, at that contact’s real ground row.
   * @param {number[]} contacts normalised 0–1 x along the sprite
   */
  function drawYardPointShadows(img, contacts, drawW, drawH, padY, link) {
    if (!contacts?.length || !img?.naturalWidth) return;
    /** @type {{ x: number, y: number }[]} */
    const pts = contacts.map((u) => ({
      x: (u - 0.5) * drawW,
      y: yardContactLocalY(img, u, drawH, padY),
    }));
    if (link && pts.length >= 2) {
      const left = Math.min(...pts.map((p) => p.x));
      const right = Math.max(...pts.map((p) => p.x));
      const midY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.beginPath();
      ctx.ellipse((left + right) / 2, midY + 0.4, (right - left) * 0.52 + drawW * 0.03, Math.max(1.4, mazeCellH * 0.02), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const { x, y } of pts) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(x, y + 0.35, Math.max(3.0, drawW * 0.05), Math.max(1.5, mazeCellH * 0.024), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Once-and-for-all contact dressing: dirt + short grass in front of every
   * solid ground touch (wheels, metal feet, planter boards, ute tyres…).
   * Drawn AFTER the sprite so it overlaps the cut edge.
   * @param {number[]} feet normalised 0–1 contact columns along the sprite bottom
   */
  function drawYardContactDressing(feet, drawW, seed) {
    if (!feet.length) return;
    // Prefer real foot clusters (wheel + stand) over a flat row of every column.
    /** @type {number[]} */
    const anchors = [];
    let runStart = 0;
    for (let i = 1; i <= feet.length; i++) {
      const gap = i === feet.length || feet[i] - feet[i - 1] > 0.045;
      if (!gap) continue;
      const mid = feet[Math.floor((runStart + i - 1) / 2)];
      anchors.push(mid);
      runStart = i;
    }
    const points = anchors.length >= 2 ? anchors : feet;
    const target = Math.min(14, Math.max(4, Math.round(drawW / (mazeCellW * 0.28))));
    const step = Math.max(1, Math.floor(points.length / target));
    for (let i = 0; i < points.length; i += step) {
      const jitter = Math.sin(seed * 2.1 + i * 1.9) * 0.5 + 0.5;
      if (jitter < 0.14) continue;
      const x = (points[i] - 0.5) * drawW + (jitter - 0.5) * mazeCellW * 0.04;

      // Soft pin right under the touch.
      ctx.fillStyle = `rgba(0, 0, 0, ${0.22 + jitter * 0.12})`;
      ctx.beginPath();
      ctx.ellipse(x, 0.35, 2.6 + jitter * 1.2, 1.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dirt crumbs in front of the wheel / metal foot.
      ctx.fillStyle = `rgba(${68 + (i % 4) * 10}, ${50 + (i % 3) * 6}, 26, ${0.38 + jitter * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(x + (i % 2 === 0 ? -0.9 : 0.9), 1.15 + jitter * 0.45, 2.0 + jitter, 1.15, 0.2, 0, Math.PI * 2);
      ctx.fill();
      if (jitter > 0.45) {
        ctx.fillStyle = 'rgba(90, 70, 40, 0.32)';
        ctx.beginPath();
        ctx.ellipse(x - 1.8, 1.45, 1.3, 0.9, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Short grass overlapping UP onto the contact edge.
      const blades = jitter > 0.5 ? 3 : 2;
      for (let b = 0; b < blades; b++) {
        const bx = x + (b - (blades - 1) / 2) * 1.5;
        const bladeH = mazeCellH * (0.045 + jitter * 0.055 + b * 0.008);
        ctx.strokeStyle = b === 0 ? 'rgba(40, 88, 34, 0.78)' : 'rgba(56, 118, 46, 0.58)';
        ctx.lineWidth = Math.max(0.9, mazeCellW * 0.02);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, 0.15);
        ctx.lineTo(bx + (i % 2 === 0 ? -1.1 : 1.1) * (0.7 + b * 0.25), -bladeH);
        ctx.stroke();
      }
    }
  }

  /**
   * Rotisserie BBQ: pulsing ember bed on the charcoal tray + smoke drifting up
   * from the coals / meat (tuned for the 20261119 rectangular grill art).
   */
  function drawYardBbqSmoke(drawW, drawH, t) {
    // Coals / spit sit in the open tray — centre of the grill body.
    const bedX = drawW * 0.02;
    const bedY = -drawH * 0.52 - 10;
    const bedRx = drawW * 0.2;
    const bedRy = drawH * 0.06;

    // Soft heat wash over the charcoal.
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 7.5));
    const pulse2 = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 11.2 + 1.3));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255, 110, 20, ${0.16 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(bedX, bedY, bedRx, bedRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 180, 40, ${0.14 * pulse2})`;
    ctx.beginPath();
    ctx.ellipse(bedX + drawW * 0.02, bedY - drawH * 0.01, bedRx * 0.7, bedRy * 0.75, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Flickering ember sparks across the bed.
    for (let i = 0; i < 12; i++) {
      const flicker = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (9 + (i % 5)) + i * 1.7));
      const ex = bedX + Math.sin(i * 2.1 + t * 0.6) * bedRx * 0.75;
      const ey = bedY + Math.cos(i * 1.6 + t * 0.9) * bedRy * 0.7;
      const er = drawW * (0.008 + (i % 3) * 0.004) * flicker;
      ctx.fillStyle = i % 2 === 0
        ? `rgba(255, 200, 60, ${0.35 * flicker})`
        : `rgba(255, 90, 20, ${0.4 * flicker})`;
      ctx.beginPath();
      ctx.ellipse(ex, ey, er, er * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Occasional rising spark.
    for (let i = 0; i < 4; i++) {
      const life = (t * (1.1 + i * 0.15) + i * 0.31) % 1;
      const sx = bedX + Math.sin(i * 2.4 + t) * bedRx * 0.5;
      const sy = bedY - life * drawH * 0.12;
      const sa = (1 - life) * 0.55;
      ctx.fillStyle = `rgba(255, 160, 40, ${sa})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, drawW * 0.006 * (1 - life * 0.5), drawH * 0.005, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Smoke from coals / meat — rises and drifts.
    const ox = bedX + drawW * 0.02;
    const oy = bedY - drawH * 0.06;
    for (let i = 0; i < 9; i++) {
      const life = (t * (0.2 + (i % 3) * 0.035) + i * 0.14) % 1;
      const rise = life * drawH * 0.42;
      const drift = Math.sin(t * 1.3 + i * 1.6) * drawW * (0.025 + life * 0.07);
      const waft = Math.cos(t * 0.85 + i * 2.0) * drawW * 0.018 * life;
      const x = ox + drift + waft + ((i % 2) * 2 - 1) * drawW * 0.015 * life;
      const y = oy - rise;
      const s = drawW * (0.045 + life * 0.12 + (i % 3) * 0.012);
      const a = (1 - life) * (0.2 + (i % 3) * 0.035);
      ctx.fillStyle = `rgba(205, 205, 210, ${a})`;
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * (0.85 + life * 0.3), life * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(230, 230, 235, ${a * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(x + s * 0.2, y - s * 0.15, s * 1.35, s * 1.1, -life * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Live waterfall + basin shimmer on top of the duck-pond sprite.
   * Falls are clipped to the painted water column (not the rocks).
   * Tuned for the 20261119 pond: round basin + shelf fall on the upper right.
   */
  function drawYardPondWater(drawW, drawH, t) {
    const left = -drawW / 2;
    const top = -drawH + 1;
    const basinX = left + drawW * 0.5;
    const basinY = top + drawH * 0.54;
    const basinRx = drawW * 0.24;
    const basinRy = drawH * 0.18;
    // Rock shelf waterfall — upper-right of the new art.
    const fallTopX = left + drawW * 0.62;
    const fallTopY = top + drawH * 0.3;
    const fallBotY = basinY - basinRy * 0.2;
    const fallSpread = drawW * 0.016;

    // Soft ripples in the pool only.
    for (let i = 0; i < 3; i++) {
      const k = (t * (0.5 + i * 0.16) + i * 0.31) % 1;
      ctx.strokeStyle = `rgba(210, 245, 255, ${0.28 * (1 - k)})`;
      ctx.lineWidth = Math.max(0.7, drawW * 0.004);
      ctx.beginPath();
      ctx.ellipse(basinX, basinY, basinRx * (0.3 + k * 0.7), basinRy * (0.3 + k * 0.7), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const shimmer = (Math.sin(t * 2.2) + 1) * 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + shimmer * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(basinX - basinRx * 0.15, basinY - basinRy * 0.15, basinRx * 0.32, basinRy * 0.16, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // Clip falls to a narrow water corridor so dots never sit on rock.
    ctx.save();
    ctx.beginPath();
    ctx.rect(fallTopX - fallSpread * 2.2, fallTopY - 2, fallSpread * 4.4, fallBotY - fallTopY + drawH * 0.04);
    ctx.clip();

    for (let s = 0; s < 3; s++) {
      const ox = (s - 1) * fallSpread;
      const phase = t * (11 + s * 2.2) + s;
      const wobble = Math.sin(phase) * drawW * 0.006;
      const pulse = 0.8 + Math.sin(phase * 1.3) * 0.2;
      const grad = ctx.createLinearGradient(fallTopX + ox, fallTopY, fallTopX + ox, fallBotY);
      grad.addColorStop(0, `rgba(230, 250, 255, ${0.2 * pulse})`);
      grad.addColorStop(0.4, `rgba(190, 235, 255, ${0.55 * pulse})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${0.12 * pulse})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(0.8, drawW * 0.0055 * pulse);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fallTopX + ox, fallTopY);
      ctx.quadraticCurveTo(fallTopX + ox + wobble, (fallTopY + fallBotY) * 0.55, fallTopX + ox * 0.35, fallBotY);
      ctx.stroke();
    }

    for (let i = 0; i < 7; i++) {
      const u = (t * (1.6 + (i % 3) * 0.22) + i * 0.19) % 1;
      // Keep droplets on the stream — start a hair below the rock lip.
      if (u < 0.08) continue;
      const sx = fallTopX + ((i % 3) - 1) * fallSpread * 0.7 + Math.sin(t * 9 + i) * drawW * 0.003;
      const sy = fallTopY + (fallBotY - fallTopY) * u;
      ctx.fillStyle = `rgba(220, 245, 255, ${0.55 * (1 - u * 0.35)})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, Math.max(0.7, drawW * 0.0035), Math.max(1.1, drawH * 0.0055), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Splash zone where the falls hit the pool — rings, bubbles, foam spots.
    const hitX = fallTopX - drawW * 0.01;
    const hitY = fallBotY + drawH * 0.008;
    const splash = (Math.sin(t * 16) + 1) * 0.5;

    // Expanding ripple rings at the impact.
    for (let i = 0; i < 4; i++) {
      const k = (t * (1.1 + i * 0.35) + i * 0.22) % 1;
      ctx.strokeStyle = `rgba(230, 250, 255, ${0.45 * (1 - k)})`;
      ctx.lineWidth = Math.max(0.7, drawW * 0.0035 * (1 - k * 0.5));
      ctx.beginPath();
      ctx.ellipse(
        hitX,
        hitY,
        drawW * (0.018 + k * 0.055),
        drawH * (0.01 + k * 0.028),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }

    // Soft foam mound under the falls.
    ctx.fillStyle = `rgba(255, 255, 255, ${0.28 + splash * 0.22})`;
    ctx.beginPath();
    ctx.ellipse(hitX, hitY, drawW * (0.028 + splash * 0.01), drawH * (0.012 + splash * 0.006), 0, 0, Math.PI * 2);
    ctx.fill();

    // Bubbles / spots boiling up around the hit.
    for (let i = 0; i < 10; i++) {
      const a = t * (7 + (i % 4)) + i * 1.7;
      const orbit = 0.35 + (i % 3) * 0.25;
      const bx = hitX + Math.cos(a) * drawW * (0.01 + orbit * 0.022);
      const by = hitY + Math.sin(a * 1.35) * drawH * (0.006 + orbit * 0.012) - (i % 3) * drawH * 0.004;
      const rise = (Math.sin(t * 9 + i * 2.1) + 1) * 0.5;
      const r = drawW * (0.003 + (i % 3) * 0.002 + rise * 0.002);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + rise * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(bx, by, r, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // A few brighter spark pops on the foam.
    for (let i = 0; i < 5; i++) {
      const pop = (t * 2.4 + i * 0.37) % 1;
      if (pop > 0.55) continue;
      const fade = 1 - pop / 0.55;
      const ang = i * 1.4 + t * 0.8;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * fade})`;
      ctx.beginPath();
      ctx.ellipse(
        hitX + Math.cos(ang) * drawW * 0.02 * pop,
        hitY - drawH * 0.01 * pop + Math.sin(ang) * drawH * 0.008,
        drawW * 0.004 * fade,
        drawH * 0.003 * fade,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  /**
   * Place-rect edges in screen px — props lock width to this and sit on the bottom.
   * @param {{ col: number, row: number }} item
   * @param {(typeof YARD_PROPS)[string]} prop
   */
  function yardPlaceRect(item, prop) {
    const tl = cellCenter(item.col, item.row);
    const br = cellCenter(item.col + prop.w - 1, item.row + prop.h - 1);
    return {
      left: tl.x * width - mazeCellW / 2,
      right: br.x * width + mazeCellW / 2,
      top: tl.y * height - mazeCellH / 2,
      bottom: br.y * height + mazeCellH / 2,
    };
  }

  /**
   * Foot Y (screen px) for a yard prop — larger = closer to camera / drawn later.
   * @param {{ col: number, row: number }} item
   * @param {(typeof YARD_PROPS)[string]} prop
   */
  function yardFootY(item, prop) {
    return yardPlaceRect(item, prop).bottom;
  }

  /** @param {{ col: number, row: number }} item @param {(typeof YARD_PROPS)[string]} prop */
  function drawOneYardProp(item, prop) {
    const img = yardSprites[prop.id];
    const scale = prop.scale ?? 1;
    const box = yardPlaceRect(item, prop);
    const boxW = (box.right - box.left) * scale;
    const boxH = (box.bottom - box.top) * scale;
    // Default: width locks to place columns; height follows art (iso overhang).
    // cover: grow until the place rect is fully filled (wide pads like the pond).
    let drawW = boxW;
    let drawH = boxH;
    if (img?.complete && img.naturalWidth > 0) {
      const aspect = img.naturalWidth / img.naturalHeight;
      if (prop.fit === 'cover') {
        const boxAspect = boxW / boxH;
        if (aspect > boxAspect) {
          drawH = boxH;
          drawW = drawH * aspect;
        } else {
          drawW = boxW;
          drawH = drawW / aspect;
        }
      } else {
        drawH = drawW / aspect;
      }
    }
    const cx = (box.left + box.right) / 2;
    const footY = box.bottom;
    const seed = item.col * 17 + item.row * 31 + prop.w * 3;
    const t = portalAnimTime;
    ctx.save();
    ctx.translate(cx, footY);
    if (img?.complete && img.naturalWidth > 0) {
      const grounding = prop.grounding ?? (prop.noShadow ? 'none' : 'feet');
      const handContacts = prop.contacts?.length ? prop.contacts : null;
      const foot =
        grounding === 'none'
          ? { pad: 0, feet: /** @type {number[]} */ ([]) }
          : grounding === 'contacts' && handContacts
            ? { pad: yardFootInfo(img, prop.id, 'feet').pad, feet: handContacts }
            : yardFootInfo(img, prop.id, grounding === 'box' ? 'box' : 'feet');
      // Lift art so the plank / tyre sits on y=0 (ignore soft PNG fringe).
      const padY = foot.pad * drawH;
      if (grounding === 'contacts' && handContacts) {
        if (!prop.noShadow) drawYardPointShadows(img, handContacts, drawW, drawH, padY, prop.id === 'wheelbarrow');
      } else if (grounding === 'feet') drawYardSilhouetteShadow(img, drawW, drawH, padY);
      else if (grounding === 'box') drawYardBoxShadow(drawW * 0.92);
      ctx.drawImage(img, -drawW / 2, -drawH + padY, drawW, drawH);
      if (prop.water) drawYardPondWater(drawW, drawH, t);
      if (prop.smoke) drawYardBbqSmoke(drawW, drawH, t);
      // Grass locked to each wheel/foot row (iso rear contacts sit higher in the PNG).
      if (grounding === 'contacts' && handContacts) {
        drawYardWheelGrass(img, handContacts, drawW, drawH, padY, seed);
      } else if (grounding !== 'none') {
        drawYardContactDressing(foot.feet, drawW, seed);
      }
    } else {
      ctx.fillStyle = 'rgba(40, 90, 40, 0.55)';
      ctx.fillRect(-drawW / 2, -drawH, drawW, drawH);
    }
    ctx.restore();
  }

  function drawYardObstacles() {
    if (!maze || !yardItems.length || mazeCellW <= 0) return;
    /** @type {{ item: (typeof yardItems)[number], prop: (typeof YARD_PROPS)[string], depth: number }[]} */
    const sorted = [];
    for (const item of yardItems) {
      const prop = YARD_PROPS[item.id];
      if (!prop) continue;
      sorted.push({ item, prop, depth: yardFootY(item, prop) });
    }
    sorted.sort((a, b) => a.depth - b.depth);
    for (const { item, prop } of sorted) drawOneYardProp(item, prop);
  }

  /**
   * Painter's algorithm: yard + nest turrets + ground aliens by foot Y so units
   * north of a prop sit behind the art (iso overhang), while front-row units
   * and the prop itself stay in front.
   */
  function drawYardAndTowers() {
    if (!maze) {
      drawYardObstacles();
      drawTowers();
      return;
    }
    /** @type {{ depth: number, kind: 'yard'|'tower'|'enemy', item?: (typeof yardItems)[number], prop?: (typeof YARD_PROPS)[string], tower?: (typeof towers)[number], enemy?: (typeof enemies)[number] }[]} */
    const layers = [];
    for (const item of yardItems) {
      const prop = YARD_PROPS[item.id];
      if (!prop) continue;
      layers.push({ depth: yardFootY(item, prop), kind: 'yard', item, prop });
    }
    for (const tower of towers) {
      let depth = tower.y;
      const nest = yardNestProp(yardItems, tower.col, tower.row);
      if (nest) {
        // Draw just behind the prop that owns this nest slot (prop stays forefront).
        depth = yardFootY(nest.item, nest.prop) - 0.5;
      }
      layers.push({ depth, kind: 'tower', tower });
    }
    for (const enemy of enemies) {
      if (enemy.flying) continue;
      layers.push({ depth: enemyDrawPos(enemy).y, kind: 'enemy', enemy });
    }
    // Same depth: turret/enemy first so the yard prop stays in front.
    layers.sort((a, b) => a.depth - b.depth || (a.kind === 'yard' ? 1 : -1));
    for (const layer of layers) {
      if (layer.kind === 'yard' && layer.item && layer.prop) drawOneYardProp(layer.item, layer.prop);
      else if (layer.kind === 'tower' && layer.tower) drawOneTower(layer.tower);
      else if (layer.kind === 'enemy' && layer.enemy) drawOneEnemy(layer.enemy);
    }
  }

  function render() {
    drawField();
    if (phase !== 'finale') {
      if (maze) drawMazeOverlay();
      garden.draw(ctx, width, height, 'ground');
      drawYardAndTowers();
      drawPortalVfx();
      if (maze) drawGateMarkers();
      drawGranny();
      drawPlacementPreview();
      if (maze) drawFlyingEnemies();
      else drawEnemies();
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
    if (width <= 0 || height <= 0) {
      relayout();
    }
    const { x, y } = canvasCoords(clientX, clientY);
    const placed = towerAt(x, y);
    if (placed) {
      tapTower(placed);
      return;
    }
    if (removalTarget) {
      clearRemoval();
      return;
    }
    const poking = towerPokingInto(x, y);
    if (!selectedType) {
      if (poking) tapTower(poking);
      else opts.showToast('Pick a turret below first — or tap one on the lawn to remove it.');
      return;
    }
    updatePlacementPreview(x, y);
    const pick = maze
      ? pickMazeCell(x, y)
      : pickPlacementCell(padPositions, x, y, width, height, isCellOccupied);
    if (poking && !pick.valid) {
      tapTower(poking);
      return;
    }
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
            ? 'Keep the gate clear.'
            : reason === 'yard'
              ? 'That square is under a yard obstacle.'
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
    // Rebuilding on a wreck clears the crumpled turret so the square is free.
    towers = towers.filter((t) => !(t.wrecked && t.row === pick.cell.row && t.col === pick.cell.col));
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
    positionRemovalUi();
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
      clearRemoval();
      updateCanvasCursor();
      render();
    },
    startWave,
    pauseBattle,
    resumeBattle,
    isBattlePaused,
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
    getYardLayout: () => yardLayout,
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
      clearRemoval();
      window.removeEventListener('keydown', onRemovalKey);
      opts.audio?.stopScuttling();
      opts.audio?.stopMothership?.();
      cancelAnimationFrame(rafId);
    },
  };
}
