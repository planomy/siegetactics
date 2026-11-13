import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/maths-hq-cockpit.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const home = readFileSync(new URL('../js/home.js', import.meta.url), 'utf8');

test('wide-screen maths cockpit has a viewport-height, independent centre scroller', () => {
  assert.match(css, /@media \(min-width: 1321px\) and \(min-height: 600px\)/);
  assert.match(css, /body\.mission-mode\s*\{\s*height: 100dvh;\s*overflow: hidden;/);
  assert.match(css, /body\.mission-mode #app\s*\{[\s\S]*?height: calc\(100dvh - var\(--gb-sticky-header-height\)\);/);
  assert.match(css, /body\.mission-mode \.mission-shell\s*\{[\s\S]*?grid-template-rows: minmax\(0, 1fr\);/);
  assert.match(css, /body\.mission-mode \.mission-workspace\s*\{[\s\S]*?overflow-y: auto;/);
  assert.match(css, /overscroll-behavior-y: contain;/);
});

test('left radar and right Might columns do not follow the centre scroll', () => {
  assert.match(css, /body\.mission-mode \.mission-control,\s*body\.mission-mode \.mission-power\s*\{[\s\S]*?position: static;/);
  assert.match(css, /body\.mission-mode \.mission-control,\s*body\.mission-mode \.mission-power\s*\{[\s\S]*?height: 100%;/);
  assert.match(css, /body\.mission-mode \.mission-control,\s*body\.mission-mode \.mission-power\s*\{[\s\S]*?overflow-y: auto;/);
});

test('mixed maths, armory promotion and maths topic choices share the wide-screen home view', () => {
  assert.match(css, /@media \(min-width: 1600px\) and \(min-height: 600px\)/);
  assert.match(css, /"mixed armory"/);
  assert.match(css, /"topics topics"/);
  assert.match(css, /mission-mixed-card\s*\{\s*grid-area: mixed;/);
  assert.match(css, /armory-promo\s*\{\s*grid-area: armory;/);
  assert.match(css, /mission-topic-section\s*\{\s*grid-area: topics;/);
  assert.match(home, /renderArmoryPromo\(state\.xp, state\.unlockedTurrets, state\.crystalsToSpend \?\? 0\)/);
  assert.match(home, /class="mission-topic-section"/);
});

test('smaller windows keep normal scrolling and do not lose any content', () => {
  assert.match(css, /@media \(max-width: 1320px\), \(max-height: 599px\)/);
  assert.match(css, /overflow-y: auto;/);
  assert.match(html, /maths-hq-cockpit\.css\?v=20261112t/);
});

test('navigating lessons resets only the centre scroller, preserving same-screen scroll', () => {
  assert.match(app, /if \(inLearning && previousScreen !== id\)/);
  assert.match(app, /workspace\.scrollTop = 0;/);
  assert.match(app, /document\.body\.classList\.toggle\('mission-mode', inLearning\)/);
});
