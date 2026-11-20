class Synth {
  ctx?: AudioContext;
  analyser?: AnalyserNode;
  master?: GainNode;
  gains: GainNode[] = [];
  tones: OscillatorNode[] = [];
  playing = false;
  init() {
    if (this.ctx) return;
    const c = (this.ctx = new AudioContext());
    const master = (this.master = c.createGain());
    master.gain.value = 0;
    this.analyser = c.createAnalyser();
    this.analyser.fftSize = 1024;
    master.connect(this.analyser).connect(c.destination);
    this.gains = Array.from({ length: 4 }, () => {
      const g = c.createGain();
      g.gain.value = 0;
      g.connect(master);
      return g;
    });
    for (const [i, f] of [180, 184].entries()) {
      const o = c.createOscillator();
      o.frequency.value = f;
      const p = c.createStereoPanner();
      p.pan.value = i ? 1 : -1;
      o.connect(p).connect(this.gains[0]);
      o.start();
      this.tones.push(o);
    }
    for (const [idx, hz, type] of [
      [1, 1400, "lowpass"],
      [2, 170, "lowpass"],
      [3, 2750, "bandpass"],
    ] as const) {
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = hz;
      f.connect(this.gains[idx]);
      if (idx === 2) {
        const o = c.createOscillator();
        o.type = "triangle";
        o.frequency.value = 48;
        o.connect(f);
        o.start();
        this.tones.push(o);
      } else {
        const b = c.createBuffer(1, c.sampleRate * 7, c.sampleRate);
        const a = b.getChannelData(0);
        let n = 0;
        for (let i = 0; i < a.length; i++) {
          const w = Math.random() * 2 - 1;
          n = 0.96 * n + 0.04 * w;
          a[i] = idx === 1 ? n * 2 : Math.random() < 0.0008 ? w : 0;
        }
        const s = c.createBufferSource();
        s.buffer = b;
        s.loop = true;
        s.connect(f);
        s.start();
      }
    }
  }
  volumes(values: number[]) {
    this.gains.forEach((g, i) =>
      g.gain.setTargetAtTime(
        (values[i] / 100) * 0.24,
        this.ctx!.currentTime,
        0.05,
      ),
    );
  }
  frequency(value: number) {
    this.tones
      .slice(0, 2)
      .forEach((o, i) =>
        o.frequency.setTargetAtTime(value + i * 4, this.ctx!.currentTime, 0.05),
      );
  }
  async toggle(values: number[], frequency: number) {
    this.init();
    await this.ctx!.resume();
    this.playing = !this.playing;
    this.volumes(values);
    this.frequency(frequency);
    this.master!.gain.setTargetAtTime(
      this.playing ? 0.65 : 0,
      this.ctx!.currentTime,
      0.06,
    );
    return this.playing;
  }
  async prepare() {
    this.init();
    await this.ctx!.resume();
  }
  chime() {
    const c = this.ctx;
    if (!c || c.state !== "running") return;
    [523, 659, 784].forEach((f, i) => {
      const o = c.createOscillator(),
        g = c.createGain(),
        t = c.currentTime + i * 0.14;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.5);
    });
  }
}
export const audio = new Synth();
