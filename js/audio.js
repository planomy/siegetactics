/** @typedef {'gun1'|'gun2'|'gun3'|'gun4'|'electro'|'slime'|'lazer1'|'lazer2'|'lazer3'|'missile'|'nukeFire'|'nukeExplosion'|'death'|'mothership'|'granddaddy'|'wave1warning'|'wave2warning'|'wave3warning'|'granddaddywarning'|'scuttling1'|'scuttling2'|'coreEarned'|'coreCollect'|'turretUpgrade'|'correct'|'wrong'|'cardClick'|'buttonPress'|'lockAndLoad'|'siren'} SoundId */

/** Levelled to one loudness by scripts/level-sounds.py, so the volumes in this file are the mix. */
/** @type {Record<SoundId, string>} */
const SOUND_SRC = {
  gun1: 'assets/sounds/gun1.m4a',
  gun2: 'assets/sounds/gun2.m4a',
  gun3: 'assets/sounds/gun3.m4a',
  gun4: 'assets/sounds/gun4.m4a',
  electro: 'assets/sounds/electro.m4a',
  slime: 'assets/sounds/slime.m4a',
  lazer1: 'assets/sounds/lazer1.m4a',
  lazer2: 'assets/sounds/lazer2.m4a',
  lazer3: 'assets/sounds/lazer3.m4a',
  missile: 'assets/sounds/missile.m4a',
  nukeFire: 'assets/sounds/nuke-fire.m4a',
  nukeExplosion: 'assets/sounds/nuke-explosion.m4a',
  death: 'assets/sounds/death.m4a',
  mothership: 'assets/sounds/mothership.m4a',
  granddaddy: 'assets/sounds/granddaddy.m4a',
  wave1warning: 'assets/sounds/wave1warning.m4a',
  wave2warning: 'assets/sounds/wave2warning.m4a',
  wave3warning: 'assets/sounds/wave3warning.m4a',
  granddaddywarning: 'assets/sounds/granddaddywarning.m4a',
  scuttling1: 'assets/sounds/scuttling1.m4a',
  scuttling2: 'assets/sounds/scuttling2.m4a',
  coreEarned: 'assets/sounds/core-earned.m4a',
  coreCollect: 'assets/sounds/core-collect.m4a',
  turretUpgrade: 'assets/sounds/turret-upgrade.m4a',
  correct: 'assets/sounds/correct.m4a',
  wrong: 'assets/sounds/wrong.m4a',
  cardClick: 'assets/sounds/card-click.m4a',
  buttonPress: 'assets/sounds/button-press.m4a',
  lockAndLoad: 'assets/sounds/lock-and-load.m4a',
  siren: 'assets/sounds/siren-alert.m4a',
};

/** @type {Record<string, { id: SoundId, volume: number, rate: number, gap?: number }>} */
const DEATH_BY_CRAFT = {
  monster1: { id: 'death', volume: 0.38, rate: 1.06 },
  monster2: { id: 'death', volume: 0.41, rate: 0.94 },
  monster3: { id: 'death', volume: 0.37, rate: 1.14 },
  monster4: { id: 'death', volume: 0.43, rate: 0.88 },
  monster5: { id: 'death', volume: 0.4, rate: 1.02 },
  mothership: { id: 'nukeExplosion', volume: 0.63, rate: 0.92, gap: 0.18 },
  mothership2: { id: 'nukeExplosion', volume: 0.58, rate: 0.98, gap: 0.18 },
  mothership3: { id: 'nukeExplosion', volume: 0.66, rate: 0.9, gap: 0.18 },
  mothership4: { id: 'nukeExplosion', volume: 0.6, rate: 1.04, gap: 0.18 },
  granddaddy: { id: 'nukeExplosion', volume: 0.9, rate: 0.84, gap: 0.32 },
};

/** @type {Record<string, { id: SoundId, volume: number, gap: number }>} */
const TURRET_FIRE = {
  'granny-blaster': { id: 'gun1', volume: 0.42, gap: 0.1 },
  'zap-sprinkler': { id: 'gun2', volume: 0.4, gap: 0.12 },
  'slime-spitter': { id: 'slime', volume: 0.53, gap: 0.22 },
  'plasma-daisy': { id: 'lazer1', volume: 0.45, gap: 0.18 },
  'boom-gnome': { id: 'gun3', volume: 0.67, gap: 0.28 },
  'sonic-slicer': { id: 'gun4', volume: 0.45, gap: 0.24 },
  'thunder-bucket': { id: 'electro', volume: 0.56, gap: 0.32 },
  'rocket-rooster': { id: 'missile', volume: 0.62, gap: 0.38 },
  'laser-lantern': { id: 'lazer2', volume: 0.5, gap: 0.34 },
  'meteor-mortar': { id: 'lazer3', volume: 0.63, gap: 0.42 },
  'glue-goo': { id: 'slime', volume: 0.47, gap: 0.32 },
  'freeze-fridge': { id: 'electro', volume: 0.45, gap: 0.38 },
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
  /** @type {HTMLAudioElement|null} */
  let mothershipLoop = null;
  /** @type {number|null} */
  let mothershipFadeRaf = null;
  let unlocked = false;

  const MOTHERSHIP_VOLUME = 0.65;
  const MOTHERSHIP_FADE_MS = 900;

  function cancelMothershipFade() {
    if (mothershipFadeRaf != null) {
      cancelAnimationFrame(mothershipFadeRaf);
      mothershipFadeRaf = null;
    }
  }

  function startMothershipLoop() {
    if (!opts.getEnabled()) return;
    cancelMothershipFade();
    if (mothershipLoop) {
      mothershipLoop.volume = MOTHERSHIP_VOLUME;
      if (mothershipLoop.paused) mothershipLoop.play().catch(() => {});
      return;
    }
    const template = templates.mothership;
    if (!template) return;
    const loop = /** @type {HTMLAudioElement} */ (template.cloneNode());
    loop.loop = true;
    loop.volume = MOTHERSHIP_VOLUME;
    mothershipLoop = loop;
    loop.play().catch(() => {});
  }

  function fadeOutMothership(ms = MOTHERSHIP_FADE_MS) {
    const clip = mothershipLoop;
    if (!clip) return;
    mothershipLoop = null;
    cancelMothershipFade();
    const startVol = clip.volume;
    const start = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - start) / ms);
      clip.volume = Math.max(0, startVol * (1 - t));
      if (t >= 1) {
        clip.pause();
        clip.currentTime = 0;
        mothershipFadeRaf = null;
        return;
      }
      mothershipFadeRaf = requestAnimationFrame(tick);
    }
    mothershipFadeRaf = requestAnimationFrame(tick);
  }

  function stopMothership() {
    cancelMothershipFade();
    if (!mothershipLoop) return;
    mothershipLoop.pause();
    mothershipLoop.currentTime = 0;
    mothershipLoop = null;
  }

  Object.entries(SOUND_SRC).forEach(([id, src]) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    templates[/** @type {SoundId} */ (id)] = audio;
  });

  /**
   * @param {SoundId} id
   * @param {{ volume?: number, gap?: number, gapKey?: string, playbackRate?: number }} [cfg]
   */
  function play(id, cfg = {}) {
    if (!opts.getEnabled()) return;
    const volume = cfg.volume ?? 0.5;
    const gap = cfg.gap ?? 0;
    const gapKey = cfg.gapKey ?? id;
    const now = performance.now();
    if (gap > 0 && lastPlayed[gapKey] && now - lastPlayed[gapKey] < gap * 1000) return;
    lastPlayed[gapKey] = now;

    const template = templates[id];
    if (!template?.src) return;

    const clip = new Audio(template.src);
    clip.preload = 'auto';
    clip.volume = Math.min(1, Math.max(0, volume));
    if (cfg.playbackRate) clip.playbackRate = cfg.playbackRate;
    clip.play().catch(() => {});
  }

  /** @type {HTMLAudioElement|null} */
  let sirenClip = null;

  function stopSiren() {
    if (!sirenClip) return;
    sirenClip.pause();
    sirenClip = null;
  }

  function stopScuttling() {
    if (!scuttlingLoop) return;
    scuttlingLoop.pause();
    scuttlingLoop.currentTime = 0;
    scuttlingLoop = null;
  }

  return {
    /** An upgrade core bursts onto the screen. */
    playCoreEarned() {
      play('coreEarned', { volume: 1, gap: 0.5 });
    },
    /** The core lands in the header counter. */
    playCoreCollect() {
      play('coreCollect', { volume: 0.71, gap: 0.3 });
    },
    /** A turret is upgraded in the Armory. */
    playTurretUpgrade() {
      play('turretUpgrade', { volume: 0.79, gap: 0.3 });
    },
    /** A maths answer is right. */
    playCorrect() {
      play('correct', { volume: 0.79, gap: 0.15 });
    },
    /** A maths answer is wrong. */
    playWrong() {
      play('wrong', { volume: 0.5, gap: 0.15 });
    },
    /** Siren when the Defend Granny button appears; stopped as soon as it is pressed. */
    playSiren() {
      if (!opts.getEnabled() || !templates.siren?.src) return;
      stopSiren();
      sirenClip = new Audio(templates.siren.src);
      sirenClip.volume = 0.88;
      sirenClip.addEventListener('ended', () => { sirenClip = null; });
      sirenClip.play().catch(() => { sirenClip = null; });
    },
    stopSiren,
    /** "Lock and load!" with a gun cock, when Defend Granny is pressed. */
    playLockAndLoad() {
      play('lockAndLoad', { volume: 1, gap: 0.6 });
    },
    /** Mouse glides onto a topic card. */
    playCardHover() {
      play('cardClick', { volume: 0.37, gap: 0.12 });
    },
    /** Any ordinary UI button press. */
    playButtonPress() {
      play('buttonPress', { volume: 0.35, gap: 0.08 });
    },
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

    /** @param {{ craft?: string, isBoss?: boolean, bossKind?: 'mothership'|'granddaddy'|null }} [info] */
    playDeath(info = {}) {
      const craft = info.craft ?? (info.bossKind === 'granddaddy' ? 'granddaddy' : info.bossKind === 'mothership' ? 'mothership' : 'monster1');
      const profile = DEATH_BY_CRAFT[craft] ?? DEATH_BY_CRAFT.monster1;
      const jitter = 0.93 + Math.random() * 0.14;
      play(profile.id, {
        volume: profile.volume,
        gap: profile.gap ?? 0.06,
        gapKey: `death-${craft}`,
        playbackRate: profile.rate * jitter,
      });
    },

    /** @param {'mothership'|'granddaddy'} kind */
    playBoss(kind) {
      if (kind === 'mothership') {
        startMothershipLoop();
        return;
      }
      play(kind, { volume: 0.7, gap: 8 });
    },

    fadeOutMothership,

    stopMothership,

    /** Incoming wave siren during the WAVE N splash. */
    playWaveWarning(_waveNum) {
      play('wave1warning', { volume: 0.79, gap: 2 });
    },

    playGranddaddyWarning() {
      play('granddaddywarning', { volume: 0.91, gap: 8 });
    },

    /** Distinct siren when the nuke cache hits full. */
    playNukeReady() {
      play('wave3warning', { volume: 0.89, gap: 2.5, gapKey: 'nuke-ready' });
    },

    playNukeFire() {
      play('nukeFire', { volume: 0.79, gap: 0.08 });
    },

    /** A porch heart bursts when an alien gets through: the explosion, pitched up into a sharp pop. */
    playHeartBurst() {
      play('nukeExplosion', { volume: 0.45, gap: 0.15, gapKey: 'heart-burst', playbackRate: 1.6 });
    },

    /** @param {{ isBoss?: boolean }} [info] */
    playNukeExplosion(info = {}) {
      play('nukeExplosion', { volume: info.isBoss ? 1 : 0.89, gap: info.isBoss ? 0.2 : 0.12 });
    },

    /** Loop alien scuttling ambient for the active wave. */
    startScuttling(waveNum) {
      stopScuttling();
      if (!opts.getEnabled()) return;
      const id = waveNum % 2 === 0 ? 'scuttling2' : 'scuttling1';
      const template = templates[id];
      if (!template?.src) return;
      const loop = new Audio(template.src);
      loop.loop = true;
      loop.preload = 'auto';
      loop.volume = id === 'scuttling2' ? 0.97 : 0.4;
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
