/* 공통 UI: DOM 헬퍼, 지판(SVG), 코드 다이어그램, 트랜스포트(재생/BPM/템포 트레이너) */
window.GL = window.GL || {};

GL.ui = (function () {
  const SVGNS = 'http://www.w3.org/2000/svg';

  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    children.flat().forEach((c) => {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function s(tag, attrs = {}, text) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
    if (text != null) el.textContent = text;
    return el;
  }

  /** 버튼 그룹 (단일 선택) */
  function segmented(options, value, onChange, cls = '') {
    const wrap = h('div', { class: 'seg ' + cls, role: 'group' });
    options.forEach((o) => {
      const opt = typeof o === 'object' ? o : { value: o, label: o };
      const b = h('button', {
        type: 'button',
        class: 'seg-btn' + (opt.value === value ? ' active' : ''),
        title: opt.title || null,
        disabled: opt.disabled || null,
        onclick: () => {
          wrap.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          onChange(opt.value);
        }
      }, opt.label);
      wrap.appendChild(b);
    });
    return wrap;
  }

  function select(options, value, onChange, attrs = {}) {
    const el = h('select', Object.assign({ onchange: (e) => onChange(e.target.value) }, attrs));
    options.forEach((o) => {
      const opt = typeof o === 'object' ? o : { value: o, label: o };
      const oe = h('option', { value: opt.value }, opt.label);
      if (opt.value === value) oe.selected = true;
      el.appendChild(oe);
    });
    return el;
  }

  function field(label, control, hint) {
    return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control,
      hint ? h('small', { class: 'hint' }, hint) : null);
  }

  /* ---------- 가로 지판 ---------- */
  const FB = { W: 1000, H: 215, top: 26, gap: 30, left: 58, right: 16 };

  function fretX(f, frets) {
    const sp = (FB.W - FB.left - FB.right) / frets;
    return f === 0 ? FB.left - 26 : FB.left + (f - 0.5) * sp;
  }
  function stringY(str) { return FB.top + (str - 1) * FB.gap; }

  /**
   * markers: [{string, fret, label, cls, title}]
   * onClick(string, fret)
   */
  function fretboard(el, { frets = 15, markers = [], onClick } = {}) {
    el.innerHTML = '';
    const svg = s('svg', { viewBox: `0 0 ${FB.W} ${FB.H}`, class: 'fretboard', role: 'img' });
    const sp = (FB.W - FB.left - FB.right) / frets;
    const yTop = stringY(1), yBot = stringY(6);
    svg.appendChild(s('rect', { x: FB.left, y: yTop - 10, width: FB.W - FB.left - FB.right, height: yBot - yTop + 20, class: 'fb-wood', rx: 4 }));
    [3, 5, 7, 9, 15].forEach((f) => {
      if (f <= frets) svg.appendChild(s('circle', { cx: FB.left + (f - 0.5) * sp, cy: (yTop + yBot) / 2, r: 6, class: 'fb-inlay' }));
    });
    if (frets >= 12) {
      const x = FB.left + 11.5 * sp;
      svg.appendChild(s('circle', { cx: x, cy: stringY(2) + 15, r: 6, class: 'fb-inlay' }));
      svg.appendChild(s('circle', { cx: x, cy: stringY(4) + 15, r: 6, class: 'fb-inlay' }));
    }
    for (let f = 0; f <= frets; f++) {
      const x = FB.left + f * sp;
      svg.appendChild(s('line', { x1: x, x2: x, y1: yTop - 10, y2: yBot + 10, class: f === 0 ? 'fb-nut' : 'fb-fret' }));
      if (f > 0) svg.appendChild(s('text', { x: FB.left + (f - 0.5) * sp, y: FB.H - 6, class: 'fb-num' }, f));
    }
    for (let st = 1; st <= 6; st++) {
      svg.appendChild(s('line', { x1: FB.left - 40, x2: FB.W - FB.right, y1: stringY(st), y2: stringY(st), class: 'fb-string', 'stroke-width': 0.8 + st * 0.35 }));
      svg.appendChild(s('text', { x: 8, y: stringY(st) + 4, class: 'fb-sname' }, ['e', 'B', 'G', 'D', 'A', 'E'][st - 1]));
    }
    if (onClick) {
      for (let st = 1; st <= 6; st++) {
        for (let f = 0; f <= frets; f++) {
          const x = f === 0 ? FB.left - 44 : FB.left + (f - 1) * sp;
          const w = f === 0 ? 40 : sp;
          const r = s('rect', { x, y: stringY(st) - FB.gap / 2, width: w, height: FB.gap, class: 'fb-hit' });
          r.addEventListener('click', () => onClick(st, f));
          svg.appendChild(r);
        }
      }
    }
    markers.forEach((m) => {
      const g = s('g', { class: 'fb-marker ' + (m.cls || '') });
      const cx = fretX(m.fret, frets), cy = stringY(m.string);
      g.appendChild(s('circle', { cx, cy, r: 12.5 }));
      g.appendChild(s('text', { x: cx, y: cy + 4 }, m.label || ''));
      if (m.title) g.appendChild(s('title', {}, m.title));
      if (onClick) g.addEventListener('click', () => onClick(m.string, m.fret));
      svg.appendChild(g);
    });
    el.appendChild(svg);
    return svg;
  }

  /* ---------- 세로 코드 다이어그램 ----------
     frets: [6번줄, 5, 4, 3, 2, 1번줄] (null = 뮤트)  labels: 같은 순서 */
  function chordDiagram(frets, labels = [], roles = []) {
    const W = 150, H = 178, L = 28, T = 34, gx = 20, gy = 26, rows = 5;
    const played = frets.filter((f) => f != null);
    const maxF = Math.max(...played);
    const minPos = Math.min(...played.filter((f) => f > 0).concat([99]));
    const base = maxF <= 5 ? 1 : minPos;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chord-diagram' });
    for (let i = 0; i < 6; i++) svg.appendChild(s('line', { x1: L + i * gx, x2: L + i * gx, y1: T, y2: T + rows * gy, class: 'cd-string' }));
    for (let r = 0; r <= rows; r++) svg.appendChild(s('line', { x1: L, x2: L + 5 * gx, y1: T + r * gy, y2: T + r * gy, class: r === 0 && base === 1 ? 'cd-nut' : 'cd-fret' }));
    if (base > 1) svg.appendChild(s('text', { x: L - 8, y: T + gy * 0.5 + 4, class: 'cd-base' }, base + 'fr'));
    frets.forEach((f, i) => {
      const x = L + i * gx;
      if (f == null) svg.appendChild(s('text', { x, y: T - 10, class: 'cd-x' }, '×'));
      else if (f === 0) svg.appendChild(s('circle', { cx: x, cy: T - 13, r: 5, class: 'cd-open' }));
      else {
        const y = T + (f - base + 0.5) * gy;
        const g = s('g', { class: 'cd-dot ' + (roles[i] || '') });
        g.appendChild(s('circle', { cx: x, cy: y, r: 9.5 }));
        g.appendChild(s('text', { x, y: y + 3.5 }, labels[i] || ''));
        svg.appendChild(g);
      }
      if (labels[i] && f != null) svg.appendChild(s('text', { x, y: H - 4, class: 'cd-label ' + (roles[i] || '') }, labels[i]));
    });
    return svg;
  }

  /* ---------- 트랜스포트 ---------- */
  function transport({ bpm = 80, min = 40, max = 220, onToggle, trainer = true }) {
    const st = { bpm, playing: false, countIn: true, trainer: false, inc: 4, every: 4, max: 160 };
    const playBtn = h('button', { type: 'button', class: 'btn btn-play', onclick: () => onToggle(!st.playing) }, '▶ 재생');
    const num = h('input', { type: 'number', min, max, value: bpm, class: 'bpm-num', 'aria-label': 'BPM' });
    const range = h('input', { type: 'range', min, max, value: bpm, class: 'bpm-range', 'aria-label': 'BPM 슬라이더' });
    function setBpm(v) {
      st.bpm = Math.max(min, Math.min(max, Math.round(v) || bpm));
      num.value = st.bpm; range.value = st.bpm;
    }
    num.addEventListener('change', () => setBpm(+num.value));
    range.addEventListener('input', () => setBpm(+range.value));
    const minus = h('button', { type: 'button', class: 'btn btn-sm', onclick: () => setBpm(st.bpm - 5) }, '−5');
    const plus = h('button', { type: 'button', class: 'btn btn-sm', onclick: () => setBpm(st.bpm + 5) }, '+5');
    const ci = h('input', { type: 'checkbox', checked: true, onchange: (e) => { st.countIn = e.target.checked; } });

    const trWrap = h('div', { class: 'trainer' });
    if (trainer) {
      const tr = h('input', { type: 'checkbox', onchange: (e) => { st.trainer = e.target.checked; } });
      const inc = h('input', { type: 'number', min: 1, max: 20, value: st.inc, onchange: (e) => { st.inc = +e.target.value; } });
      const every = h('input', { type: 'number', min: 1, max: 32, value: st.every, onchange: (e) => { st.every = +e.target.value; } });
      const mx = h('input', { type: 'number', min: 40, max: 260, value: st.max, onchange: (e) => { st.max = +e.target.value; } });
      trWrap.append(
        h('label', { class: 'check' }, tr, ' 템포 트레이너'),
        h('span', { class: 'tr-detail' }, inc, ' BPM씩 / ', every, ' 회 반복마다 / 최대 ', mx)
      );
    }

    const el = h('div', { class: 'transport' },
      playBtn,
      h('div', { class: 'bpm' }, h('span', { class: 'bpm-label' }, 'BPM'), minus, num, plus, range),
      h('label', { class: 'check' }, ci, ' 카운트인 (1마디)'),
      trWrap
    );

    return {
      el,
      get bpm() { return st.bpm; },
      setBpm,
      get countIn() { return st.countIn; },
      setPlaying(p) {
        st.playing = p;
        playBtn.textContent = p ? '■ 정지' : '▶ 재생';
        playBtn.classList.toggle('playing', p);
      },
      get playing() { return st.playing; },
      /** 반복 횟수(loops)마다 호출 – 템포 트레이너 적용 */
      onLoop(loops) {
        if (st.trainer && loops % st.every === 0 && st.bpm < st.max) setBpm(Math.min(st.max, st.bpm + st.inc));
      }
    };
  }

  /** 다른 섹션이 재생을 시작하면 현재 재생 중인 것을 멈추기 위한 전역 관리 */
  let activeStop = null;
  function claimPlayback(stopFn) {
    if (activeStop && activeStop !== stopFn) activeStop();
    activeStop = stopFn;
  }
  function releasePlayback(stopFn) { if (activeStop === stopFn) activeStop = null; }
  function stopAll() { if (activeStop) activeStop(); }

  return { h, s, segmented, select, field, fretboard, chordDiagram, transport, claimPlayback, releasePlayback, stopAll };
})();
