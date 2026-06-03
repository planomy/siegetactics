import { TURRETS, TURRET_ORDER } from './turrets-data.js';
import { STAR_COUNT, STAR_LABELS, STAR_HINTS, badgeSrc } from './stars.js';
import { ECONOMY } from './economy.js';

/**
 * @typedef {Object} BragHeadline
 * @property {string} headline
 * @property {string} subline
 */

/**
 * @typedef {Object} NextGoal
 * @property {'badge'|'turret'|'kills'|'granny'|'mastery'} kind
 * @property {string} title
 * @property {string} detail
 * @property {number} progress 0–1
 * @property {string} progressLabel
 * @property {string} [iconSrc]
 */

/**
 * @param {{
 *   stats: { kills: number, leaks: number, won: boolean, wavesCleared: number },
 *   starResult: { stars: number },
 *   prevBestKills: number,
 *   prevBestStars: number,
 * }} ctx
 * @returns {BragHeadline}
 */
export function computeBragHeadline(ctx) {
  const { stats, starResult, prevBestKills, prevBestStars } = ctx;

  if (stats.kills > prevBestKills && prevBestKills > 0) {
    return {
      headline: `New record — ${stats.kills} blasted!`,
      subline: `Your old best was ${prevBestKills}. Granny noticed.`,
    };
  }

  if (starResult.stars > prevBestStars && starResult.stars > 1) {
    const rank = STAR_LABELS[starResult.stars - 1];
    return {
      headline: `${rank} badge earned!`,
      subline: `${starResult.stars}/${STAR_COUNT} military badges on this mission.`,
    };
  }

  if (stats.won && stats.leaks === 0) {
    return {
      headline: 'Flawless porch defense!',
      subline: `Not one alien past the line. ${stats.wavesCleared} wave${stats.wavesCleared === 1 ? '' : 's'} cleared.`,
    };
  }

  if (stats.won) {
    return {
      headline: 'Minute survived!',
      subline: `${stats.kills} aliens blasted · ${stats.leaks} got through · ${stats.wavesCleared} wave${stats.wavesCleared === 1 ? '' : 's'}.`,
    };
  }

  if (stats.kills > prevBestKills) {
    return {
      headline: `New blast record — ${stats.kills}!`,
      subline: 'They still broke through. Tighten the line next siege.',
    };
  }

  return {
    headline: 'They broke through!',
    subline: `${stats.kills} blasted before the line fell. Forge again and hold longer.`,
  };
}

/** @param {string} id @param {number} xp */
function turretGoal(id, xp) {
  const t = TURRETS[id];
  const need = t.unlockXp;
  const gap = Math.max(0, need - xp);
  const runsHint = gap <= 0 ? 'Ready to unlock!' : `~${Math.ceil(gap / 85)} good sieges at this pace`;
  return {
    kind: 'turret',
    title: `Unlock ${t.name}`,
    detail: `${t.desc} — ${runsHint}`,
    progress: need > 0 ? Math.min(1, xp / need) : 1,
    progressLabel: `${xp.toLocaleString()} / ${need.toLocaleString()} ${ECONOMY.forgeXpLabel}`,
    iconSrc: t.sprite,
  };
}

/** @param {number} bestBadges badges already earned (0–5) */
function badgeGoal(bestBadges) {
  const idx = Math.min(bestBadges, STAR_COUNT - 1);
  return {
    kind: 'badge',
    title: `Earn ${STAR_LABELS[idx]} badge`,
    detail: STAR_HINTS[idx],
    progress: bestBadges / STAR_COUNT,
    progressLabel: `${bestBadges}/${STAR_COUNT} badges mastered`,
    iconSrc: badgeSrc(idx + 1),
  };
}

/**
 * @param {{
 *   save: { xp: number, unlockedTurrets: string[], bestStars: Record<string, number>, bestKills: Record<string, number>, grannyUnlocked?: boolean, granddaddySeen?: boolean, granddaddySiegeTarget?: number|null, siegesCompleted?: number },
 *   missionId: string,
 *   stats: { kills: number },
 * }} ctx
 * @returns {NextGoal}
 */
export function computeNextGoal(ctx) {
  const { save, missionId, stats } = ctx;
  const bestBadges = save.bestStars[missionId] ?? 0;
  const bestKills = save.bestKills[missionId] ?? 0;

  const nextTurretId = TURRET_ORDER.find(
    (id) => !save.unlockedTurrets.includes(id) && TURRETS[id].unlockXp > 0
  );
  const turret = nextTurretId ? turretGoal(nextTurretId, save.xp) : null;
  const badge = bestBadges < STAR_COUNT ? badgeGoal(bestBadges) : null;

  if (!save.grannyUnlocked && !save.granddaddySeen) {
    const target = save.granddaddySiegeTarget ?? 5;
    const sieges = save.siegesCompleted ?? 0;
    const remaining = target - sieges;
    if (remaining > 0 && remaining <= 2) {
      return {
        kind: 'granny',
        title: 'Granny\'s nuke cache awaits',
        detail:
          remaining === 1
            ? 'Something big is circling the farm… one more siege.'
            : 'Keep holding — Granny\'s almost ready to join the fight.',
        progress: Math.min(1, sieges / target),
        progressLabel: `${sieges} / ~${target} sieges`,
        iconSrc: 'assets/cupcake-missile.png',
      };
    }
  }

  if (turret && turret.progress >= 0.55) return turret;
  if (badge) return badge;
  if (turret) return turret;

  if (stats.kills < bestKills || bestKills === 0) {
    return {
      kind: 'kills',
      title: `Beat ${bestKills} blasts`,
      detail: 'Your personal best on this mission. More aliens = more siege coins mid-fight.',
      progress: bestKills > 0 ? Math.min(1, stats.kills / bestKills) : 0,
      progressLabel: `${stats.kills} / ${bestKills} this run`,
      iconSrc: TURRETS['granny-blaster'].sprite,
    };
  }

  return {
    kind: 'mastery',
    title: 'Full arsenal forged',
    detail: 'Every turret unlocked. Chase a flawless Marshal run — 2 leaks or fewer.',
    progress: bestBadges / STAR_COUNT,
    progressLabel: `${bestBadges}/${STAR_COUNT} badges mastered`,
    iconSrc: badgeSrc(STAR_COUNT),
  };
}

/**
 * @param {HTMLElement} container
 * @param {NextGoal} goal
 */
export function renderNextGoal(container, goal) {
  container.innerHTML = `
    <span class="next-goal-label">Next up</span>
    <div class="next-goal-body">
      <img class="next-goal-icon" src="${goal.iconSrc ?? ''}" alt="" width="56" height="56" />
      <div class="next-goal-copy">
        <strong class="next-goal-title">${goal.title}</strong>
        <p class="next-goal-detail">${goal.detail}</p>
        <div class="next-goal-progress" role="progressbar" aria-valuenow="${Math.round(goal.progress * 100)}" aria-valuemin="0" aria-valuemax="100">
          <div class="next-goal-progress-fill" style="width: ${Math.round(goal.progress * 100)}%"></div>
        </div>
        <span class="next-goal-progress-text">${goal.progressLabel}</span>
      </div>
    </div>
  `;
}
