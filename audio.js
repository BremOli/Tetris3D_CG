// Musica procedural estilo chiptune + efeitos (Web Audio API). Sem ficheiros externos.
(function () {
  const LS = {
    musicVol: "tetris3d_music_vol",
    musicMute: "tetris3d_music_mute",
    sfxOn: "tetris3d_sfx_on",
    sfxVol: "tetris3d_sfx_vol",
  };

  function createGameAudio() {
    let ctx = null;
    let masterGain = null;
    let musicGain = null;
    let sfxGain = null;
    let musicTimer = null;
    let noteIndex = 0;

    const settings = {
      musicVolume: 0.4,
      musicMuted: false,
      sfxEnabled: true,
      sfxVolume: 0.55,
    };

    function load() {
      try {
        const mv = localStorage.getItem(LS.musicVol);
        if (mv != null) settings.musicVolume = Math.max(0, Math.min(1, Number(mv) / 100));
        const mm = localStorage.getItem(LS.musicMute);
        if (mm != null) settings.musicMuted = mm === "1";
        const se = localStorage.getItem(LS.sfxOn);
        if (se != null) settings.sfxEnabled = se === "1";
        const sv = localStorage.getItem(LS.sfxVol);
        if (sv != null) settings.sfxVolume = Math.max(0, Math.min(1, Number(sv) / 100));
      } catch (e) {
        /* ignore */
      }
    }

    function save() {
      try {
        localStorage.setItem(LS.musicVol, String(Math.round(settings.musicVolume * 100)));
        localStorage.setItem(LS.musicMute, settings.musicMuted ? "1" : "0");
        localStorage.setItem(LS.sfxOn, settings.sfxEnabled ? "1" : "0");
        localStorage.setItem(LS.sfxVol, String(Math.round(settings.sfxVolume * 100)));
      } catch (e) {
        /* ignore */
      }
    }

    load();

    // Melodia curta em loop (original, estilo puzzle retro)
    const melody = [
      [523.25, 1],
      [587.33, 1],
      [659.25, 1],
      [698.46, 1],
      [783.99, 1],
      [659.25, 1],
      [587.33, 1],
      [523.25, 1],
      [392.0, 1],
      [440.0, 1],
      [493.88, 1],
      [523.25, 1],
      [493.88, 1],
      [440.0, 1],
      [392.0, 1],
      [392.0, 2],
    ];

    const stepMs = 145;

    function ensureContext() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.85;
        masterGain.connect(ctx.destination);
        musicGain = ctx.createGain();
        musicGain.connect(masterGain);
        sfxGain = ctx.createGain();
        sfxGain.connect(masterGain);
        applyGains();
      }
      return ctx;
    }

    function applyGains() {
      if (!musicGain || !sfxGain || !ctx) return;
      const mv = settings.musicMuted ? 0 : settings.musicVolume;
      musicGain.gain.setTargetAtTime(mv, ctx.currentTime, 0.03);
      const sv = settings.sfxEnabled ? settings.sfxVolume : 0;
      sfxGain.gain.setTargetAtTime(sv, ctx.currentTime, 0.03);
    }

    async function resume() {
      const c = ensureContext();
      if (c && c.state === "suspended") await c.resume();
      return !!c;
    }

    function playMelodyStep() {
      if (!ctx || !musicGain || settings.musicMuted) return;
      const [freq, beats] = melody[noteIndex % melody.length];
      noteIndex++;
      const dur = 0.1 * beats;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t);
      const peak = 0.085;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    function startMusicLoop() {
      stopMusicLoop();
      if (!ensureContext() || settings.musicMuted) return;
      musicTimer = window.setInterval(playMelodyStep, stepMs);
    }

    function stopMusicLoop() {
      if (musicTimer != null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    }

    function playLock() {
      if (!settings.sfxEnabled) return;
      const c = ensureContext();
      if (!c || !sfxGain) return;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.08);
      const amp = 0.22 * settings.sfxVolume;
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.16);
    }

    function playLayerClear(layerCount) {
      if (!settings.sfxEnabled) return;
      const c = ensureContext();
      if (!c || !sfxGain) return;
      const n = Math.max(1, Math.min(6, layerCount | 0));
      const base = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      for (let i = 0; i < n; i++) {
        const delay = i * 0.055;
        window.setTimeout(() => {
          if (!ctx || !sfxGain) return;
          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(base[Math.min(i, base.length - 1)], t);
          const amp = 0.11 * settings.sfxVolume;
          g.gain.setValueAtTime(amp, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
          osc.connect(g);
          g.connect(sfxGain);
          osc.start(t);
          osc.stop(t + 0.1);
        }, delay * 1000);
      }
    }

    function setMusicVolume(v) {
      settings.musicVolume = Math.max(0, Math.min(1, Number(v)));
      applyGains();
      if (settings.musicVolume <= 0.001 || settings.musicMuted) stopMusicLoop();
      else if (!musicTimer) startMusicLoop();
      save();
    }

    function setMusicMuted(m) {
      settings.musicMuted = !!m;
      applyGains();
      if (settings.musicMuted) stopMusicLoop();
      else if (settings.musicVolume > 0.001) startMusicLoop();
      save();
    }

    function setSfxEnabled(on) {
      settings.sfxEnabled = !!on;
      applyGains();
      save();
    }

    function setSfxVolume(v) {
      settings.sfxVolume = Math.max(0, Math.min(1, Number(v)));
      applyGains();
      save();
    }

    function getSettings() {
      return {
        musicVolume: settings.musicVolume,
        musicMuted: settings.musicMuted,
        sfxEnabled: settings.sfxEnabled,
        sfxVolume: settings.sfxVolume,
      };
    }

    return {
      ensureContext,
      resume,
      startMusicLoop,
      stopMusicLoop,
      playLock,
      playLayerClear,
      setMusicVolume,
      setMusicMuted,
      setSfxEnabled,
      setSfxVolume,
      getSettings,
    };
  }

  window.createGameAudio = createGameAudio;
})();
