/**
 * Battle Cry of the Titans as reward music: it swells in while a player is on a hot streak
 * of right answers, and sits quietly under battles. It only loads the first time it is needed,
 * and every change of volume is a soft fade, never a cut.
 */

const SRC = 'assets/sounds/battle-cry-titans.m4a';
/** The track builds from here, so a streak rises with it. */
const STREAK_START_SEC = 15;
/** Battles loop the big middle section. */
const BATTLE_LOOP = { from: 30, to: 170 };
export const STREAK_MUSIC_FROM = 5;
const STREAK_VOLUME = { min: 0.15, max: 0.45, fullAt: 10 };
const BATTLE_VOLUME = 0.25;
const FADE_IN_MS = 1200;
const FADE_OUT_MS = 2000;

/** @param {number} streak Right answers in a row. @returns {number} 0 when the music should be off. */
export function streakMusicVolume(streak) {
  if (streak < STREAK_MUSIC_FROM) return 0;
  const span = STREAK_VOLUME.fullAt - STREAK_MUSIC_FROM;
  const t = Math.min(1, (streak - STREAK_MUSIC_FROM) / span);
  return STREAK_VOLUME.min + t * (STREAK_VOLUME.max - STREAK_VOLUME.min);
}

/** @param {{ getEnabled: () => boolean }} opts */
export function createMusic(opts) {
  /** @type {HTMLAudioElement|null} */
  let track = null;
  /** @type {'off'|'streak'|'battle'} */
  let mode = 'off';
  let fadeTimer = 0;

  function ensureTrack() {
    if (track) return track;
    track = new Audio(SRC);
    track.preload = 'auto';
    track.volume = 0;
    track.addEventListener('timeupdate', () => {
      if (!track) return;
      if (mode === 'battle' && track.currentTime >= BATTLE_LOOP.to) track.currentTime = BATTLE_LOOP.from;
    });
    track.addEventListener('ended', () => {
      if (!track || mode === 'off') return;
      track.currentTime = mode === 'battle' ? BATTLE_LOOP.from : STREAK_START_SEC;
      track.play().catch(() => {});
    });
    return track;
  }

  /** @param {number} target @param {number} ms @param {() => void} [done] */
  function fadeTo(target, ms, done) {
    if (!track) return;
    clearInterval(fadeTimer);
    const from = track.volume;
    const start = performance.now();
    fadeTimer = window.setInterval(() => {
      if (!track) return;
      const t = Math.min(1, (performance.now() - start) / ms);
      track.volume = Math.max(0, Math.min(1, from + (target - from) * t));
      if (t >= 1) {
        clearInterval(fadeTimer);
        done?.();
      }
    }, 50);
  }

  /** @param {number} volume @param {number} startAt */
  function playAt(volume, startAt) {
    const el = ensureTrack();
    if (el.paused) {
      const seek = () => {
        try { el.currentTime = startAt; } catch { /* the server cannot seek; it plays from the top */ }
      };
      if (el.readyState >= 1) seek();
      else el.addEventListener('loadedmetadata', seek, { once: true });
      el.play().catch(() => {});
    }
    fadeTo(volume, FADE_IN_MS);
  }

  function stop() {
    mode = 'off';
    if (!track || track.paused) return;
    fadeTo(0, FADE_OUT_MS, () => {
      if (mode === 'off') track?.pause();
    });
  }

  return {
    /** @param {number} streak Right answers in a row; below five the music fades away. */
    setStreak(streak) {
      if (mode === 'battle') return;
      const volume = opts.getEnabled() ? streakMusicVolume(streak) : 0;
      if (volume === 0) {
        if (mode === 'streak') stop();
        return;
      }
      mode = 'streak';
      playAt(volume, STREAK_START_SEC);
    },
    startBattle() {
      if (!opts.getEnabled()) return;
      const wasPlaying = track && !track.paused;
      mode = 'battle';
      playAt(BATTLE_VOLUME, wasPlaying ? track.currentTime : BATTLE_LOOP.from);
    },
    stop,
    /** Call when the music setting is switched off. */
    mute() {
      mode = 'off';
      clearInterval(fadeTimer);
      if (track) {
        track.volume = 0;
        track.pause();
      }
    },
  };
}
