// =============================================================================
// Procedural 8-bit Music Generator - Celtic Minor Style
// Randomly generated each floor for variety
// =============================================================================

const Music = {
  ctx: null,
  gainNode: null,
  playing: false,
  _timer: null,
  _nextTime: 0,
  _beat: 0,
  _bar: 0,
  _totalBars: 0,

  // Generated per-floor
  tempo: 0,
  progression: [],
  arpPattern: [],
  melodyNotes: [],
  bassOctave: 2,
  arpOctave: 3,
  melodyOctave: 4,
  keyOffset: 0,
  swingAmount: 0,

  // Natural minor scale: semitones from root
  SCALE: [0, 2, 3, 5, 7, 8, 10],

  // Chords as scale degree indices [root, third, fifth]
  CHORDS: {
    i:   [0, 2, 4],
    III: [2, 4, 6],
    iv:  [3, 5, 0],
    v:   [4, 6, 1],
    VI:  [5, 0, 2],
    VII: [6, 1, 3],
  },

  // Celtic-style minor progressions
  PROGRESSIONS: [
    ['i', 'VII', 'VI', 'VII'],
    ['i', 'VI', 'III', 'VII'],
    ['i', 'v', 'VI', 'VII'],
    ['i', 'III', 'VII', 'VI'],
    ['i', 'VII', 'VI', 'v'],
    ['i', 'iv', 'VII', 'III'],
    ['i', 'III', 'iv', 'VII'],
    ['i', 'VI', 'VII', 'i'],
    ['i', 'VII', 'III', 'VI'],
    ['i', 'iv', 'VI', 'VII'],
    ['i', 'v', 'III', 'VII'],
    ['i', 'VI', 'iv', 'VII'],
  ],

  // Arpeggio patterns (indices into 3-note chord, 8 steps per bar)
  ARP_PATTERNS: [
    [0, 1, 2, 1, 0, 1, 2, 1],
    [0, 1, 2, 0, 1, 2, 0, 2],
    [2, 1, 0, 1, 2, 1, 0, 1],
    [0, 2, 1, 0, 2, 1, 0, 2],
    [0, 1, 2, 2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2, 1, 0, 1],
    [0, 2, 0, 1, 0, 2, 1, 0],
    [0, 1, 0, 2, 0, 1, 2, 1],
  ],

  // Bass rhythm patterns (1 = play, 0 = rest, 8 steps per bar)
  BASS_PATTERNS: [
    [1, 0, 0, 0, 1, 0, 0, 0],   // half notes
    [1, 0, 0, 0, 0, 0, 1, 0],   // dotted quarter + quarter
    [1, 0, 0, 1, 0, 0, 1, 0],   // dotted rhythm
    [1, 0, 1, 0, 1, 0, 0, 0],   // three hits
    [1, 0, 0, 0, 1, 0, 1, 0],   // syncopated
  ],

  init(audioCtx, masterGain) {
    this.ctx = audioCtx;
    this.gainNode = audioCtx.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(masterGain);
  },

  // Convert scale degree + octave to frequency
  _freq(scaleDegree, octave) {
    const deg = ((scaleDegree % 7) + 7) % 7;
    const octaveBoost = Math.floor(scaleDegree / 7);
    const semi = this.SCALE[deg] + this.keyOffset;
    // A4 = 440Hz. Our root in octave `o` = 440 * 2^(o - 4)
    return 440 * Math.pow(2, (semi / 12) + (octave + octaveBoost - 4));
  },

  // Generate all musical parameters randomly
  generate() {
    // Random key offset (semitones from A): A, C, D, E, G
    const keys = [0, 3, 5, 7, 10];
    this.keyOffset = keys[Math.floor(Math.random() * keys.length)];

    // Random tempo: 70-90 BPM
    this.tempo = 70 + Math.floor(Math.random() * 21);

    // Slight swing for celtic feel (0 = straight, 0.15 = subtle swing)
    this.swingAmount = Math.random() < 0.6 ? 0.1 + Math.random() * 0.1 : 0;

    // Pick chord progression
    this.progression = this._pickRandom(this.PROGRESSIONS);

    // Pick arpeggio pattern
    this.arpPattern = this._pickRandom(this.ARP_PATTERNS);

    // Pick bass pattern
    this.bassPattern = this._pickRandom(this.BASS_PATTERNS);

    // Generate melody
    this.melodyNotes = this._generateMelody();

    // Randomize octaves slightly
    this.bassOctave = Math.random() < 0.3 ? 1 : 2;
    this.arpOctave = Math.random() < 0.4 ? 4 : 3;
    this.melodyOctave = this.arpOctave + 1;
  },

  _generateMelody() {
    const melody = [];
    let pos = 0;

    for (let bar = 0; bar < this.progression.length; bar++) {
      const chordName = this.progression[bar];
      const chordTones = this.CHORDS[chordName];
      const barNotes = [];

      for (let step = 0; step < 8; step++) {
        // Strong beats (0, 4) prefer chord tones
        const isStrong = step === 0 || step === 4;
        // Weak beats sometimes rest
        const shouldPlay = isStrong ? Math.random() < 0.85 : Math.random() < 0.5;

        if (isStrong || Math.random() < 0.4) {
          // Jump to a chord tone
          pos = chordTones[Math.floor(Math.random() * chordTones.length)];
        } else {
          // Step-wise motion (up or down 1 scale degree)
          const dir = Math.random() < 0.5 ? 1 : -1;
          pos = ((pos + dir) % 7 + 7) % 7;
        }

        barNotes.push({
          degree: pos,
          play: shouldPlay,
          long: isStrong && Math.random() < 0.4,
        });
      }
      melody.push(barNotes);
    }
    return melody;
  },

  _pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // Start playing (generates new music)
  start() {
    if (!this.ctx) return;
    this.stop();
    this.generate();
    this.playing = true;
    this._beat = 0;
    this._bar = 0;
    this._totalBars = 0;
    this._nextTime = this.ctx.currentTime + 0.15;

    // Fade in
    const t = this.ctx.currentTime;
    this.gainNode.gain.setValueAtTime(0, t);
    this.gainNode.gain.linearRampToValueAtTime(1, t + 3);

    this._scheduleLoop();
  },

  // Stop playing
  stop() {
    this.playing = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    if (this.gainNode && this.ctx) {
      const t = this.ctx.currentTime;
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, t);
      this.gainNode.gain.linearRampToValueAtTime(0, t + 0.8);
    }
  },

  // Fade volume (for boss transition etc.)
  fadeToVolume(vol, duration) {
    if (!this.gainNode || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, t);
    this.gainNode.gain.linearRampToValueAtTime(vol, t + (duration || 1));
  },

  // Regenerate music (e.g. on new floor) with crossfade
  regenerate() {
    if (!this.playing || !this.ctx) {
      this.start();
      return;
    }
    // Fade out, regenerate, fade in
    const t = this.ctx.currentTime;
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, t);
    this.gainNode.gain.linearRampToValueAtTime(0, t + 1.5);

    setTimeout(() => {
      if (!this.playing) return;
      this.generate();
      this._beat = 0;
      this._bar = 0;
      this._nextTime = this.ctx.currentTime + 0.1;
      this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 2);
    }, 1600);
  },

  // --- Scheduler ---
  _scheduleLoop() {
    if (!this.playing) return;

    const lookAhead = 0.25;

    while (this._nextTime < this.ctx.currentTime + lookAhead) {
      this._playStep(this._nextTime, this._beat, this._bar);

      // 8th note duration with optional swing
      let stepDur = 60 / this.tempo / 2;
      if (this.swingAmount > 0 && this._beat % 2 === 0) {
        stepDur *= (1 + this.swingAmount);
      } else if (this.swingAmount > 0) {
        stepDur *= (1 - this.swingAmount);
      }
      this._nextTime += stepDur;

      this._beat++;
      if (this._beat >= 8) {
        this._beat = 0;
        this._bar++;
        this._totalBars++;
        if (this._bar >= this.progression.length) {
          this._bar = 0;
        }
      }
    }

    this._timer = setTimeout(() => this._scheduleLoop(), 60);
  },

  _playStep(time, beat, bar) {
    const chordName = this.progression[bar % this.progression.length];
    const chordTones = this.CHORDS[chordName];
    const eighthDur = 60 / this.tempo / 2;

    // === Bass (triangle wave) ===
    if (this.bassPattern[beat]) {
      const bassRoot = chordTones[0];
      // Find next bass hit for duration calculation
      let dur = eighthDur * 3;
      for (let i = beat + 1; i < 8; i++) {
        if (this.bassPattern[i]) {
          dur = eighthDur * (i - beat) * 0.9;
          break;
        }
      }
      this._playNote(this._freq(bassRoot, this.bassOctave), time, dur, 'triangle', 0.09);

      // Occasional octave double for fullness
      if (beat === 0 && Math.random() < 0.3) {
        this._playNote(this._freq(bassRoot, this.bassOctave + 1), time, dur * 0.5, 'triangle', 0.03);
      }
    }

    // === Arpeggio (square wave) ===
    const arpIdx = this.arpPattern[beat];
    const arpDeg = chordTones[arpIdx % chordTones.length];
    const arpVol = (beat === 0 || beat === 4) ? 0.04 : 0.025;
    this._playNote(this._freq(arpDeg, this.arpOctave), time, eighthDur * 0.7, 'square', arpVol);

    // === Melody (square wave, higher octave) ===
    const melodyBar = this.melodyNotes[bar % this.melodyNotes.length];
    if (melodyBar && melodyBar[beat]) {
      const mNote = melodyBar[beat];
      if (mNote.play) {
        const mDur = mNote.long ? eighthDur * 2 : eighthDur * 0.6;
        this._playNote(this._freq(mNote.degree, this.melodyOctave), time, mDur, 'square', 0.025);
      }
    }

    // === Occasional harmony note (every 2 bars, on strong beats) ===
    if (this._totalBars % 2 === 0 && beat === 0 && Math.random() < 0.3) {
      // Add third above root
      const harmDeg = chordTones[1];
      this._playNote(this._freq(harmDeg, this.arpOctave), time, eighthDur * 3, 'triangle', 0.02);
    }
  },

  _playNote(freq, time, duration, type, gain) {
    if (!this.ctx || freq <= 0 || freq > 8000) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    // 8-bit style envelope: quick attack, sustain, quick release
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.005);
    g.gain.setValueAtTime(gain * 0.85, time + duration * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(g);
    g.connect(this.gainNode);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  },
};
