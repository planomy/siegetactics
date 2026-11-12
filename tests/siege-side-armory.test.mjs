import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canAffordTurret } from '../js/shop.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const layoutCSS = readFileSync(new URL('../css/siege-side-armory.css', import.meta.url), 'utf8');
const shopJS = readFileSync(new URL('../js/shop.js', import.meta.url), 'utf8');
const appJS = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('the battle cry is centred beneath the field, not inside the turret shop', () => {
  const siege = html.split('<section id="screen-siege"')[1]?.split('<section id="screen-results"')[0];
  assert.ok(siege, 'siege section exists');
  const field = siege.split('<div class="siege-canvas-wrap">')[1]?.split('<div class="siege-battle-footer">')[0];
  const footer = siege.split('<div class="siege-battle-footer">')[1]?.split('<aside class="siege-loadout"')[0];
  const rail = siege.split('<aside class="siege-loadout"')[1];
  assert.ok(field && footer && rail, 'battlefield, footer and turret rail all exist');
  assert.match(field, /id="siege-canvas"/);
  assert.doesNotMatch(field, /id="btn-launch-siege"/);
  assert.match(footer, /id="siege-deploy-panel"/);
  assert.match(footer, /id="btn-launch-siege"/);
  assert.match(footer, /id="nuke-cache-panel"/);
  assert.match(rail, /id="shop-bar"/);
  assert.doesNotMatch(rail, /id="siege-deploy-panel"/);
  assert.doesNotMatch(rail, /id="btn-launch-siege"/);
  assert.ok(siege.indexOf('id="siege-canvas"') < siege.indexOf('id="btn-launch-siege"'));
});

test('the launch card stays compact and centred, giving the shop the full right rail', () => {
  assert.match(layoutCSS, /\.siege-battle-footer\s*\{[\s\S]*grid-template-columns:/);
  assert.match(layoutCSS, /\.siege-battle-footer \.siege-deploy-panel\s*\{[\s\S]*grid-column:\s*2;/);
  assert.match(layoutCSS, /\.siege-battle-footer \.siege-deploy-panel\s*\{[\s\S]*position:\s*static;/);
  assert.match(layoutCSS, /\.siege-battle-footer \.siege-command-bar\s*\{[\s\S]*grid-column:\s*1;/);
  assert.match(layoutCSS, /\.siege-loadout \.shop-bar\s*\{[\s\S]*overflow-y:\s*auto;/);
  assert.match(layoutCSS, /@media \(max-width: 959px\)/);
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
