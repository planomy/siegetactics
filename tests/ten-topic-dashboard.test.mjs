import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATH_TOPICS } from '../js/topics-data.js';

const home = readFileSync(new URL('../js/home.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/ten-topic-dashboard.css', import.meta.url), 'utf8');
const cards = readFileSync(new URL('../css/topic-campaign-cards.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('exactly ten available maths topics appear without a More button', () => {
  assert.equal(MATH_TOPICS.length, 10);
  assert.ok(MATH_TOPICS.every(topic => topic.available));
  assert.match(home, /mission-all-topics/);
  assert.match(home, /renderTrainingCards\(state\.gate, attack, state\.levelMastery, state\.mapProgress, TOPIC_DISPLAY_ORDER, state\.topicProgress\)/);
  assert.doesNotMatch(home, /id="mission-show-more"/);
  assert.doesNotMatch(home, /id="mission-extra-topics"/);
  assert.doesNotMatch(home, /expandedTopicsVisible/);
  const list = home.match(/const TOPIC_DISPLAY_ORDER = \[([\s\S]*?)\];/)?.[1];
  assert.ok(list, 'display order is defined');
  const ids = Array.from(list.matchAll(/'([^']+)'/g), match => match[1]);
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
  assert.deepEqual(new Set(ids), new Set(MATH_TOPICS.map(t => t.id)));
});

test('the desktop grid shows two rows of five, with both promotion cards above it', () => {
  assert.match(css, /@media \(min-width: 1321px\) and \(min-height: 600px\)/);
  assert.match(css, /"mixed armory"/);
  assert.match(css, /"topics topics"/);
  assert.match(cards, /mission-all-topics\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.mission-home:not\(:has\(\.mission-map-details\[open\]\)\)\s*\{[\s\S]*?height:\s*100%;[\s\S]*?grid-template-rows:\s*auto auto minmax\(auto, 1fr\) auto;/);
  assert.match(css, /mission-mixed-card\s*\{[\s\S]*?grid-area:\s*mixed;/);
  assert.match(css, /armory-promo\s*\{[\s\S]*?grid-area:\s*armory;/);
  assert.match(css, /mission-topic-section\s*\{[\s\S]*?grid-area:\s*topics;/);
});

test('the right-side defence forge fits without its own scrollbar', () => {
  assert.match(css, /body\.mission-mode \.mission-power\s*\{\s*overflow:\s*hidden;/);
  assert.match(css, /body\.mission-mode \.mission-power \.power-rig\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?height:\s*100%;/);
  assert.match(css, /power-scene\s*\{[\s\S]*?height:\s*clamp\(150px, 25dvh, 230px\);/);
});

test('garden is darkened in the header and removed from behind radar writing', () => {
  assert.match(css, /body\.mission-mode \.topbar\.gb-topbar\s*\{[\s\S]*?header-backyard\.jpg/);
  assert.match(css, /body\.mission-mode \.mission-control\s*\{[\s\S]*?radial-gradient/);
  assert.match(css, /body\.mission-mode \.topbar\.gb-topbar \.brand-logo\s*\{[\s\S]*?143px/);
});

test('small screens continue to use fewer columns and CSS assets are loaded fresh', () => {
  assert.match(cards, /@media \(max-width: 540px\)/);
  assert.match(cards, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(html, /ten-topic-dashboard\.css\?v=20261112b3/);
  assert.match(html, /app\.js\?v=20261114f1/);
  assert.match(app, /home\.js\?v=20261114f1/);
});
