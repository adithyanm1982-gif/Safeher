const PATTERNS = ['wail', 'yelp', 'hilo'];

export class Siren {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.osc2 = null;
    this.gain = null;
    this.timer = null;
    this.running = false;
    this.step = 0;
    this.patternIndex = 0;
  }

  async start() {
    if (this.running) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      this.ctx = new AC();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.9;
      const comp = this.ctx.createDynamicsCompressor();
      this.osc = this.ctx.createOscillator();
      this.osc.type = 'sawtooth';
      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'square';
      const g2 = this.ctx.createGain();
      g2.gain.value = 0.35;
      this.osc.connect(this.gain);
      this.osc2.connect(g2);
      g2.connect(this.gain);
      this.gain.connect(comp);
      comp.connect(this.ctx.destination);
      this.osc.start();
      this.osc2.start();
      this.running = true;
      this.step = 0;
      this.timer = setInterval(() => this.tick(), 120);
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  tick() {
    if (!this.running || !this.ctx) return;
    this.step += 1;
    if (this.step % 40 === 0) this.patternIndex = (this.patternIndex + 1) % PATTERNS.length;
    const now = this.ctx.currentTime;
    const p = PATTERNS[this.patternIndex];
    let f;
    if (p === 'wail') {
      const phase = (this.step % 16) / 16;
      f = 600 + 900 * (phase < 0.5 ? phase * 2 : (1 - phase) * 2);
    } else if (p === 'yelp') {
      const phase = (this.step % 4) / 4;
      f = 700 + 1100 * phase;
    } else {
      f = this.step % 4 < 2 ? 960 : 770;
    }
    this.osc.frequency.linearRampToValueAtTime(f, now + 0.11);
    this.osc2.frequency.linearRampToValueAtTime(f * 1.5, now + 0.11);
  }

  stop() {
    this.running = false;
    clearInterval(this.timer);
    this.timer = null;
    try {
      this.osc && this.osc.stop();
      this.osc2 && this.osc2.stop();
    } catch {
      /* already stopped */
    }
    try {
      this.ctx && this.ctx.close();
    } catch {
      /* ignore */
    }
    this.ctx = this.osc = this.osc2 = this.gain = null;
  }
}

export class Ringtone {
  constructor() {
    this.ctx = null;
    this.timer = null;
  }

  async start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || this.ctx) return;
    try {
      this.ctx = new AC();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      const ring = () => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        [0, 0.5].forEach((off) => {
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.frequency.value = 440;
          const o2 = this.ctx.createOscillator();
          o2.frequency.value = 480;
          g.gain.setValueAtTime(0.0001, t + off);
          g.gain.exponentialRampToValueAtTime(0.3, t + off + 0.05);
          g.gain.setValueAtTime(0.3, t + off + 0.35);
          g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.4);
          o.connect(g);
          o2.connect(g);
          g.connect(this.ctx.destination);
          o.start(t + off);
          o2.start(t + off);
          o.stop(t + off + 0.45);
          o2.stop(t + off + 0.45);
        });
      };
      ring();
      this.timer = setInterval(ring, 2500);
    } catch {
      this.stop();
    }
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    try {
      this.ctx && this.ctx.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
  }
}
