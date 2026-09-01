export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfx: GainNode | null = null;
  music: GainNode | null = null;
  muted = false;
  musicPhase: "off" | "menu" | "fight" | "climax" | "end" = "off";
  private musicTimer: number | null = null;
  private step = 0;
  vols = { master: 0.85, sfx: 0.9, music: 0.55 };

  resume() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.apply();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  apply() {
    if (!this.master || !this.sfx || !this.music) return;
    this.master.gain.value = this.muted ? 0 : this.vols.master;
    this.sfx.gain.value = this.vols.sfx;
    this.music.gain.value = this.vols.music;
  }

  beep(freq: number, dur: number, type: OscillatorType, gain: number, dest: GainNode | null = this.sfx) {
    if (!this.ctx || !dest) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(dest);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }

  noise(dur: number, gain: number, hp = 400) {
    if (!this.ctx || !this.sfx) return;
    const n = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = n;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start();
  }

  swing() {
    this.noise(0.12, 0.12, 900);
    this.beep(180, 0.08, "triangle", 0.04);
  }
  hit(impact: number, metal: boolean) {
    this.noise(0.09 + impact * 0.01, 0.16 + impact * 0.02, metal ? 1800 : 500);
    this.beep(metal ? 420 : 140, 0.1, "square", 0.05 + impact * 0.008);
  }
  block() {
    this.noise(0.08, 0.2, 2200);
    this.beep(520, 0.07, "square", 0.07);
  }
  foot() {
    this.noise(0.06, 0.06, 200);
  }
  armor() {
    this.beep(700, 0.04, "triangle", 0.03);
    this.noise(0.05, 0.05, 1600);
  }
  jump() {
    this.beep(220, 0.1, "sine", 0.05);
  }
  throw() {
    this.beep(160, 0.12, "sawtooth", 0.04);
    this.noise(0.1, 0.08, 700);
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, 0.22, "triangle", 0.07, this.music), i * 120));
  }
  lose() {
    [392, 330, 262].forEach((f, i) => setTimeout(() => this.beep(f, 0.28, "sine", 0.07, this.music), i * 160));
  }
  ui() {
    this.beep(660, 0.05, "square", 0.04);
  }
  crowd(cheer: boolean) {
    this.noise(cheer ? 0.4 : 0.25, cheer ? 0.08 : 0.04, 600);
  }

  setPhase(phase: AudioEngine["musicPhase"]) {
    if (this.musicPhase === phase) return;
    this.musicPhase = phase;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (phase === "off") return;
    this.step = 0;
    const bpm = phase === "menu" ? 86 : phase === "fight" ? 110 : phase === "climax" ? 140 : 70;
    this.musicTimer = window.setInterval(() => this.tick(), 60000 / bpm / 2);
  }

  private tick() {
    if (!this.ctx || !this.music) return;
    const i = this.step++ % 16;
    const root = this.musicPhase === "menu" ? 110 : this.musicPhase === "end" ? 98 : 130.81;
    const scale = [0, 3, 5, 7, 10, 12];
    if (i % 4 === 0) this.beep(root, 0.18, "sine", 0.045, this.music);
    if (i === 0 || i === 8) this.beep(root * 2, 0.1, "triangle", 0.03, this.music);
    if (this.musicPhase === "fight" || this.musicPhase === "climax") {
      if (i % 2 === 0) this.noise(0.04, this.musicPhase === "climax" ? 0.05 : 0.03, 200);
      const note = scale[(i * 3) % scale.length];
      if (i % 3 === 0) this.beep(root * Math.pow(2, note / 12) * 2, 0.12, "square", 0.02, this.music);
    }
    if (this.musicPhase === "menu" && i === 4) this.beep(root * 1.5, 0.3, "triangle", 0.025, this.music);
  }
}
