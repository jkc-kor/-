/* 싱글노트 (양손 통합): 왼손 운지 패턴 + 오른손 피킹/리듬 패턴을 합쳐 TAB 생성 */
window.GL = window.GL || {};

GL.single = (function () {
  const M = GL.music, U = GL.ui, A = GL.audio;
  const { h, s } = U;

  const DEG = { 0: 'R', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7' };
  const COUNT_LABELS = {
    2: ['&'], 3: ['trip', 'let'], 4: ['e', '&', 'a'], 6: ['la', 'li', '&', 'la', 'li']
  };
  const PERMS = ['1234', '1243', '1324', '1342', '1423', '1432', '2134', '2143', '2413', '3142', '4321', '4231'];

  const DEFAULT = {
    // 왼손
    lmode: 'scale', key: 'A', scale: 'penta_minor', shape: 'box', pos: 5, string: 2,
    dir: 'ascdesc', group: 'straight', perm: '1234',
    // 오른손
    subdiv: 4, pick: 'alt', accent: 'beat', rhythm: 'none',
    metro: true
  };
  const st = Object.assign({}, DEFAULT);

  const PRESETS = [
    { hand: 'left', name: '크로매틱 1234 (손가락 독립)', set: { lmode: 'chromatic', perm: '1234', pos: 5, dir: 'ascdesc', subdiv: 4, pick: 'alt', accent: 'beat', rhythm: 'none' } },
    { hand: 'left', name: '크로매틱 1324 퍼뮤테이션', set: { lmode: 'chromatic', perm: '1324', pos: 7, dir: 'ascdesc', subdiv: 4, pick: 'alt', accent: 'beat', rhythm: 'none' } },
    { hand: 'left', name: '메이저 3NPS 4음 그룹', set: { lmode: 'scale', key: 'G', scale: 'major', shape: '3nps', pos: 3, dir: 'ascdesc', group: 'g4', subdiv: 4, pick: 'alt', accent: 'beat', rhythm: 'none' } },
    { hand: 'left', name: '펜타토닉 박스 3도 음정', set: { lmode: 'scale', key: 'A', scale: 'penta_minor', shape: 'box', pos: 5, dir: 'ascdesc', group: 'int3', subdiv: 2, pick: 'alt', accent: 'beat', rhythm: 'none' } },
    { hand: 'left', name: '도리안 박스 3음 그룹', set: { lmode: 'scale', key: 'D', scale: 'dorian', shape: 'box', pos: 10, dir: 'ascdesc', group: 'g3', subdiv: 3, pick: 'alt', accent: 'group', rhythm: 'none' } },
    { hand: 'right', name: '한 줄 얼터네이트 16분', set: { lmode: 'onestring', key: 'A', scale: 'minor', string: 2, pos: 5, dir: 'ascdesc', group: 'straight', subdiv: 4, pick: 'alt', accent: 'beat', rhythm: 'none' } },
    { hand: 'right', name: '3음 그룹 × 16분 (액센트 이동)', set: { lmode: 'scale', key: 'A', scale: 'penta_minor', shape: 'box', pos: 5, dir: 'ascdesc', group: 'g3', subdiv: 4, pick: 'alt', accent: 'group', rhythm: 'none' } },
    { hand: 'right', name: '이코노미 피킹 3NPS', set: { lmode: 'scale', key: 'E', scale: 'minor', shape: '3nps', pos: 0, dir: 'ascdesc', group: 'straight', subdiv: 6, pick: 'economy', accent: 'beat', rhythm: 'none' } },
    { hand: 'right', name: '16비트 리듬 싱글노트 (워십)', set: { lmode: 'scale', key: 'E', scale: 'penta_major', shape: 'box', pos: 9, dir: 'ascdesc', group: 'straight', subdiv: 4, pick: 'altfixed', accent: 'beat', rhythm: 'p2' } },
    { hand: 'right', name: '펑크 싱글노트 (고스트 포함)', set: { lmode: 'scale', key: 'E', scale: 'dorian', shape: 'box', pos: 0, dir: 'ascdesc', group: 'straight', subdiv: 4, pick: 'altfixed', accent: 'beat', rhythm: 'p10' } },
    { hand: 'both', name: '펜타토닉 6연음', set: { lmode: 'scale', key: 'A', scale: 'penta_minor', shape: 'box', pos: 5, dir: 'ascdesc', group: 'g3', subdiv: 6, pick: 'alt', accent: 'beat', rhythm: 'none' } },
    { hand: 'both', name: '레가토 3NPS (줄당 첫 음만 피킹)', set: { lmode: 'scale', key: 'A', scale: 'minor', shape: '3nps', pos: 5, dir: 'ascdesc', group: 'straight', subdiv: 3, pick: 'legato', accent: 'beat', rhythm: 'none' } }
  ];

  /* ---------- 왼손: 음 목록 생성 ---------- */
  function scaleSet() {
    const k = M.pcOf(st.key);
    return new Set(M.SCALES[st.scale].iv.map((i) => (i + k) % 12));
  }

  function baseNotes() {
    const out = [];
    const add = (string, fret) => out.push({ string, fret, midi: M.OPEN[string] + fret });
    const pos = +st.pos;
    if (st.lmode === 'chromatic') return null; // 별도 처리
    const set = scaleSet();
    if (st.lmode === 'onestring') {
      for (let f = pos; f <= Math.min(pos + 12, 22); f++) if (set.has((M.OPEN[st.string] + f) % 12)) add(+st.string, f);
      return out;
    }
    if (st.shape === '3nps') {
      let m = M.OPEN[6] + pos;
      while (!set.has(m % 12)) m++;
      for (let str = 6; str >= 1; str--) {
        for (let n = 0; n < 3; n++) {
          const f = m - M.OPEN[str];
          if (f > 22) return out;
          add(str, f);
          m++;
          while (!set.has(m % 12)) m++;
        }
      }
      return out;
    }
    // 박스 포지션: pos ~ pos+4
    let last = -1;
    for (let str = 6; str >= 1; str--) {
      for (let f = pos; f <= pos + 4; f++) {
        const midi = M.OPEN[str] + f;
        if (set.has(midi % 12) && midi > last) { add(str, f); last = midi; }
      }
    }
    return out;
  }

  function chromaticNotes() {
    const pos = Math.max(1, +st.pos);
    const perm = st.perm.split('').map(Number);
    const notes = [];
    const up = [6, 5, 4, 3, 2, 1];
    const run = (strings, p) => strings.forEach((str) => p.forEach((d) => notes.push({ string: str, fret: pos + d - 1, midi: M.OPEN[str] + pos + d - 1, finger: d })));
    if (st.dir !== 'desc') run(up, perm);
    if (st.dir !== 'asc') run(up.slice().reverse(), perm.slice().reverse());
    return notes;
  }

  function sequenceNotes() {
    if (st.lmode === 'chromatic') return { notes: chromaticNotes(), groupSize: 4, base: chromaticNotes() };
    const L = baseNotes();
    const R = L.slice().reverse();
    const windows = (arr, k) => { const o = []; for (let i = 0; i + k <= arr.length; i++) o.push(...arr.slice(i, i + k)); return o; };
    const pairs = (arr, gap) => { const o = []; for (let i = 0; i + gap < arr.length; i++) o.push(arr[i], arr[i + gap]); return o; };
    let notes, groupSize = 0;
    const both = (fn) => (st.dir === 'asc' ? fn(L) : st.dir === 'desc' ? fn(R) : fn(L).concat(fn(R)));
    switch (st.group) {
      case 'g3': notes = both((a) => windows(a, 3)); groupSize = 3; break;
      case 'g4': notes = both((a) => windows(a, 4)); groupSize = 4; break;
      case 'int3': notes = both((a) => pairs(a, 2)); groupSize = 2; break;
      case 'int4': notes = both((a) => pairs(a, 3)); groupSize = 2; break;
      default:
        notes = st.dir === 'asc' ? L : st.dir === 'desc' ? R : L.concat(R.slice(1, -1));
    }
    return { notes, groupSize, base: L };
  }

  /* ---------- 오른손: 리듬 배치 + 피킹 ---------- */
  function rhythmMask() {
    if (st.rhythm === 'none' || +st.subdiv !== 4) return null;
    if (st.rhythm === 'current') return GL.rhythm.getPattern();
    const p = GL.rhythm.PRESETS[+st.rhythm.slice(1)];
    return p ? p.p.split('') : null;
  }

  function build() {
    const { notes, groupSize, base } = sequenceNotes();
    const sub = +st.subdiv;
    const perBar = sub * 4;
    const mask = rhythmMask();
    const slots = [];
    let ni = 0;
    let guard = 0;
    while (ni < notes.length && guard < 64 * perBar) {
      for (let k = 0; k < perBar; k++) {
        const m = mask ? mask[k] : 'x';
        if (m === '.' || ni >= notes.length) slots.push(null);
        else if (m === 'g') slots.push({ dead: true, string: slots.length && lastString(slots) || notes[ni].string });
        else slots.push(Object.assign({ idx: ni, accentMark: m === 'X' }, notes[ni++]));
        guard++;
      }
    }
    // 피킹 지정
    let prev = null; let lastStroke = 'U';
    slots.forEach((ev, i) => {
      if (!ev) return;
      let stroke;
      switch (st.pick) {
        case 'down': stroke = 'D'; break;
        case 'altfixed': stroke = i % 2 === 0 ? 'D' : 'U'; break;
        case 'economy':
          if (prev && !ev.dead && ev.string < prev.string && lastStroke === 'D') stroke = 'D';
          else if (prev && !ev.dead && ev.string > prev.string && lastStroke === 'U') stroke = 'U';
          else stroke = lastStroke === 'D' ? 'U' : 'D';
          break;
        case 'legato':
          if (prev && !ev.dead && !prev.dead && ev.string === prev.string) {
            ev.slur = ev.fret > prev.fret ? 'h' : 'p';
            stroke = null;
          } else stroke = lastStroke === 'D' ? 'U' : 'D';
          break;
        default: stroke = lastStroke === 'D' ? 'U' : 'D';
      }
      ev.stroke = stroke;
      if (stroke) lastStroke = stroke;
      if (st.accent === 'beat') ev.accent = i % sub === 0 || !!ev.accentMark;
      else if (st.accent === 'group') ev.accent = !ev.dead && groupSize ? ev.idx % groupSize === 0 : i % sub === 0;
      else ev.accent = !!ev.accentMark;
      prev = ev;
    });
    return { slots, perBar, sub, bars: Math.ceil(slots.length / perBar), base, total: notes.length };
  }
  function lastString(slots) {
    for (let i = slots.length - 1; i >= 0; i--) if (slots[i] && slots[i].string) return slots[i].string;
    return null;
  }

  /* ---------- 렌더 ---------- */
  let data = null;
  let seq = null, tp = null;
  let tabEl, fbEl, summaryEl, leftCard, rightCard;
  let slotRects = [];

  function regenerate() {
    data = build();
    renderSummary();
    renderFretboard();
    renderTab();
  }

  function summaryText() {
    const left = st.lmode === 'chromatic'
      ? `크로매틱 ${st.perm} · ${Math.max(1, +st.pos)}프렛`
      : `${st.key} ${M.SCALES[st.scale].name} · ${st.lmode === 'onestring' ? st.string + '번 줄 한 줄' : st.shape === '3nps' ? '3NPS' : '박스'} · ${st.pos}프렛~`;
    const pickNames = { alt: '얼터네이트', altfixed: '얼터네이트(16비트 모션 고정)', down: '다운 피킹', economy: '이코노미', legato: '레가토' };
    const subNames = { 2: '8분음표', 3: '셋잇단', 4: '16분음표', 6: '6연음' };
    return { left, right: `${subNames[st.subdiv]} · ${pickNames[st.pick]}${rhythmMask() ? ' · 16비트 리듬 적용' : ''}` };
  }

  function renderSummary() {
    const t = summaryText();
    summaryEl.innerHTML = '';
    summaryEl.append(
      h('span', { class: 'sum-l' }, '왼손: ', h('b', {}, t.left)),
      h('span', { class: 'sum-r' }, '오른손: ', h('b', {}, t.right)),
      h('span', { class: 'muted' }, `${data.total}음 · ${data.bars}마디`)
    );
  }

  function renderFretboard() {
    const k = M.pcOf(st.key);
    const seen = new Set();
    const markers = [];
    data.base.forEach((n) => {
      const key = n.string + ':' + n.fret;
      if (seen.has(key)) return;
      seen.add(key);
      if (st.lmode === 'chromatic') markers.push({ string: n.string, fret: n.fret, label: String(n.finger), cls: 'r-fifth' });
      else {
        const d = (n.midi - k + 120) % 12;
        markers.push({ string: n.string, fret: n.fret, label: DEG[d], cls: d === 0 ? 'r-root' : 'r-scale' });
      }
    });
    U.fretboard(fbEl, { frets: Math.max(15, Math.max(...markers.map((m) => m.fret)) + 1), markers, onClick: (s2, f) => A.pluck(M.OPEN[s2] + f) });
  }

  function renderTab() {
    tabEl.innerHTML = '';
    slotRects = [];
    const { slots, perBar, sub, bars } = data;
    const cw = Math.max(20, Math.min(44, 440 / perBar));
    const L = 28, T = 46, G = 14;
    const W = L + perBar * cw + 10, H = T + 5 * G + 34;
    for (let b = 0; b < bars; b++) {
      const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tab-bar' });
      svg.appendChild(s('text', { x: 4, y: 14, class: 'tab-barno' }, b + 1));
      if (b === 0) ['T', 'A', 'B'].forEach((ch, i) => svg.appendChild(s('text', { x: 10, y: T + 18 + i * 16, class: 'tab-clef' }, ch)));
      for (let k = 0; k < perBar; k++) {
        const r = s('rect', { x: L + k * cw, y: 4, width: cw, height: H - 8, class: 'tab-slot' + (k % sub === 0 ? ' beat' : ''), rx: 3 });
        svg.appendChild(r);
        slotRects.push(r);
      }
      for (let i = 0; i < 6; i++) svg.appendChild(s('line', { x1: L - 4, x2: W - 6, y1: T + i * G, y2: T + i * G, class: 'tab-line' }));
      svg.appendChild(s('line', { x1: L - 4, x2: L - 4, y1: T, y2: T + 5 * G, class: 'tab-barline' }));
      svg.appendChild(s('line', { x1: W - 6, x2: W - 6, y1: T, y2: T + 5 * G, class: 'tab-barline' }));
      for (let k = 0; k < perBar; k++) {
        const ev = slots[b * perBar + k];
        const x = L + k * cw + cw / 2;
        // 카운트
        const beat = Math.floor(k / sub) + 1;
        const lbl = k % sub === 0 ? String(beat) : COUNT_LABELS[sub][(k % sub) - 1];
        svg.appendChild(s('text', { x, y: H - 8, class: 'tab-count' + (k % sub === 0 ? ' beat' : '') }, lbl));
        if (!ev) continue;
        const y = T + (ev.string - 1) * G;
        const txt = ev.dead ? 'x' : String(ev.fret);
        svg.appendChild(s('rect', { x: x - (txt.length * 4 + 3), y: y - 6.5, width: txt.length * 8 + 6, height: 13, class: 'tab-mask' }));
        svg.appendChild(s('text', { x, y: y + 4.5, class: 'tab-num' + (ev.accent ? ' acc' : '') + (ev.dead ? ' dead' : '') }, txt));
        if (ev.stroke) svg.appendChild(s('text', { x, y: 17, class: 'tab-stroke ' + ev.stroke }, ev.stroke === 'D' ? '⊓' : 'V'));
        if (ev.slur) svg.appendChild(s('text', { x, y: 17, class: 'tab-slur' }, ev.slur));
        if (ev.accent) svg.appendChild(s('text', { x, y: 33, class: 'tab-accent' }, '>'));
      }
      tabEl.appendChild(svg);
    }
  }

  function highlight(i) {
    slotRects.forEach((r, k) => r.classList.toggle('now', k === i));
    if (i != null && slotRects[i] && slotRects[i].ownerSVGElement) {
      const svg = slotRects[i].ownerSVGElement;
      const box = tabEl.getBoundingClientRect();
      const sb = svg.getBoundingClientRect();
      if (sb.bottom > box.bottom || sb.top < box.top) tabEl.scrollTop += sb.top - box.top - 8;
    }
  }

  function play() {
    U.claimPlayback(stop);
    tp.setPlaying(true);
    seq = new A.Sequencer({
      getBpm: () => tp.bpm,
      stepsPerBeat: () => data.sub,
      getLength: () => data.slots.length,
      countIn: () => tp.countIn,
      onStep: (i, t) => {
        if (st.metro && i % data.sub === 0) A.click(t, i % data.perBar === 0 ? 2 : 1);
        const ev = data.slots[i];
        if (!ev) return;
        if (ev.dead) { A.chk(t, 'ghost'); return; }
        const dur = Math.min(0.9, 60 / tp.bpm / data.sub * 2.2);
        A.pluck(ev.midi, t, { vol: ev.accent ? 0.75 : ev.slur ? 0.38 : 0.5, dur });
      },
      onVisual: (i) => highlight(i),
      onLoop: (n) => tp.onLoop(n)
    });
    seq.start();
  }
  function stop() {
    if (seq) seq.stop();
    seq = null;
    if (tp) tp.setPlaying(false);
    U.releasePlayback(stop);
  }

  /* ---------- 컨트롤 패널 ---------- */
  function renderLeft() {
    leftCard.innerHTML = '';
    const set = (k) => (v) => { st[k] = v; renderLeft(); regenerate(); };
    const posOpts = [...Array(18).keys()].map((n) => ({ value: String(n), label: n === 0 ? '개방(0)' : n + '프렛' }));
    leftCard.append(
      h('div', { class: 'card-head' }, h('h3', {}, '🖐 왼손 패턴 (운지)'), h('span', { class: 'tag left' }, '왼손')),
      U.field('모드', U.segmented([
        { value: 'scale', label: '스케일 포지션' },
        { value: 'chromatic', label: '크로매틱 (손가락 독립)' },
        { value: 'onestring', label: '한 줄 (가로 이동)' }
      ], st.lmode, set('lmode')))
    );
    if (st.lmode === 'chromatic') {
      leftCard.append(
        U.field('손가락 순서 (퍼뮤테이션)', U.segmented(PERMS.map((p) => ({ value: p, label: p })), st.perm, set('perm'), 'wrap'),
          '숫자 = 왼손 손가락 (1 검지 · 2 중지 · 3 약지 · 4 새끼). 한 프렛에 한 손가락.'),
        h('div', { class: 'row-fields' },
          U.field('시작 프렛', U.select(posOpts.slice(1), String(Math.max(1, st.pos)), (v) => { st.pos = +v; regenerate(); })),
          U.field('방향', U.segmented([{ value: 'asc', label: '상행' }, { value: 'desc', label: '하행' }, { value: 'ascdesc', label: '상행→하행' }], st.dir, set('dir'))),
          h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { st.perm = M.pick(PERMS); renderLeft(); regenerate(); } }, '🎲 랜덤 순서'))
      );
      return;
    }
    leftCard.append(
      h('div', { class: 'row-fields' },
        U.field('키', U.select(M.ROOTS, st.key, (v) => { st.key = v; regenerate(); })),
        U.field('스케일', U.select(Object.entries(M.SCALES).map(([k, v]) => ({ value: k, label: v.name })), st.scale, (v) => { st.scale = v; regenerate(); }))),
      h('div', { class: 'row-fields' },
        st.lmode === 'scale'
          ? U.field('운지 형태', U.segmented([{ value: 'box', label: '박스 (5프렛 범위)' }, { value: '3nps', label: '3NPS (줄당 3음)' }], st.shape, set('shape')))
          : U.field('줄', U.select([1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: n + '번 줄' })), String(st.string), (v) => { st.string = +v; regenerate(); })),
        U.field('시작 프렛', U.select(posOpts, String(st.pos), (v) => { st.pos = +v; regenerate(); }))),
      U.field('시퀀스', U.segmented([
        { value: 'straight', label: '스트레이트' }, { value: 'g3', label: '3음 그룹' }, { value: 'g4', label: '4음 그룹' },
        { value: 'int3', label: '3도 음정' }, { value: 'int4', label: '4도 음정' }
      ], st.group, set('group'), 'wrap')),
      U.field('방향', U.segmented([{ value: 'asc', label: '상행' }, { value: 'desc', label: '하행' }, { value: 'ascdesc', label: '상행→하행' }], st.dir, set('dir')))
    );
  }

  function renderRight() {
    rightCard.innerHTML = '';
    const set = (k) => (v) => { st[k] = v; renderRight(); regenerate(); };
    const rhythmOpts = [{ value: 'none', label: '사용 안 함 (모든 칸 연주)' }, { value: 'current', label: '오른손 섹션에서 만든 현재 패턴' }]
      .concat(GL.rhythm.PRESETS.map((p, i) => ({ value: 'p' + i, label: p.name })));
    rightCard.append(
      h('div', { class: 'card-head' }, h('h3', {}, '✋ 오른손 패턴 (피킹·리듬)'), h('span', { class: 'tag right' }, '오른손')),
      U.field('리듬 단위', U.segmented([
        { value: 2, label: '8분음표' }, { value: 3, label: '셋잇단' }, { value: 4, label: '16분음표' }, { value: 6, label: '6연음' }
      ], +st.subdiv, set('subdiv'))),
      U.field('피킹', U.segmented([
        { value: 'alt', label: '얼터네이트' },
        { value: 'altfixed', label: '16비트 모션 고정', title: '박 기준으로 다운/업 위치 고정 (쉼표 자리는 헛스트로크)' },
        { value: 'down', label: '다운만' },
        { value: 'economy', label: '이코노미' },
        { value: 'legato', label: '레가토 (h/p)' }
      ], st.pick, set('pick'), 'wrap')),
      U.field('액센트', U.segmented([
        { value: 'beat', label: '박 첫 음' }, { value: 'group', label: '그룹 첫 음 (액센트 이동)' }, { value: 'none', label: '없음' }
      ], st.accent, set('accent'))),
      U.field('16비트 리듬 적용', U.select(rhythmOpts, st.rhythm, (v) => { st.rhythm = v; if (v !== 'none' && st.pick === 'alt') st.pick = 'altfixed'; renderRight(); regenerate(); }),
        +st.subdiv === 4 ? '리듬 패턴의 "치는 자리"에만 음을 배치합니다. × 고스트 자리는 뮤트 피킹(x).' : '※ 16분음표 단위에서만 적용됩니다.')
    );
  }

  function applyPreset(p) {
    Object.assign(st, DEFAULT, p.set);
    renderLeft(); renderRight(); regenerate();
    focus(p.hand);
  }

  function focus(hand) {
    if (!leftCard) return;
    leftCard.classList.toggle('focus', hand === 'left');
    rightCard.classList.toggle('focus', hand === 'right');
  }

  function mount(root) {
    root.innerHTML = '';
    leftCard = h('div', { class: 'card hand-card left' });
    rightCard = h('div', { class: 'card hand-card right' });
    summaryEl = h('div', { class: 'summary' });
    fbEl = h('div', { class: 'fb-scroll' });
    tabEl = h('div', { class: 'tab-wrap' });
    tp = U.transport({ bpm: 80, onToggle: (p) => (p ? play() : stop()) });

    const presetBox = h('div', { class: 'card' },
      h('h3', {}, '빠른 시작 프리셋'),
      ['left', 'right', 'both'].map((hand) => h('div', { class: 'preset-row' },
        h('span', { class: 'tag ' + hand }, hand === 'left' ? '왼손 집중' : hand === 'right' ? '오른손 집중' : '양손'),
        h('div', { class: 'btn-row' }, PRESETS.filter((p) => p.hand === hand).map((p) =>
          h('button', { type: 'button', class: 'btn btn-sm', onclick: () => applyPreset(p) }, p.name))))));

    root.append(
      presetBox,
      h('div', { class: 'grid-2' }, leftCard, rightCard),
      h('div', { class: 'card output' },
        h('div', { class: 'card-head' }, h('h3', {}, '🎼 생성된 싱글노트 연습'),
          h('div', { class: 'btn-row' },
            h('button', { type: 'button', class: 'btn btn-sm', onclick: regenerate }, '↻ 다시 생성'),
            h('button', { type: 'button', class: 'btn btn-sm', onclick: () => window.print() }, '🖨 인쇄'))),
        summaryEl,
        tp.el,
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: true, onchange: (e) => { st.metro = e.target.checked; } }), ' 메트로놈'),
        h('h4', {}, '지판 (사용 음)'),
        fbEl,
        h('h4', {}, 'TAB  ', h('small', { class: 'muted' }, '⊓ 다운 · V 업 · > 액센트 · h/p 해머온/풀오프 · x 뮤트')),
        tabEl)
    );
    renderLeft();
    renderRight();
    regenerate();
    GL.rhythm.onChange(() => { if (st.rhythm === 'current') regenerate(); });
  }

  return { mount, focus, applyPreset, PRESETS, stop, _build: build, _state: st };
})();
