import { TURRETS, TURRET_ORDER, TURRET_MAX_HP, loadTurretSprites, loadWreckedTurretSprites } from './turrets-data.js';
import { AMMO, loadAmmoSprites } from './ammo-data.js';
import { FIELD_LAYOUT, targetPathsForRow } from './field-layout.js';
import { buildPlacementCells, pickPlacementCell } from './placement-grid.js';
import { loadEnemySprites, spriteKeyForEnemy, spriteSizeForEnemy } from './enemies-data.js';
import { getFieldImage, preloadField } from './preload.js';
import { CUPCAKE, pickCupcakeTarget, shouldAutoFireCupcakes, steerAngle } from './cupcakes.js';
import { waveConfigFor, ANNOUNCE_SPLASH_SEC, SIEGE_DURATION_SEC } from './waves-data.js';

const { ENEMY_PATHS, TURRET_ROWS } = FIELD_LAYOUT;

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
 * @property {number} bobPhase
 * @property {number} bobSpeed
 * @property {number} bobAmp
 * @property {number} slowUntil
 * @property {number} attackCooldown
 * @property {number} attackRate
 * @property {number} attackDamage
 * @property {number} attackRange
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
 *   onMissionEnd: (stats: { kills: number, leaks: number, won: boolean, maxLeaks: number, wavesCleared: number }) => void,
 *   onKillReward?: (info: { isBoss: boolean }) => void,
 *   onWaveCleared?: (info: { wave: number, nextWave: number|null }) => void,
 *   onPhaseChange?: (phase: 'deploy'|'announce'|'wave'|'done') => void,
 *   onPauseChange?: (paused: boolean) => void,
 *   audio?: {
 *     playTurretFire: (type: string) => void,
 *     playNukeFire: () => void,
 *     playNukeExplosion: (info?: { isBoss?: boolean }) => void,
 *     playDeath: (info: { isBoss?: boolean }) => void,
 *     playBoss: (kind: 'mothership'|'granddaddy') => void,
 *     playWaveWarning: (waveNum: number) => void,
 *     playGranddaddyWarning: () => void,
 *     startScuttling: (waveNum: number) => void,
 *     stopScuttling: () => void,
 *     pauseScuttling: () => void,
 *     resumeScuttling: () => void,
 *   },
 *   showToast: (msg: string) => void,
 *   spawnGranddaddy?: boolean,
 *   grannyEnabled?: boolean | (() => boolean),
 *   onGranddaddySpawn?: () => void,
 *   onCupcakeUsed?: () => void,
 *   onCupcakeFinished?: () => void,
 *   onGrannySummoned?: () => void,
 *   onGrannyDeparted?: () => void,
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
  let grannyOnField = false;

  let granddaddySpawnedThisSiege = false;
  let siegeTimeLeft = 0;
  let siegeTimerEnded = false;

  function isCacheUnlocked() {
    if (typeof opts.grannyEnabled === 'function') return opts.grannyEnabled();
    return Boolean(opts.grannyEnabled);
  }

  let phase = /** @type {'deploy'|'announce'|'wave'|'done'} */ ('deploy');
  let waveTime = 0;
  let speedMult = 1;
  let paused = false;
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

  /** @type {{ active: boolean, waveNum: number, time: number, duration: number }} */
  let splash = { active: false, waveNum: 1, time: 0, duration: ANNOUNCE_SPLASH_SEC };

  /** @type {Record<string, HTMLImageElement>} */
  let enemySprites = {};

  const siegeDuration =
    (opts.mission.siegeDurationSec ?? SIEGE_DURATION_SEC) + (opts.bonusSiegeSec ?? 0);
  const maxLeaks = opts.mission.maxLeaks ?? 10;
  const killBudgetXp = opts.mission.killBudgetXp ?? 1;
  const bossKillBudgetXp = opts.mission.bossKillBudgetXp ?? 4;
  let defeated = false;

  function updateCanvasCursor() {
    canvas.style.cursor = selectedType && canPlaceTurrets() ? 'none' : '';
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
  let cupcakeImg = null;
  const cupcakeLoader = new Image();
  cupcakeLoader.src = 'assets/cupcake-missile.png';
  cupcakeLoader.onload = () => {
    cupcakeImg = cupcakeLoader;
    render();
  };
  if (!fieldImg) {
    preloadField().then((img) => {
      fieldImg = img;
      render();
    }).catch(() => {});
  }

  function cellRadius() {
    if (width <= 0) return 12;
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
    towers.forEach((tower) => {
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
    });
  }

  function formatSiegeTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function hpForSpawn(cfg, index) {
    const tough = cfg.toughEvery && cfg.toughEvery > 0 && (index + 1) % cfg.toughEvery === 0;
    const base = tough && cfg.toughHp ? cfg.toughHp : cfg.baseHp;
    return Math.round(base * (1 + index * (cfg.hpRamp ?? 0)));
  }

  function initSpawner() {
    spawner = { spawned: 0, nextSpawnAt: 0.4, burstLeft: 0 };
  }

  function spawnEnemy(path, hp, speed, bossKind = null) {
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
      bobPhase: Math.random() * Math.PI * 2,
      bobSpeed: 4.8 + Math.random() * 3.6,
      bobAmp: bobBase * (0.3 + Math.random() * 0.35) * sizeScale,
      slowUntil: 0,
      attackCooldown: 0.8 + Math.random() * 1.5,
      attackRate,
      attackDamage,
      attackRange,
    });
    if (bossKind === 'mothership') opts.audio?.playBoss('mothership');
    if (bossKind === 'granddaddy') opts.audio?.playGranddaddyWarning();
  }

  function spawnFromConfig(cfg, index) {
    if (cfg.granddaddyAt >= 0 && cfg.granddaddyAt === index) {
      spawnEnemy(2, Math.round(hpForSpawn(cfg, index) * 2.8), 0.026 * cfg.speedMul, 'granddaddy');
      granddaddySpawnedThisSiege = true;
      opts.onGranddaddySpawn?.();
      return;
    }
    if (cfg.mothershipAt === index) {
      spawnEnemy(2, Math.round(hpForSpawn(cfg, index) * 2.2), 0.03 * cfg.speedMul, 'mothership');
      return;
    }
    const path = index % ENEMY_PATHS;
    const hp = hpForSpawn(cfg, index);
    const speed = (index >= cfg.clumpAt ? 0.052 : 0.044) * cfg.speedMul;
    spawnEnemy(path, hp, speed);
  }

  function updateSpawner() {
    if (siegeTimerEnded) return;
    const cfg = getWaveConfig();
    if (!cfg || spawner.spawned >= cfg.totalSpawns) return;
    if (waveTime < spawner.nextSpawnAt) return;

    spawnFromConfig(cfg, spawner.spawned);
    spawner.spawned += 1;

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

  function enemyWorldPos(enemy) {
    const x = pathStartX + (pathEndX - pathStartX) * enemy.progress;
    return { x, y: pathY[enemy.path] };
  }

  /** Visual position with per-ship bob (logic stays on the dirt path). */
  function enemyDrawPos(enemy) {
    const pos = enemyWorldPos(enemy);
    const bob = Math.sin(waveTime * enemy.bobSpeed + enemy.bobPhase) * enemy.bobAmp;
    return { x: pos.x, y: pos.y + bob };
  }

  function findTarget(tower) {
    const def = TURRETS[/** @type {keyof typeof TURRETS} */ (tower.type)];
    const paths = targetPathsForRow(tower.row);
    let best = null;
    let bestP = -1;
    for (const e of enemies) {
      if (!paths.has(e.path)) continue;
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
    if (tower.wrecked) return;
    tower.cooldown -= dt;
    if (tower.cooldown > 0) return;
    const def = TURRETS[/** @type {keyof typeof TURRETS} */ (tower.type)];
    const target = findTarget(tower);
    if (!target) return;
    tower.cooldown = def.fireRate;

    if (def.damage === 0 && def.slow) {
      target.slowUntil = waveTime + 2;
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
    let best = null;
    let bestDist = Infinity;
    for (const t of towers) {
      if (t.wrecked) continue;
      if (!targetPathsForRow(t.row).has(enemy.path)) continue;
      const dist = Math.hypot(pos.x - t.x, pos.y - t.y);
      if (dist > enemy.attackRange || dist >= bestDist) continue;
      bestDist = dist;
      best = t;
    }
    return best;
  }

  function fireEnemy(enemy, dt) {
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
      damage: enemy.attackDamage,
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
      const name = TURRETS[/** @type {keyof typeof TURRETS} */ (tower.type)]?.name ?? 'Turret';
      if (waveTime - wreckToastAt > 2.2) {
        wreckToastAt = waveTime;
        opts.showToast(`${name} wrecked!`);
      }
    }
  }

  function spawnNukeKillBurst(x, y, isBoss, sizeScale = 1) {
    const baseSize = Math.max(28, height * 0.045) * sizeScale * (isBoss ? 1.55 : 1);
    const palette = isBoss
      ? ['rgba(255,107,53,0.95)', 'rgba(255,209,102,0.9)', 'rgba(255,69,0,0.85)', 'rgba(255,255,255,0.75)']
      : ['rgba(157,78,221,0.95)', 'rgba(124,252,0,0.9)', 'rgba(255,107,203,0.85)', 'rgba(199,125,255,0.8)', 'rgba(255,255,255,0.7)'];
    const sparks = Array.from({ length: isBoss ? 10 : 8 }, (_, i) => ({
      angle: (Math.PI * 2 * i) / (isBoss ? 10 : 8) + Math.random() * 0.45,
      color: palette[i % palette.length],
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
      return e.isBoss && Math.hypot(pos.x - x, pos.y - y) <= CUPCAKE.aoe;
    });
    opts.audio?.playNukeExplosion({ isBoss: hadBoss });
    cupcakeBursts.push({ x, y, time: 0, duration: 0.5 });
    enemies.forEach((e) => {
      const pos = enemyWorldPos(e);
      if (Math.hypot(pos.x - x, pos.y - y) <= CUPCAKE.aoe) {
        e.hp -= CUPCAKE.damage;
      }
    });
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0) {
        const e = enemies[i];
        const pos = enemyWorldPos(e);
        const baseSize = Math.max(32, height * 0.082);
        const size = spriteSizeForEnemy(e, baseSize);
        spawnNukeKillBurst(pos.x, pos.y, e.isBoss, size / baseSize);
        const wasBoss = e.isBoss;
        enemies.splice(i, 1);
        waveKills += 1;
        totalKills += 1;
        rewardKill(wasBoss);
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

  function grannyMuzzlePos() {
    const { x, baseY, w, h, flipX } = grannyLayout();
    const m = FIELD_LAYOUT.grannyPorch.muzzle ?? { x: 0.28, y: 0.07 };
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
    if (!grannyOnField || cupcakeUsed || phase !== 'wave') return false;
    if (enemies.length === 0) return false;
    cupcakeUsed = true;
    cupcakeFinishedNotified = false;
    cupcakeSalvo = {
      active: true,
      remaining: CUPCAKE.salvoCount,
      cooldown: 0.15,
    };
    opts.showToast('Eat my cupcakes!');
    opts.onCupcakeUsed?.();
    return true;
  }

  function tryGrannyAutoFire() {
    if (!grannyOnField || cupcakeUsed || cupcakeSalvo.active || phase !== 'wave') return;
    if (!shouldAutoFireCupcakes(enemies)) return;
    startCupcakeSalvo();
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

    cupcakeBursts.forEach((b) => {
      b.time += step;
    });
    cupcakeBursts = cupcakeBursts.filter((b) => b.time < b.duration);

    nukeKillBursts.forEach((b) => {
      b.time += step;
    });
    nukeKillBursts = nukeKillBursts.filter((b) => b.time < b.duration);

    if (
      cupcakeUsed &&
      !cupcakeSalvo.active &&
      cupcakeMissiles.length === 0 &&
      cupcakeBursts.length === 0 &&
      nukeKillBursts.length === 0 &&
      !cupcakeFinishedNotified
    ) {
      cupcakeFinishedNotified = true;
      grannyOnField = false;
      opts.onGrannyDeparted?.();
      opts.onCupcakeFinished?.();
    }
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

    cupcakeBursts.forEach((b) => {
      const t = b.time / b.duration;
      const alpha = (1 - t) * 0.75;
      const radius = CUPCAKE.aoe * (0.35 + t * 0.85);
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

      b.sparks.forEach((s) => {
        const dist = b.size * (0.15 + t * 1.55);
        const px = b.x + Math.cos(s.angle) * dist;
        const py = b.y + Math.sin(s.angle) * dist;
        const r = b.size * (b.isBoss ? 0.16 : 0.12) * (1 - t * 0.55);
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

  function grannyLayout() {
    const h = Math.max(52, height * 0.17);
    const aspect = grannyImg ? grannyImg.width / grannyImg.height : 0.73;
    const w = h * aspect;
    const rightX = width * FIELD_LAYOUT.grannyPorch.rightX;
    const baseY = height * FIELD_LAYOUT.grannyPorch.baseY;
    const x = rightX - w;
    const flipX = FIELD_LAYOUT.grannyPorch.flipX !== false;
    return { x, baseY, w, h, rightX, flipX };
  }

  function drawGranny() {
    if (!grannyOnField || !grannyImg) return;
    const { x, baseY, w, h, rightX, flipX } = grannyLayout();
    if (flipX) {
      ctx.drawImage(grannyImg, rightX, baseY - h, -w, h);
    } else {
      ctx.drawImage(grannyImg, x, baseY - h, w, h);
    }
  }

  function rewardKill(isBoss) {
    opts.onKillReward?.({ isBoss, xp: isBoss ? bossKillBudgetXp : killBudgetXp });
  }

  function applyDamage(x, y, damage, aoe, primaryId) {
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
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0) {
        const wasBoss = enemies[i].isBoss;
        enemies.splice(i, 1);
        waveKills += 1;
        totalKills += 1;
        rewardKill(wasBoss);
        opts.audio?.playDeath({ isBoss: wasBoss });
      }
    }
  }

  function update(dt) {
    if (phase === 'announce') {
      splash.time += dt;
      if (splash.time >= splash.duration) {
        splash.active = false;
        beginWaveCombat();
      }
      return;
    }

    if (phase !== 'wave' || paused) return;

    siegeTimeLeft = Math.max(0, siegeTimeLeft - dt);
    if (siegeTimeLeft <= 0 && !siegeTimerEnded) {
      siegeTimerEnded = true;
      opts.showToast('Time! Blast what\'s left!');
    }

    waveTime += dt;
    updateSpawner();
    tryGrannyAutoFire();

    enemies.forEach((e) => {
      let spd = e.speed;
      if (e.slowUntil > waveTime) spd *= 0.5;
      e.progress += spd * dt * speedMult;
    });

    enemies = enemies.filter((e) => {
      if (e.progress >= 1) {
        totalLeaks += 1;
        return false;
      }
      return true;
    });

    if (totalLeaks >= maxLeaks) {
      endMission(false);
      return;
    }

    updateCupcakes(dt);

    towers.forEach((t) => fireTower(t, dt * speedMult));
    enemies.forEach((e) => fireEnemy(e, dt * speedMult));

    projectiles.forEach((p) => {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      const step = p.speed * dt * speedMult;
      if (step >= dist) {
        applyDamage(p.tx, p.ty, p.damage, p.aoe, p.targetId);
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
  }

  function checkWaveClear() {
    const cfg = getWaveConfig();
    if (!cfg) return;

    if (siegeTimerEnded || siegeTimeLeft <= 0) {
      if (enemies.length === 0) {
        endMission(totalLeaks < maxLeaks);
      }
      return;
    }

    if (spawner.spawned >= cfg.totalSpawns && enemies.length === 0) {
      finishCurrentWave();
    }
  }

  function showWaveSplash(waveNum) {
    if (paused) {
      paused = false;
      opts.onPauseChange?.(false);
    }
    splash = { active: true, waveNum, time: 0, duration: ANNOUNCE_SPLASH_SEC };
    opts.audio?.playWaveWarning(waveNum);
    setPhase('announce');
    lastTs = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
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
    initSpawner();
    opts.audio?.startScuttling(wavesCompleted + 1);
    lastTs = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function canPlaceTurrets() {
    return phase === 'deploy' || (phase === 'wave' && paused);
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
      endMission(totalLeaks < maxLeaks);
      return;
    }
    showWaveSplash(wavesCompleted + 1);
  }

  function endMission(won) {
    if (phase === 'done') return;
    opts.audio?.stopScuttling();
    defeated = !won;
    setPhase('done');
    cancelAnimationFrame(rafId);
    opts.onMissionEnd({ kills: totalKills, leaks: totalLeaks, won, maxLeaks, wavesCleared: wavesCompleted });
    if (won) {
      opts.showToast(`Time! ${wavesCompleted} wave${wavesCompleted === 1 ? '' : 's'} cleared.`);
    } else if (!won && totalLeaks >= maxLeaks) {
      opts.showToast('Too many got through — Granny needs a redo!');
    }
  }

  function drawField() {
    if (fieldImg) {
      ctx.drawImage(fieldImg, 0, 0, width, height);
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

  function drawTurretAt(type, x, y, { wrecked = false, ghost = false, valid = true } = {}) {
    const sz = Math.max(36, cellRadius() * 2.6);
    const anchorY = FIELD_LAYOUT.turretAnchorY;
    const def = TURRETS[/** @type {keyof typeof TURRETS} */ (type)];
    const img = wrecked ? wreckedSprites[type] : turretSprites[type];

    ctx.save();
    if (ghost && !valid) {
      ctx.filter = 'grayscale(1) brightness(0.5)';
      ctx.globalAlpha = 0.75;
    } else if (ghost) {
      ctx.globalAlpha = 0.88;
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
      ghost: true,
      valid: placementPreview.valid,
    });
  }

  function drawTowers() {
    const sz = Math.max(36, cellRadius() * 2.6);
    const anchorY = FIELD_LAYOUT.turretAnchorY;
    towers.forEach((t) => {
      drawTurretAt(t.type, t.x, t.y, { wrecked: t.wrecked });

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
      const def = TURRETS[/** @type {keyof typeof TURRETS} */ (p.type)];
      const ammo = AMMO[p.type];
      const img = ammoSprites[p.type];
      const size = (ammo?.size ?? (def?.boltSize ?? 5) * 4) * scale;

      if (img) {
        const aspect = img.width / img.height || 1;
        const h = size;
        const w = h * aspect;
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

  function drawWaveSplash() {
    if (!splash.active) return;
    const t = splash.time / splash.duration;
    const popIn = Math.min(1, t / 0.22);
    const fadeOut = t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
    const alpha = fadeOut;
    const scale = 0.35 + popIn * 0.65;
    const pulse = 1 + Math.sin(t * 14) * 0.03 * popIn;

    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha})`;
    ctx.fillRect(0, 0, width, height);

    const fontSize = Math.min(80, width * 0.16);
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale * pulse, scale * pulse);
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${fontSize}px Bangers, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, fontSize * 0.06);
    ctx.strokeStyle = '#ff6b35';
    ctx.fillStyle = '#ffb347';
    ctx.shadowColor = 'rgba(255,140,66,0.9)';
    ctx.shadowBlur = 24;
    const label = `WAVE ${splash.waveNum}`;
    ctx.strokeText(label, 0, 0);
    ctx.fillText(label, 0, 0);
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
      const timeLabel = phase === 'wave' ? formatSiegeTime(siegeTimeLeft) : formatSiegeTime(siegeDuration);
      ctx.fillText(`Time ${timeLabel}`, 12, 24);
      ctx.fillText(`Wave ${waveNum}`, 118, 24);
      if (phase === 'wave' && paused) {
        ctx.fillStyle = '#7cfc00';
        ctx.fillText('PAUSED', 200, 24);
        ctx.fillStyle = '#ffb347';
      }
      ctx.fillText(`Blasted: ${totalKills}`, phase === 'wave' && paused ? 290 : 200, 24);
      ctx.fillText(`Leaked: ${totalLeaks}/${maxLeaks}`, phase === 'wave' && paused ? 410 : 320, 24);
      ctx.fillText(`Coins: ${budget}`, width - 110, 24);
    } else if (phase === 'deploy') {
      ctx.fillText('Pick turret → place on grass', 12, 24);
      ctx.fillText(`Coins: ${budget}`, width - 110, 24);
    }
  }

  function render() {
    drawField();
    drawGranny();
    drawTowers();
    drawPlacementPreview();
    drawEnemies();
    drawNukeKillBursts();
    drawProjectiles();
    drawEnemyShots();
    drawCupcakeMissiles();
    drawHUD();
    drawWaveSplash();
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    render();
    if (phase === 'wave' || phase === 'announce') rafId = requestAnimationFrame(loop);
  }

  function canvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  function handleTap(clientX, clientY) {
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
    const pick = pickPlacementCell(padPositions, x, y, width, height, isCellOccupied);
    if (!pick.cell) {
      opts.showToast('Stay on the grass lanes — not the dirt tracks.');
      return;
    }
    if (!pick.valid) {
      opts.showToast('That spot is taken.');
      return;
    }
    if (!opts.trySpend(selectedType)) return;
    const maxHp = TURRET_MAX_HP[/** @type {keyof typeof TURRET_MAX_HP} */ (selectedType)] ?? 80;
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
    });
    render();
  }

  function relayout() {
    layout();
    render();
  }

  function onPointerMove(clientX, clientY) {
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
  requestAnimationFrame(() => relayout());

  return {
    setSelectedType(type) {
      selectedType = type;
      updateCanvasCursor();
      render();
    },
    startWave() {
      if (phase !== 'deploy') return false;
      if (wavesCompleted === 0 && towers.length === 0) {
        opts.showToast('Place at least one turret first.');
        return false;
      }
      if (wavesCompleted === 0) {
        totalKills = 0;
        totalLeaks = 0;
        defeated = false;
        siegeTimeLeft = siegeDuration;
        siegeTimerEnded = false;
        granddaddySpawnedThisSiege = false;
      }
      currentWaveIndex = wavesCompleted;
      showWaveSplash(wavesCompleted + 1);
      return true;
    },
    getWavesCompleted: () => wavesCompleted,
    setSpeed(mult) {
      speedMult = mult;
    },
    togglePause() {
      if (phase !== 'wave') return paused;
      paused = !paused;
      if (paused) opts.audio?.pauseScuttling();
      else opts.audio?.resumeScuttling();
      opts.onPauseChange?.(paused);
      if (!paused) lastTs = 0;
      updateCanvasCursor();
      render();
      return paused;
    },
    isPaused: () => paused,
    getPhase: () => phase,
    canFireCupcakes() {
      return (
        grannyOnField &&
        !cupcakeUsed &&
        !cupcakeSalvo.active &&
        cupcakeMissiles.length === 0 &&
        phase === 'wave'
      );
    },
    isCupcakeActive() {
      return cupcakeSalvo.active || cupcakeMissiles.length > 0;
    },
    isGrannyOnField: () => grannyOnField,
    summonGranny() {
      if (!isCacheUnlocked() || grannyOnField || phase !== 'wave') return false;
      grannyOnField = true;
      cupcakeUsed = false;
      cupcakeFinishedNotified = false;
      opts.onGrannySummoned?.();
      tryGrannyAutoFire();
      render();
      return true;
    },
    fireCupcakes() {
      if (!grannyOnField || cupcakeUsed || phase !== 'wave') return false;
      if (enemies.length === 0) {
        opts.showToast('No aliens to frost!');
        return false;
      }
      return startCupcakeSalvo();
    },
    relayout,
    destroy() {
      opts.audio?.stopScuttling();
      cancelAnimationFrame(rafId);
    },
  };
}
