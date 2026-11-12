import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENEMY_SPRITE_SRC } from '../js/enemies-data.js';
import { normalizeEnemyDefeats, recordEnemyDefeat, enemyDefeatCount } from '../js/enemy-tally.js';
import { THREAT_DOSSIERS, renderThreatDossier } from '../js/threat-dossier.js';

const home = readFileSync(new URL('../js/home.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../js/td-engine.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/mission-blueprint-stats.css', import.meta.url), 'utf8');

test('the original green scanning dossier covers every enemy artwork type', () => {
  const originalKeys = Object.keys(ENEMY_SPRITE_SRC);
  const dossierKeys = THREAT_DOSSIERS.map((d) => d.key);
  assert.equal(new Set(dossierKeys).size, dossierKeys.length);
  assert.deepEqual(new Set(dossierKeys), new Set(originalKeys));
  assert.match(renderThreatDossier(false, { urgency: 'calm' }), /threat-scanline/);
  assert.match(renderThreatDossier(false, { urgency: 'calm' }), /threat-dossier-kills-count/);
});

test('defeats are credited independently and survive normalising a saved record', () => {
  let saved = normalizeEnemyDefeats(null);
  assert.deepEqual(Object.values(saved), Object.keys(ENEMY_SPRITE_SRC).map(() => 0));
  saved = recordEnemyDefeat(saved, 'monster3');
  saved = recordEnemyDefeat(saved, 'monster3');
  saved = recordEnemyDefeat(saved, 'mothership4');
  assert.equal(enemyDefeatCount(saved, 'monster3'), 2);
  assert.equal(enemyDefeatCount(saved, 'mothership4'), 1);
  assert.equal(enemyDefeatCount(saved, 'monster1'), 0);
  const restored = normalizeEnemyDefeats(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored, saved);
  assert.equal(recordEnemyDefeat(saved, 'not-a-monster'), saved);
  assert.equal(normalizeEnemyDefeats({monster3:-5}).monster3, 0);
});

test('confirmed deaths including nuke casualties send real sprite IDs to the saved tally', () => {
  assert.match(engine, /function onEnemyDestroyed\(enemy\)/);
  assert.match(engine, /opts\.onEnemyDestroyed\?\.\(\{ key: spriteKeyForEnemy\(enemy\) \}\)/);
  assert.match(app, /save\.enemyDefeated = recordEnemyDefeat\(save\.enemyDefeated, key\)/);
  assert.match(app, /data\.enemyDefeated = normalizeEnemyDefeats\(data\.enemyDefeated\)/);
  assert.match(app, /enemyDefeated: save\.enemyDefeated/);
});

test('Mission Control uses the existing blueprint, with no duplicate 10-question start', () => {
  assert.match(home, /mission-control-blueprint/);
  assert.match(home, /renderThreatDossier\(attack\.open, attack\)/);
  assert.match(home, /initThreatDossier\(host\.querySelector\('\.threat-dossier'\)/);
  assert.match(home, /threatDossierCleanup\?\.\(\)/);
  assert.doesNotMatch(home, /id="btn-hold-line">START/);
  assert.match(home, /id="mission-start-mixed"/);
});

test('power uses the top 60% and siege progress and stats occupy the bottom 40%', () => {
  assert.match(css, /grid-template-rows: minmax\(0, 3fr\) minmax\(0, 2fr\)/);
  assert.match(css, /body\.mission-mode \.mission-power \{/);
  assert.match(home, /export function renderSiegeStats\(host, state\)/);
  assert.match(app, /renderSiegeStats\(powerHost, state\)/);
  assert.match(home, /id="mission-control-xp"/);
  assert.match(home, /class="mission-control-metrics"/);
});
