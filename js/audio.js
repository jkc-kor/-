/* Web Audio: 기타 플럭(Karplus-Strong), 메트로놈, 뮤트 스트럼, 스케줄러 */
window.GL = window.GL || {};

GL.audio = (function () {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  const ksCache = new Map();

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function now() { return ensure().currentTime; }

  function freq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  /** Karplus-Strong 버퍼 생성 (정수 주기 + playbackRate 보정으로 정확한 음정) */
  function ksBuffer(midi) {
    if (ksCache.has(midi)) return ksCache.get(midi);
    const sr = ctx.sampleRate;
    const f = freq(midi);
    const P = Math.max(2, Math.round(sr / f));
    const dur = 2.2;
    const N = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, N, sr);
    const d = buf.getChannelData(0);
    const ring = new Float32Array(P);
    let prev = 0;
    for (let i = 0; i < P; i++) {
      // 살짝 로우패스된 노이즈로 피킹 어택을 부드럽게
      const r = Math.random() * 2 - 1;
      prev = prev * 0.45 + r * 0.55;
      ring[i] = prev;
    }
    const damp = midi > 70 ? 0.994 : 0.997;
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const cur = ring[idx];
      const nxt = ring[(idx + 1) % P];
      ring[idx] = damp * 0.5 * (cur + nxt);
      d[i] = cur;
      idx = (idx + 1) % P;
    }
    const rate = f / (sr / (P + 0.5));
    const entry = { buf, rate };
    ksCache.set(midi, entry);
    return entry;
  }

  function pluck(midi, time, opts = {}) {
    ensure();
    const t = time || ctx.currentTime;
    const { buf, rate } = ksBuffer(midi);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    const vol = opts.vol == null ? 0.55 : opts.vol;
    const len = opts.dur || 1.6;
    g.gain.setValueAtTime(vol, t);
    g.gain.setTargetAtTime(0, t + len * 0.75, len * 0.12);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = opts.tone || 4200;
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(t);
    src.stop(t + len + 0.6);
  }

  function strum(midis, time, opts = {}) {
    ensure();
    const t = time || ctx.currentTime;
    const order = opts.up ? midis.slice().reverse() : midis;
    const gap = opts.gap == null ? 0.022 : opts.gap;
    order.forEach((m, i) => pluck(m, t + i * gap, { vol: (opts.vol || 0.4), dur: opts.dur || 2 }));
  }

  function noise() {
    if (noiseBuf) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 0.3);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  /** 메트로놈 클릭: level 2 = 마디 첫 박, 1 = 박, 0 = 16분 분할(작게) */
  function click(time, level = 1) {
    ensure();
    const t = time || ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = level === 2 ? 1760 : level === 1 ? 1200 : 900;
    const v = level === 2 ? 0.55 : level === 1 ? 0.35 : 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (level === 0 ? 0.025 : 0.05));
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.08);
  }

  /** 뮤트 스트럼 "칙" 소리. kind: 'accent' | 'hit' | 'ghost' */
  function chk(time, kind = 'hit', up = false) {
    ensure();
    const t = time || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = kind === 'ghost' ? 3200 : up ? 2600 : 1900;
    bp.Q.value = kind === 'ghost' ? 1.6 : 0.9;
    const g = ctx.createGain();
    const v = kind === 'accent' ? 1.0 : kind === 'hit' ? 0.55 : 0.18;
    const dec = kind === 'ghost' ? 0.035 : 0.07;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + 0.12);
    if (kind !== 'ghost') {
      // 줄 울림을 약간 더해 실제 뮤트 스트럼 느낌
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = up ? 330 : 165;
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(v * 0.25, t + 0.003);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(og); og.connect(master);
      o.start(t); o.stop(t + 0.08);
    }
  }

  /**
   * 룩어헤드 스케줄러.
   * opts: getBpm(), stepsPerBeat(), getLength(), onStep(step, time), onVisual(step|null), onLoop(n), countIn()
   */
  class Sequencer {
    constructor(opts) {
      Object.assign(this, opts);
      this.running = false;
    }
    start() {
      ensure();
      this.running = true;
      const spb = this.stepsPerBeat();
      this.step = this.countIn && this.countIn() ? -spb * 4 : 0;
      this.loops = 0;
      this.nextTime = ctx.currentTime + 0.08;
      this.queue = [];
      this.timer = setInterval(() => this._schedule(), 25);
      this._schedule();
      this._raf();
    }
    _schedule() {
      if (!this.running) return;
      while (this.nextTime < ctx.currentTime + 0.12) {
        const spb = this.stepsPerBeat();
        const s = this.step;
        if (s < 0) {
          const k = s + spb * 4;
          if (k % spb === 0) click(this.nextTime, k === 0 ? 2 : 1);
        } else {
          this.onStep(s, this.nextTime);
        }
        this.queue.push({ step: s, time: this.nextTime });
        this.nextTime += 60 / this.getBpm() / spb;
        this.step++;
        if (this.step >= this.getLength()) {
          this.step = 0;
          this.loops++;
          if (this.onLoop) this.onLoop(this.loops);
        }
      }
    }
    _raf() {
      if (!this.running) return;
      const t = ctx.currentTime;
      let last = null;
      while (this.queue.length && this.queue[0].time <= t) last = this.queue.shift();
      if (last && this.onVisual) this.onVisual(last.step);
      requestAnimationFrame(() => this._raf());
    }
    stop() {
      this.running = false;
      clearInterval(this.timer);
      this.queue = [];
      if (this.onVisual) this.onVisual(null);
    }
  }

  return { ensure, now, pluck, strum, click, chk, Sequencer };
})();
