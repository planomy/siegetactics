/** @typedef {'gun1'|'gun2'|'gun3'|'gun4'|'electro'|'slime'|'lazer1'|'lazer2'|'lazer3'|'missile'|'nukeFire'|'nukeExplosion'|'death'|'mothership'|'granddaddy'|'wave1warning'|'wave2warning'|'wave3warning'|'granddaddywarning'|'scuttling1'|'scuttling2'} SoundId */

/** @type {Record<SoundId, string>} */
const SOUND_SRC = {
  gun1: 'assets/sounds/gun1.mp3',
  gun2: 'assets/sounds/gun2.mp3',
  gun3: 'assets/sounds/gun3.mp3',
  gun4: 'assets/sounds/gun4.mp3',
  electro: 'assets/sounds/electro.mp3',
  slime: 'assets/sounds/slime.mp3',
  lazer1: 'assets/sounds/lazer1.mp3',
  lazer2: 'assets/sounds/lazer2.mp3',
  lazer3: 'assets/sounds/lazer3.mp3',
  missile: 'assets/sounds/missile.mp3',
  nukeFire: 'assets/sounds/nuke-fire.mp3',
  nukeExplosion: 'assets/sounds/nuke-explosion.mp3',
  death: 'assets/sounds/death.mp3',
  mothership: 'assets/sounds/mothership.mp3',
  granddaddy: 'assets/sounds/granddaddy.mp3',
  wave1warning: 'assets/sounds/wave1warning.mp3',
  wave2warning: 'assets/sounds/wave2warning.mp3',
  wave3warning: 'assets/sounds/wave3warning.mp3',
  granddaddywarning: 'assets/sounds/granddaddywarning.mp3',
  scuttling1: 'assets/sounds/scuttling1.mp3',
  scuttling2: 'assets/sounds/scuttling2.mp3',
};

/** @type {Record<number, SoundId>} */
const WAVE_WARNINGS = {
  1: 'wave1warning',
  2: 'wave2warning',
  3: 'wave3warning',
};

/** @type {Record<string, { id: SoundId, volume: number, gap: number }>} */
const TURRET_FIRE = {
  'granny-blaster': { id: 'gun1', volume: 0.42, gap: 0.1 },
  'zap-sprinkler': { id: 'gun2', volume: 0.38, gap: 0.12 },
  'slime-spitter': { id: 'slime', volume: 0.48, gap: 0.22 },
  'plasma-daisy': { id: 'lazer1', volume: 0.44, gap: 0.18 },
  'boom-gnome': { id: 'gun3', volume: 0.5, gap: 0.28 },
  'sonic-slicer': { id: 'gun4', volume: 0.46, gap: 0.24 },
  'thunder-bucket': { id: 'electro', volume: 0.52, gap: 0.32 },
  'rocket-rooster': { id: 'missile', volume: 0.55, gap: 0.38 },
  'laser-lantern': { id: 'lazer2', volume: 0.5, gap: 0.34 },
  'meteor-mortar': { id: 'lazer3', volume: 0.54, gap: 0.42 },
};

/**
 * @param {{ getEnabled: () => boolean }} opts
 */
export function createAudio(opts) {
  /** @type {Partial<Record<SoundId, HTMLAudioElement>>} */
  const templates = {};
  /** @type {Partial<Record<SoundId, number>>} */
  const lastPlayed = {};
  /** @type {HTMLAudioElement|null} */
  let scuttlingLoop = null;
  let unlocked = false;

  Object.entries(SOUND_SRC).forEach(([id, src]) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    templates[/** @type {SoundId} */ (id)] = audio;
  });

  /**
   * @param {SoundId} id
   * @param {{ volume?: number, gap?: number }} [cfg]
   */
  function play(id, cfg = {}) {
    if (!opts.getEnabled()) return;
    const volume = cfg.volume ?? 0.5;
    const gap = cfg.gap ?? 0;
    const now = performance.now();
    if (gap > 0 && lastPlayed[id] && now - lastPlayed[id] < gap * 1000) return;
    lastPlayed[id] = now;

    const template = templates[id];
    if (!template) return;

    const clip = template.cloneNode();
    clip.volume = Math.min(1, Math.max(0, volume));
    clip.play().catch(() => {});
  }

  function stopScuttling() {
    if (!scuttlingLoop) return;
    scuttlingLoop.pause();
    scuttlingLoop.currentTime = 0;
    scuttlingLoop = null;
  }

  return {
    /** Call once after a user tap so mobile browsers allow playback. */
    warmUp() {
      if (unlocked) return;
      unlocked = true;
      Object.values(templates).forEach((audio) => {
        if (!audio) return;
        const prev = audio.volume;
        audio.volume = 0.001;
        audio
          .play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = prev;
          })
          .catch(() => {});
      });
    },

    /** @param {string} turretType */
    playTurretFire(turretType) {
      const cfg = TURRET_FIRE[turretType];
      if (cfg) play(cfg.id, { volume: cfg.volume, gap: cfg.gap });
    },

    /** @param {{ isBoss?: boolean }} info */
    playDeath(info = {}) {
      play('death', { volume: info.isBoss ? 0.58 : 0.26, gap: info.isBoss ? 0.35 : 0.13 });
    },

    /** @param {'mothership'|'granddaddy'} kind */
    playBoss(kind) {
      play(kind, { volume: 0.72, gap: 8 });
    },

    /** @param {number} waveNum */
    playWaveWarning(waveNum) {
      const id = WAVE_WARNINGS[waveNum];
      if (id) play(id, { volume: 0.68, gap: 3 });
    },

    playGranddaddyWarning() {
      play('granddaddywarning', { volume: 0.75, gap: 8 });
    },

    playNukeFire() {
      play('nukeFire', { volume: 0.62, gap: 0.08 });
    },

    /** @param {{ isBoss?: boolean }} [info] */
    playNukeExplosion(info = {}) {
      play('nukeExplosion', { volume: info.isBoss ? 0.78 : 0.68, gap: info.isBoss ? 0.2 : 0.12 });
    },

    /** Loop alien scuttling ambient for the active wave. */
    startScuttling(waveNum) {
      stopScuttling();
      if (!opts.getEnabled()) return;
      const id = waveNum % 2 === 0 ? 'scuttling2' : 'scuttling1';
      const template = templates[id];
      if (!template) return;
      const loop = template.cloneNode();
      loop.loop = true;
      loop.volume = 0.34;
      scuttlingLoop = loop;
      loop.play().catch(() => {});
    },

    stopScuttling,

    pauseScuttling() {
      scuttlingLoop?.pause();
    },

    resumeScuttling() {
      if (!opts.getEnabled() || !scuttlingLoop) return;
      scuttlingLoop.play().catch(() => {});
    },
  };
}
