// =============================================================
//  Procedural chiptune + SFX. No asset files: every sound is
//  synthesised from oscillators and noise at runtime, the same
//  way every sprite is drawn at runtime.
//
//  Browsers refuse to start an AudioContext before a gesture, so
//  Sound.init() is called from the first keypress/button and is
//  safe to call repeatedly. M toggles mute.
// =============================================================

const Sound = {
  ctx: null,
  master: null,
  muted: false,
  _seq: null,
  _stage: 0,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;                       // no WebAudio: every call below no-ops
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.34;
    this.master.connect(this.ctx.destination);
    return true;
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.34;
    return this.muted;
  },

  // ---- primitives -------------------------------------------------
  // A pitched blip. `bend` slides to a second frequency over the note.
  tone(ctx, dest, t, { freq, to, type = 'square', dur = 0.1, gain = 0.3, attack = 0.005 }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  },

  // Filtered white noise — percussion and explosions.
  noise(ctx, dest, t, { dur = 0.2, gain = 0.3, from = 4000, to = 200, q = 1 }) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t); src.stop(t + dur + 0.02);
  },

  // ---- SFX --------------------------------------------------------
  // Pure scheduling against a supplied context so an OfflineAudioContext
  // can render these for testing.
  build(ctx, dest, name, t) {
    const T = (o) => this.tone(ctx, dest, t, o);
    const N = (o) => this.noise(ctx, dest, t, o);
    switch (name) {
      case 'shoot':   T({ freq: 880, to: 260, dur: 0.07, gain: 0.16 }); break;
      case 'machine': T({ freq: 700, to: 300, dur: 0.05, gain: 0.13 }); break;
      case 'spread':  T({ freq: 620, to: 240, dur: 0.09, gain: 0.15 });
                      T({ freq: 930, to: 360, dur: 0.09, gain: 0.09, type: 'triangle' }); break;
      case 'laser':   T({ freq: 1400, to: 420, dur: 0.16, gain: 0.14, type: 'sawtooth' });
                      T({ freq: 2100, to: 700, dur: 0.12, gain: 0.06, type: 'square' }); break;
      case 'cannon':  T({ freq: 180, to: 48, dur: 0.22, gain: 0.34 });
                      N({ dur: 0.26, gain: 0.30, from: 2200, to: 90 }); break;
      case 'explode': N({ dur: 0.55, gain: 0.42, from: 3200, to: 60, q: 2 });
                      T({ freq: 150, to: 34, dur: 0.5, gain: 0.22, type: 'sawtooth' }); break;
      case 'hit':     N({ dur: 0.09, gain: 0.20, from: 5200, to: 900 }); break;
      case 'jump':    T({ freq: 300, to: 760, dur: 0.12, gain: 0.16, type: 'square' }); break;
      case 'kick':    N({ dur: 0.11, gain: 0.26, from: 3000, to: 300 });
                      T({ freq: 240, to: 90, dur: 0.1, gain: 0.14 }); break;
      case 'hurt':    T({ freq: 420, to: 70, dur: 0.34, gain: 0.30, type: 'sawtooth' });
                      N({ dur: 0.2, gain: 0.16, from: 1800, to: 120 }); break;
      case 'pickup':  [0, 4, 7, 12].forEach((s, i) =>
                        this.tone(ctx, dest, t + i * 0.045, { freq: 523.25 * Math.pow(2, s / 12), dur: 0.1, gain: 0.18, type: 'square' })); break;
      case 'mount':   [0, 5, 7, 12, 17].forEach((s, i) =>
                        this.tone(ctx, dest, t + i * 0.055, { freq: 196 * Math.pow(2, s / 12), dur: 0.14, gain: 0.22, type: 'sawtooth' }));
                      N({ dur: 0.3, gain: 0.14, from: 900, to: 90 }); break;
      case 'warn':    [0, 1, 2, 3].forEach(i =>
                        this.tone(ctx, dest, t + i * 0.16, { freq: i % 2 ? 330 : 494, dur: 0.13, gain: 0.24, type: 'square' })); break;
      case 'clear':   [0, 4, 7, 12, 16, 19].forEach((s, i) =>
                        this.tone(ctx, dest, t + i * 0.1, { freq: 261.6 * Math.pow(2, s / 12), dur: 0.26, gain: 0.22, type: 'square' })); break;
      case 'gameover':[0, -2, -4, -7].forEach((s, i) =>
                        this.tone(ctx, dest, t + i * 0.22, { freq: 330 * Math.pow(2, s / 12), dur: 0.42, gain: 0.26, type: 'sawtooth' })); break;
      default: return false;
    }
    return true;
  },

  sfx(name) {
    if (!this.ctx || this.muted) return;
    this.build(this.ctx, this.master, name, this.ctx.currentTime);
  },

  // ---- music ------------------------------------------------------
  // One driving loop per stage: bass, arp lead, and a noise kit, run by a
  // lookahead scheduler so timing does not depend on the render loop.
  TRACKS: [
    { bpm: 150, root: 55.00, bass: [0,0,7,0, 5,5,0,0, 3,3,10,3, 5,7,5,3],
      lead: [12,16,19,16, 17,19,24,19, 15,19,22,19, 17,20,19,15], kit: 'rock' },
    { bpm: 168, root: 49.00, bass: [0,0,0,7, 3,3,10,3, 5,5,0,5, 7,7,6,7],
      lead: [19,22,24,19, 15,22,19,15, 17,24,22,17, 19,26,24,19], kit: 'techno' },
    { bpm: 138, root: 58.27, bass: [0,7,0,5, 0,7,0,3, 0,7,0,5, 8,7,5,3],
      lead: [12,19,24,19, 16,23,28,23, 12,19,24,19, 20,19,17,16], kit: 'march' },
  ],

  music(stage) {
    if (!this.ctx) return;
    this.stopMusic();
    this._stage = Math.max(0, Math.min(this.TRACKS.length - 1, stage - 1));
    const tr = this.TRACKS[this._stage];
    const spb = 60 / tr.bpm / 4;                 // 16th-note step
    let step = 0;
    let next = this.ctx.currentTime + 0.08;

    const bus = this.ctx.createGain();
    bus.gain.value = 0.55;
    bus.connect(this.master);

    const tick = () => {
      if (!this._seq) return;
      const horizon = this.ctx.currentTime + 0.18;
      while (next < horizon) {
        const i = step % 16;
        const nt = (s) => tr.root * Math.pow(2, s / 12);

        // bass on every step, staccato
        this.tone(this.ctx, bus, next, { freq: nt(tr.bass[i]), type: 'square', dur: spb * 0.85, gain: 0.20 });
        // lead arp on the offbeats
        if (i % 2 === 0) this.tone(this.ctx, bus, next, { freq: nt(tr.lead[i]) * 2, type: 'triangle', dur: spb * 1.6, gain: 0.11 });
        // kit
        if (tr.kit === 'techno' ? (i % 2 === 0) : (i % 4 === 0))
          this.noise(this.ctx, bus, next, { dur: 0.06, gain: 0.16, from: 2000, to: 200 });
        if (i % 8 === 4) this.noise(this.ctx, bus, next, { dur: 0.16, gain: 0.20, from: 6000, to: 1200, q: 0.7 });

        next += spb; step++;
      }
    };
    tick();
    this._seq = setInterval(tick, 60);
    this._bus = bus;
  },

  stopMusic() {
    if (this._seq) { clearInterval(this._seq); this._seq = null; }
    if (this._bus) { try { this._bus.disconnect(); } catch (e) {} this._bus = null; }
  },
};
