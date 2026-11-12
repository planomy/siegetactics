import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canAffordTurret } from '../js/shop.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const layoutCSS = readFileSync(new URL('../css/siege-side-armory.css', import.meta.url), 'utf8');
const shopJS = readFileSync(new URL('../js/shop.js', import.meta.url), 'utf8');
const appJS = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('the battle canvas is not contained in the launch banner or turret rail', () => {
  const siege = html.split('<section id="screen-siege"')[1]?.split('<section id="screen-results"')[0];
  assert.ok(siege, 'siege section exists');
  const zone = siege.match(/<div class="siege-battle-zone">([\s\S]*?)<\/div>\s*<aside class="siege-loadout"/);
  assert.ok(zone, 'battlefield section followed by separate loadout');
  assert.match(zone[1], /id="siege-canvas"/);
  assert.doesNotMatch(zone[1], /id="siege-deploy-panel"/);
  assert.doesNotMatch(zone[1], /id="shop-bar"/);
  const rail = siege.split('<aside class="siege-loadout"')[1];
  assert.ok(rail.indexOf('id="btn-launch-siege"') >= 0);
  assert.ok(rail.indexOf('id="shop-bar"') > rail.indexOf('id="btn-launch-siege"'));
});

test('the command rail stays visible on desktop and becomes a compact mobile dock', () => {
  assert.match(layoutCSS, /\.siege-layout\s*\{[\s\S]*grid-template-columns:/);
  assert.match(layoutCSS, /\.siege-loadout\s*\{[\s\S]*position:\s*sticky/);
  assert.match(layoutCSS, /@media \(max-width: 959px\)/);
  assert.match(layoutCSS, /bottom:\s*max\(7px,env\(safe-area-inset-bottom/);
  assert.match(layoutCSS, /\.shop-turrets\s*\{[\s\S]*display:\s*flex/);
  assert.match(layoutCSS, /overflow-x:\s*auto/);
  assert.match(appJS, /classList\.toggle\('siege-mode', id === 'siege'\)/);
});

test('a turret becomes selectable as soon as kills earn enough coins', () => {
  const state = { budget: 10 };
  const turret = { placementCost: 15 };
  assert.equal(canAffordTurret(state, turret), false);
  state.budget += 5;
  assert.equal(canAffordTurret(state, turret), true);
  state.budget -= 12;
  assert.equal(canAffordTurret(state, turret), false);
  assert.match(shopJS, /if \(!canAffordTurret\(state, t\)\)/);
});

test('launch button remains wired and does not auto-start the invasion', () => {
  assert.match(appJS, /getElementById\('btn-launch-siege'\)\?\.addEventListener\('click'/);
  assert.match(appJS, /tdEngine\?\.setGoLive\(false\)/);
  assert.match(appJS, /if \(deploymentTurretsPlaced < 1\)/);
});
