import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const home = readFileSync(new URL('../js/home.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const mixed = readFileSync(new URL('../js/battle-prep.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/topic-campaign-cards.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('all ten cards are artwork-led without grey squircle borders, shields or Done labels', () => {
  assert.match(home, /class="gb-story-card gb-topic-campaign-card/);
  assert.doesNotMatch(home, /renderModuleLevelPips\(/);
  assert.doesNotMatch(home, /gb-story-badge-done/);
  assert.doesNotMatch(home, /gb-module-level-pips/);
  assert.match(css, /\.gb-topic-campaign-card\s*\{[\s\S]*?border:\s*none;/);
  assert.match(css, /\.gb-topic-campaign-card \.gb-story-art-img\s*\{[\s\S]*?object-fit:\s*contain;/);
  assert.match(css, /\.gb-topic-campaign-card:focus-visible\s*\{/);
  assert.match(home, /TOPIC_DISPLAY_ORDER/);
});

test('topic cards display real Rank, tiny earned mastery and a next-rank meter', () => {
  assert.match(home, /getTopicRecord\(topicProgress, topic\.id\)/);
  assert.match(home, /getQualifiedLevels\(levelMastery, topic\.id\)/);
  assert.match(home, /class="gb-topic-rank"/);
  assert.match(home, /class="gb-topic-mastery"/);
  assert.match(home, /class="gb-topic-next"/);
  assert.match(home, /class="gb-topic-rank-track"/);
  assert.match(home, /aria-label="\$\{topic\.title\}[^"]*, topic rank \$\{campaign\.rank\}/);
  assert.match(css, /\.gb-topic-rank-fill\s*\{/);
});

test('topic stats persist separately from Forge XP and existing level mastery', () => {
  assert.match(app, /topicProgress:\s*\{\}/);
  assert.match(app, /data\.topicProgress = normalizeTopicProgress\(data\.topicProgress, data\.levelMastery, data\.mapProgress\)/);
  assert.match(app, /save\.topicProgress = result\.progress;/);
  assert.match(app, /topicProgress: save\.topicProgress/);
  assert.match(app, /creditTopicSession\(moduleId, accuracy\)/);
  assert.match(app, /creditForgeXp\(result\.bonusForgeXp\)/);
});

test('standalone questions, mixed questions, and forge successes all advance the right topic', () => {
  assert.match(app, /creditTopicAnswer\(moduleId, level, right\)/);
  assert.match(mixed, /callbacks\.onAnswer\?\.\(right, item\.moduleId\)/);
  assert.match(app, /onAnswer: \(right, moduleId\) => creditMixedAnswer\(right, moduleId, level\)/);
  assert.match(app, /creditTopicAnswer\(\'place-value-siege\', level, true\)/);
});

test('fresh CSS and script modules are loaded so the browser does not show old shields', () => {
  assert.match(html, /topic-campaign-cards\.css\?v=20261113a4/);
  assert.match(html, /app\.js\?v=20261114c5/);
  assert.match(app, /home\.js\?v=20261113n1/);
  assert.match(app, /battle-prep\.js\?v=20261113a4/);
  assert.match(home, /topic-progression\.js\?v=20261112p/);
});

test('two rows share the height Maths HQ has left, and the art scales to fit its cell', () => {
  assert.match(css, /row-gap: 7px;/);
  assert.match(css, /container-type: size;/);
  assert.match(css, /--topic-row: calc\(\(100cqh - var\(--topic-head\) - 20px - 7px\) \/ 2\);/);
  assert.match(css, /--topic-art-w: calc\(min\(\(var\(--topic-row\) - var\(--topic-meta\)\) \* var\(--topic-art-ratio\), \(100cqw - 24px - 4 \* 12px\) \/ 5\)\);/);
  assert.match(css, /grid-template-columns: repeat\(5, var\(--topic-art-w\)\);/);
  assert.match(css, /min-height: calc\(var\(--topic-head\) \+ 2 \* \(120px \+ 33px\) \+ 7px \+ 20px\);/);
  assert.doesNotMatch(css, /\.gb-topic-campaign-card\s*\{[^}]*\bheight:\s*\d+px/, 'no fixed card heights that chop the art');
  assert.doesNotMatch(css, /max-height:\s*clamp\(/, 'no guessed image height caps');
  assert.match(css, /@media \(max-width: 870px\)/);
  assert.match(css, /@media \(max-width: 540px\)/);
});

test('topic-campaign-cards.css is the only stylesheet that styles the topic cards', () => {
  const sheets = readdirSync(new URL('../css/', import.meta.url)).filter((name) => name.endsWith('.css') && name !== 'topic-campaign-cards.css');
  for (const name of sheets) {
    const text = readFileSync(new URL(`../css/${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /mission-all-topics|mission-topic-grid|gb-topic-campaign|\.gb-story-/, `${name} styles the topic cards`);
  }
});

test('original art is never cropped, zoomed, faded or covered by an extra title', () => {
  assert.match(css, /object-fit:\s*contain;/);
  assert.match(css, /object-position: center;/);
  assert.match(css, /filter: none;/);
  assert.match(css, /transform: none;/);
  assert.match(css, /background: #000;/);
  assert.doesNotMatch(home, /gb-topic-card-shade/);
  assert.match(home, /topic\.moduleArt \? '' :/);
  assert.match(css, /\.gb-topic-campaign-line\s*\{[\s\S]*?position: static;/);
});

test('the shared gallery is black, while individual cards and rank strips are transparent', () => {
  assert.match(css, /\.mission-topic-section,\s*body\.mission-mode #screen-home \.mission-all-topics\s*\{\s*background: #000;/);
  assert.match(css, /\.gb-topic-campaign-card\s*\{[\s\S]*?background: transparent;/);
  assert.match(css, /\.gb-topic-campaign-line\s*\{[\s\S]*?background: transparent;/);
  assert.match(css, /\.gb-story-art\s*\{[\s\S]*?overflow: visible;/);
  assert.match(css, /\.gb-story-art-img\s*\{[\s\S]*?height: auto;[\s\S]*?object-fit: contain;/);
});
