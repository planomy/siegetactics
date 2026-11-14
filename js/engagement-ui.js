/**
 * Screens and pop-ups for streaks, daily challenges, lucky drops, trophies, records,
 * friend challenges and Granny's story. Game rules live in their own modules; this file
 * only draws them.
 */
import { STREAK_DAILY_GOAL, STREAK_MILESTONES } from './streak.js?v=20261113a1';
import { challengesFor, DAILY_CHEST_XP } from './daily-challenges.js?v=20261113a1';
import { TROPHIES } from './trophies.js?v=20261114h1';
import { SIEGE_RANKS, rankProgressText } from './siege-ranks.js?v=20261112a2';
import { badgeSrc } from './stars.js';

/** The painted header icon set, one family with the header buttons (see scripts/process-header-icons.py). */
export const ICONS = {
  flame: 'assets/ui/icons/flame.png?v=1',
  target: 'assets/ui/icons/target.png?v=1',
  chest: 'assets/ui/icons/chest.png?v=1',
};

/** @param {string} s */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** A centred sheet over a dimmed screen. Returns the sheet so callers can wire buttons. @param {string} cls @param {string} inner */
function openSheet(cls, inner) {
  document.querySelector('.gb-sheet-backdrop')?.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'gb-sheet-backdrop';
  backdrop.innerHTML = `<div class="gb-sheet ${cls}" role="dialog" aria-modal="true">${inner}<button type="button" class="gb-sheet-x" aria-label="Close">×</button></div>`;
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('.gb-sheet-x')?.addEventListener('click', close);
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });
  document.body.append(backdrop);
  return { sheet: /** @type {HTMLElement} */ (backdrop.querySelector('.gb-sheet')), close };
}

/* ---------- Header pills ---------- */

/** @param {HTMLElement|null} el @param {ReturnType<typeof import('./streak.js').streakStatus>} status */
export function renderStreakPill(el, status) {
  if (!el) return;
  el.classList.toggle('is-lit', status.doneToday);
  el.classList.toggle('is-waiting', !status.doneToday && status.count > 0);
  el.classList.toggle('is-new', status.count === 0 && !status.doneToday);
  el.innerHTML = `<img class="streak-flame" src="${ICONS.flame}" alt="" /><strong>${status.count === 0 && !status.doneToday ? 'START' : status.count}</strong>`;
  el.setAttribute('aria-label', `${status.count} day streak. ${status.doneToday ? 'Today is done.' : `${status.toGo} more right answers today to keep it going.`}`);
}

/** @param {HTMLElement|null} el @param {import('./daily-challenges.js').DailySave} daily */
export function renderDailyPill(el, daily) {
  if (!el) return;
  const done = daily.done.length;
  el.classList.toggle('is-complete', daily.chest);
  el.classList.toggle('is-pending', !daily.chest);
  el.innerHTML = `<img class="daily-dart" src="${daily.chest ? ICONS.chest : ICONS.target}" alt="" /><strong>${done}/3</strong>`;
  el.setAttribute('aria-label', `Daily challenges: ${done} of 3 done`);
}

/* ---------- Streak and daily panels ---------- */

/** @param {ReturnType<typeof import('./streak.js').streakStatus>} status */
export function showStreakPanel(status) {
  const next = Object.keys(STREAK_MILESTONES).map(Number).find((n) => n > status.count);
  const pct = Math.round((status.todayRight / STREAK_DAILY_GOAL) * 100);
  openSheet('streak-sheet', `
    <img class="streak-sheet-flame${status.doneToday ? ' is-lit' : ''}" src="${ICONS.flame}" alt="" />
    <h2 class="gb-sheet-title">${status.count} DAY STREAK</h2>
    <p class="gb-sheet-sub">${status.doneToday ? 'Today is locked in. See you tomorrow, Defender!' : `Get ${status.toGo} more right today to keep your streak alive.`}</p>
    <div class="gb-bar"><span style="width:${pct}%"></span></div>
    <p class="gb-sheet-small">${status.todayRight} / ${STREAK_DAILY_GOAL} right today</p>
    <ul class="streak-facts">
      ${next ? `<li>🎁 Day <b>${next}</b> pays <b>${STREAK_MILESTONES[next]}</b> Alien Crystal${STREAK_MILESTONES[next] === 1 ? '' : 's'}</li>` : ''}
      <li>🛡️ Streak shields: <b>${status.shields}</b> <span>(each one saves your streak if you miss a day; earn one every 7 days)</span></li>
      <li>🏆 Best streak: <b>${status.best}</b> days</li>
    </ul>`);
}

/** @param {import('./daily-challenges.js').DailySave} daily */
export function showDailyPanel(daily) {
  const list = challengesFor(daily.day ?? '').map((c) => {
    const have = Math.min(c.need, daily.progress[c.id] ?? 0);
    const done = daily.done.includes(c.id);
    return `
      <li class="daily-item${done ? ' is-done' : ''}">
        <span class="daily-check" aria-hidden="true">${done ? '✓' : ''}</span>
        <div class="daily-copy">
          <strong>${esc(c.text)}</strong>
          <div class="gb-bar"><span style="width:${Math.round((have / c.need) * 100)}%"></span></div>
        </div>
        <span class="daily-reward">${done ? 'DONE' : `${have}/${c.need}`}<em>+${c.xp} XP</em></span>
      </li>`;
  }).join('');
  openSheet('daily-sheet', `
    <img class="daily-sheet-dart" src="${ICONS.target}" alt="" />
    <h2 class="gb-sheet-title">DAILY CHALLENGES</h2>
    <p class="gb-sheet-sub">New ones every day. Finish all three to open Granny’s chest!</p>
    <ol class="daily-list">${list}</ol>
    <div class="daily-chest${daily.chest ? ' is-open' : ''}">
      <span aria-hidden="true">${daily.chest ? '🎁' : '🔒'}</span>
      <div><strong>${daily.chest ? 'CHEST OPENED!' : 'GRANNY’S CHEST'}</strong><span>1 Alien Crystal + ${DAILY_CHEST_XP} XP</span></div>
    </div>`);
}

/* ---------- Pop-ups ---------- */

/** A quick, non-blocking burst near the top of the screen. @param {string} icon @param {string} title @param {string} line */
export function showPop(icon, title, line) {
  const el = document.createElement('div');
  el.className = 'gb-pop';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="gb-pop-icon" aria-hidden="true">${icon}</span><div><strong>${esc(title)}</strong><span>${esc(line)}</span></div>`;
  const stack = document.querySelectorAll('.gb-pop').length;
  el.style.setProperty('--stack', String(stack));
  document.body.append(el);
  window.setTimeout(() => el.classList.add('is-leaving'), 2600);
  window.setTimeout(() => el.remove(), 3100);
}

/** @param {import('./trophies.js').Trophy} trophy */
export function showTrophyPop(trophy) {
  showPop(trophy.icon, `TROPHY: ${trophy.name.toUpperCase()}`, `New title unlocked: “${trophy.title}”`);
}

/** Granny's Log for a newly earned rank. @param {{ title: string, lines: string[] }} beat */
export function showStory(beat) {
  let page = 0;
  const { sheet, close } = openSheet('story-sheet', `
    <img class="story-granny" src="assets/granny-porch.png" alt="" />
    <div class="story-bubble">
      <span class="story-title">${esc(beat.title)}</span>
      <p class="story-line"></p>
      <button type="button" class="story-next">NEXT ▸</button>
    </div>`);
  const line = sheet.querySelector('.story-line');
  const next = sheet.querySelector('.story-next');
  const show = () => {
    if (line) line.textContent = beat.lines[page];
    if (next) next.textContent = page >= beat.lines.length - 1 ? 'LET’S GO!' : 'NEXT ▸';
  };
  next?.addEventListener('click', () => {
    if (page >= beat.lines.length - 1) close();
    else { page += 1; show(); }
  });
  show();
}

/* ---------- My Defender: ranks, trophies, records, challenges ---------- */

/**
 * @param {{
 *   level: number, record: import('./siege-ranks.js').SiegeRecord, title: string|null,
 *   earned: Record<string, string>, records: import('./trophies.js').RecordsSave,
 *   streakBest: number, crystals: number, playerName: string, siegesPlayed?: number, shields?: number,
 *   lastCode: string|null, activeChallenge: { score: number, from: string }|null,
 *   onSetTitle: (id: string|null) => void,
 *   onAcceptChallenge: (code: string, from: string) => string | { score: number, from: string },
 *   tab?: 'ranks'|'trophies'|'records'|'challenge',
 * }} p
 */
export function showProfile(p) {
  const tabs = [['ranks', 'RANKS'], ['trophies', 'TROPHIES'], ['records', 'RECORDS'], ['challenge', 'CHALLENGE']];
  const { sheet } = openSheet('profile-sheet', `
    <h2 class="gb-sheet-title">${esc(p.playerName || 'DEFENDER')}</h2>
    <nav class="profile-tabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}">${label}</button>`).join('')}</nav>
    <div class="profile-body"></div>`);
  const body = /** @type {HTMLElement} */ (sheet.querySelector('.profile-body'));

  const views = {
    ranks: () => `
      <ol class="rank-ladder-list">
        ${SIEGE_RANKS.map((rank, i) => `
          <li class="rank-ladder-item${i < p.level ? ' is-earned' : ''}${i === p.level ? ' is-next' : ''}">
            <img src="${badgeSrc(i + 1)}" alt="" width="64" height="64" />
            <strong>${rank.name}</strong>
            <span>${rank.hint}</span>
            <em>${i < p.level ? 'EARNED' : i === p.level ? rankProgressText(p.record, i) : 'LOCKED'}</em>
          </li>`).join('')}
      </ol>`,
    trophies: () => {
      const count = Object.keys(p.earned).length;
      return `
        <p class="gb-sheet-sub">${count} of ${TROPHIES.length} trophies. Tap an earned trophy to wear its title.</p>
        <div class="trophy-grid">
          ${TROPHIES.map((t) => {
            const got = Boolean(p.earned[t.id]);
            const wearing = p.title === t.id;
            return `<button type="button" class="trophy${got ? ' is-earned' : ''}${wearing ? ' is-worn' : ''}" data-trophy="${t.id}" ${got ? '' : 'disabled'}>
              <span class="trophy-icon" aria-hidden="true">${got ? t.icon : '?'}</span>
              <strong>${got ? esc(t.name) : '???'}</strong>
              <span>${esc(t.how)}</span>
              ${wearing ? '<em>WEARING</em>' : got ? '<em>WEAR TITLE</em>' : ''}
            </button>`;
          }).join('')}
        </div>
        ${p.title ? '<button type="button" class="gb-btn-ghost profile-untitle">Take off title</button>' : ''}`;
    },
    records: () => {
      const rows = [
        ['💥', 'Most aliens in one siege', p.records.bestKills.v, p.records.bestKills.d],
        ['🏰', 'Sieges played', p.siegesPlayed ?? 0],
        ['🔥', 'Longest streak', `${p.streakBest} days`],
        ['🛡️', 'Sieges won', p.records.siegesWon],
        ['💎', 'Flawless wins', p.records.zeroLeakWins],
        ['👾', 'Bosses defeated', p.records.bosses],
        ['🧁', 'Nukes fired', p.records.nukes],
        ['🔰', 'Level shields (100% runs)', p.shields ?? 0],
        ['🧠', 'Right answers', p.records.rightAnswers.toLocaleString()],
        ['🪨', 'Crystals collected', p.crystals],
        ['🤝', 'Friend challenges won', p.records.challengesWon],
      ];
      return `<ul class="records-list">${rows.map(([icon, label, value, date]) => `
        <li><span aria-hidden="true">${icon}</span><span>${label}</span><strong>${value}</strong>${date ? `<em>${date}</em>` : ''}</li>`).join('')}</ul>`;
    },
    challenge: () => `
      <div class="challenge-block">
        <h3>SEND A CHALLENGE</h3>
        ${p.lastCode
          ? `<p>Give this code to a friend. They play the same battle and try to beat your score.</p><div class="challenge-code">${p.lastCode}</div>`
          : '<p>Finish a siege to get a challenge code for your score.</p>'}
      </div>
      <div class="challenge-block">
        <h3>ACCEPT A CHALLENGE</h3>
        ${p.activeChallenge ? `<p class="challenge-active">Active: beat <b>${esc(p.activeChallenge.from || 'your friend')}</b>’s <b>${p.activeChallenge.score}</b> aliens in your next siege!</p>` : ''}
        <label>Friend’s code <input type="text" class="challenge-input" maxlength="12" placeholder="GRAN-XXXX" autocomplete="off" /></label>
        <label>Their name (optional) <input type="text" class="challenge-from" maxlength="16" placeholder="Mia" autocomplete="off" /></label>
        <button type="button" class="gb-btn challenge-accept">ACCEPT CHALLENGE</button>
        <p class="challenge-msg" aria-live="polite"></p>
      </div>`,
  };

  const show = (tab) => {
    sheet.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-tab') === tab));
    body.innerHTML = views[tab]();
    body.querySelectorAll('[data-trophy]').forEach((b) => b.addEventListener('click', () => {
      p.title = b.getAttribute('data-trophy');
      p.onSetTitle(p.title);
      show('trophies');
    }));
    body.querySelector('.profile-untitle')?.addEventListener('click', () => {
      p.title = null;
      p.onSetTitle(null);
      show('trophies');
    });
    body.querySelector('.challenge-accept')?.addEventListener('click', () => {
      const code = /** @type {HTMLInputElement|null} */ (body.querySelector('.challenge-input'))?.value ?? '';
      const from = /** @type {HTMLInputElement|null} */ (body.querySelector('.challenge-from'))?.value.trim() ?? '';
      const result = p.onAcceptChallenge(code, from);
      const msg = body.querySelector('.challenge-msg');
      if (typeof result === 'string') { if (msg) msg.textContent = result; return; }
      p.activeChallenge = result;
      show('challenge');
    });
  };
  sheet.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => show(b.getAttribute('data-tab') ?? 'ranks')));
  show(p.tab ?? 'ranks');
}

/* ---------- Results screen extras ---------- */

/**
 * @param {HTMLElement|null} host
 * @param {{ newRecord: boolean, kills: number, prevBest: number, code: string,
 *   challenge: { score: number, from: string, won: boolean }|null }} r
 */
export function renderResultsExtras(host, r) {
  if (!host) return;
  host.innerHTML = `
    ${r.newRecord ? `<div class="record-banner"><span class="record-confetti" aria-hidden="true">${'<i></i>'.repeat(18)}</span><strong>NEW RECORD!</strong><span>${r.kills} aliens · old best ${r.prevBest}</span></div>` : ''}
    ${r.challenge ? `<div class="challenge-result${r.challenge.won ? ' is-won' : ''}">
      <strong>${r.challenge.won ? 'CHALLENGE WON!' : 'SO CLOSE!'}</strong>
      <span>${r.challenge.won ? `You beat ${esc(r.challenge.from || 'your friend')}’s ${r.challenge.score} aliens!` : `${esc(r.challenge.from || 'Your friend')} got ${r.challenge.score}. You got ${r.kills}. Try again next siege!`}</span>
    </div>` : ''}
    <div class="results-share">
      <span>Challenge a friend to beat ${r.kills}:</span>
      <code class="challenge-code challenge-code--sm">${r.code}</code>
    </div>`;
}
