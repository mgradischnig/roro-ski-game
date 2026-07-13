// Synthesized retro sound effects for the car-racing mode. Everything here
// is generated in code via WebAudio — the repo has NO audio assets and
// must stay that way. Every method is defensive: a missing/closed audio
// context (or any node-creation failure) is a silent no-op, never a crash.
export class SoundFX {
  constructor(scene) {
    this.ctx = (scene && scene.sound && scene.sound.context) || null;
    this.enabled = !!this.ctx;
    this.master = null;
    this.noiseBuffer = null;

    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;

    this._lastSkidAt = 0;

    if (!this.enabled) return;

    try {
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.14;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      // If the master node can't be built, treat SFX as disabled entirely.
      this.enabled = false;
      this.master = null;
    }
  }

  // Lazily build (and cache) a 1-second white-noise buffer, shared by every
  // noise-based effect (crash/skid/whoosh).
  _getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;
    if (!this._ok()) return null;

    try {
      const rate = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, rate, rate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
      return buffer;
    } catch (e) {
      return null;
    }
  }

  _ok() {
    return this.enabled && this.ctx && this.ctx.state !== 'closed' && this.master;
  }

  // =====================
  // ENGINE (looping drone, idempotent start/stop)
  // =====================
  startEngine() {
    if (!this._ok()) return;
    if (this.engineOsc1 || this.engineOsc2) return; // already running

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, now);

      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(61, now); // ~6Hz detune from osc1

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.05, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);

      osc1.start();
      osc2.start();

      this.engineOsc1 = osc1;
      this.engineOsc2 = osc2;
      this.engineFilter = filter;
      this.engineGain = gain;
    } catch (e) {
      this.engineOsc1 = null;
      this.engineOsc2 = null;
      this.engineFilter = null;
      this.engineGain = null;
    }
  }

  setEngineSpeed(ratio) {
    if (!this._ok()) return;
    if (!this.engineOsc1 || !this.engineOsc2 || !this.engineGain) return;

    try {
      const r = Math.min(1, Math.max(0, ratio));
      const now = this.ctx.currentTime;
      const base = 55 + r * (150 - 55);
      const detuned = base + 6; // osc2 stays ~6Hz above osc1 across the range

      this.engineOsc1.frequency.setTargetAtTime(base, now, 0.08);
      this.engineOsc2.frequency.setTargetAtTime(detuned, now, 0.08);

      const gainValue = 0.04 + r * (0.07 - 0.04);
      this.engineGain.gain.setTargetAtTime(gainValue, now, 0.08);
    } catch (e) {
      // no-op
    }
  }

  stopEngine() {
    try {
      if (this.engineOsc1) {
        this.engineOsc1.stop();
        this.engineOsc1.disconnect();
      }
    } catch (e) {
      // no-op
    }
    try {
      if (this.engineOsc2) {
        this.engineOsc2.stop();
        this.engineOsc2.disconnect();
      }
    } catch (e) {
      // no-op
    }
    try {
      if (this.engineFilter) this.engineFilter.disconnect();
    } catch (e) {
      // no-op
    }
    try {
      if (this.engineGain) this.engineGain.disconnect();
    } catch (e) {
      // no-op
    }
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;
  }

  // =====================
  // CRASH (180ms noise burst, lowpass, exponential decay)
  // =====================
  crash() {
    if (!this._ok()) return;
    const buffer = this._getNoiseBuffer();
    if (!buffer) return;

    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);

      source.start(now);
      source.stop(now + 0.18);
      source.onended = () => {
        try {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (e) {
          // no-op
        }
      };
    } catch (e) {
      // no-op
    }
  }

  // =====================
  // SKID (120ms noise burst, highpass, throttled)
  // =====================
  skid() {
    if (!this._ok()) return;

    const now = Date.now();
    if (now - this._lastSkidAt < 350) return;
    this._lastSkidAt = now;

    const buffer = this._getNoiseBuffer();
    if (!buffer) return;

    try {
      const ctx = this.ctx;
      const t0 = ctx.currentTime;

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1800, t0);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);

      source.start(t0);
      source.stop(t0 + 0.12);
      source.onended = () => {
        try {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (e) {
          // no-op
        }
      };
    } catch (e) {
      // no-op
    }
  }

  // =====================
  // NITRO WHOOSH (600ms noise, bandpass sweep 300->2400Hz)
  // =====================
  nitroWhoosh() {
    if (!this._ok()) return;
    const buffer = this._getNoiseBuffer();
    if (!buffer) return;

    try {
      const ctx = this.ctx;
      const t0 = ctx.currentTime;

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, t0);
      filter.frequency.exponentialRampToValueAtTime(2400, t0 + 0.6);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);

      source.start(t0);
      source.stop(t0 + 0.6);
      source.onended = () => {
        try {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        } catch (e) {
          // no-op
        }
      };
    } catch (e) {
      // no-op
    }
  }

  // =====================
  // SPIN WHEE (comedic triangle-wave slide, for the oil-slick spin)
  // =====================
  spinWhee() {
    if (!this._ok()) return;

    try {
      const ctx = this.ctx;
      const t0 = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, t0);
      osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.35);
      osc.frequency.exponentialRampToValueAtTime(300, t0 + 0.7);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);

      osc.connect(gain);
      gain.connect(this.master);

      osc.start(t0);
      osc.stop(t0 + 0.7);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) {
          // no-op
        }
      };
    } catch (e) {
      // no-op
    }
  }

  // =====================
  // TEARDOWN
  // =====================
  destroy() {
    this.stopEngine();
    try {
      if (this.master) this.master.disconnect();
    } catch (e) {
      // no-op
    }
    this.master = null;
    this.enabled = false;
  }
}
