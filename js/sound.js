// =============================================================================
// Sound System (Web Audio API)
// =============================================================================

const Sound = {
  ctx: null,
  enabled: true,
  masterGain: null,
  bgmGain: null,
  bgmOsc: null,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0;
      this.bgmGain.connect(this.masterGain);
    } catch (e) {
      this.enabled = false;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  play(name) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    switch (name) {
      case 'hit': this._playHit(); break;
      case 'miss': this._playMiss(); break;
      case 'crit': this._playCrit(); break;
      case 'pickup': this._playPickup(); break;
      case 'levelup': this._playLevelUp(); break;
      case 'stairs': this._playStairs(); break;
      case 'trap': this._playTrap(); break;
      case 'blink': this._playBlink(); break;
      case 'skill': this._playSkill(); break;
      case 'buy': this._playPickup(); break;
      case 'death': this._playDeath(); break;
      case 'chest': this._playChest(); break;
    }
  },

  _tone(freq, duration, type, gain, delay) {
    const t = this.ctx.currentTime + (delay || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration);
  },

  _noise(duration, gain) {
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(g);
    g.connect(this.masterGain);
    src.start(t);
  },

  _playHit() {
    this._noise(0.08, 0.15);
    this._tone(200, 0.1, 'square', 0.1);
  },

  _playCrit() {
    this._noise(0.1, 0.2);
    this._tone(400, 0.08, 'sawtooth', 0.15);
    this._tone(600, 0.1, 'sawtooth', 0.12, 0.05);
  },

  _playMiss() {
    this._tone(150, 0.15, 'sine', 0.05);
  },

  _playPickup() {
    this._tone(440, 0.08, 'square', 0.1);
    this._tone(660, 0.1, 'square', 0.1, 0.07);
  },

  _playLevelUp() {
    this._tone(440, 0.12, 'square', 0.12);
    this._tone(554, 0.12, 'square', 0.12, 0.1);
    this._tone(659, 0.12, 'square', 0.12, 0.2);
    this._tone(880, 0.2, 'square', 0.15, 0.3);
  },

  _playStairs() {
    this._tone(400, 0.15, 'sine', 0.1);
    this._tone(300, 0.15, 'sine', 0.1, 0.12);
    this._tone(200, 0.2, 'sine', 0.08, 0.24);
  },

  _playTrap() {
    this._noise(0.15, 0.2);
    this._tone(100, 0.2, 'sawtooth', 0.15);
  },

  _playBlink() {
    this._tone(800, 0.05, 'sine', 0.1);
    this._tone(1200, 0.05, 'sine', 0.08, 0.04);
    this._tone(1600, 0.08, 'sine', 0.06, 0.08);
  },

  _playSkill() {
    this._tone(300, 0.06, 'sawtooth', 0.12);
    this._tone(500, 0.08, 'sawtooth', 0.1, 0.05);
    this._noise(0.06, 0.12);
  },

  _playDeath() {
    this._tone(200, 0.3, 'sawtooth', 0.15);
    this._tone(150, 0.3, 'sawtooth', 0.12, 0.2);
    this._tone(100, 0.5, 'sawtooth', 0.1, 0.4);
  },

  _playChest() {
    this._tone(523, 0.1, 'square', 0.1);
    this._tone(659, 0.1, 'square', 0.1, 0.08);
    this._tone(784, 0.15, 'square', 0.12, 0.16);
  },

  startBossBGM() {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    this.stopBGM();

    const t = this.ctx.currentTime;
    // Low drone
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, t);
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0.06, t);
    osc1.connect(g1);
    g1.connect(this.bgmGain);
    osc1.start(t);

    // Pulse
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(110, t);
    const g2 = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(2, t);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.04, t);
    lfo.connect(lfoGain);
    lfoGain.connect(g2.gain);
    g2.gain.setValueAtTime(0.04, t);
    osc2.connect(g2);
    g2.connect(this.bgmGain);
    osc2.start(t);
    lfo.start(t);

    this.bgmGain.gain.setValueAtTime(0, t);
    this.bgmGain.gain.linearRampToValueAtTime(1, t + 2);

    this.bgmOsc = [osc1, osc2, lfo];
  },

  stopBGM() {
    if (this.bgmOsc) {
      for (const o of this.bgmOsc) {
        try { o.stop(); } catch(e) {}
      }
      this.bgmOsc = null;
    }
    if (this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  },

  startAmbient() {
    // Subtle ambient - handled by just having quiet audio context ready
  },
};
