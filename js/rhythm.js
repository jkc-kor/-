/* 오른손: 16비트 리듬 다양하게 익히기 + 음표 하나하나 분리 연습 */
window.GL = window.GL || {};

GL.rhythm = (function () {
  const M = GL.music, U = GL.ui, A = GL.audio;
  const { h } = U;

  const COUNTS = ['1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a'];
  const SUB = ['1', 'e', '&', 'a'];
  const NEXT = { '.': 'x', x: 'X', X: 'g', g: '.' };

  const PRESETS = [
    { name: '16비트 기본 – 모두 치기 (박 액센트)', p: 'XxxxXxxxXxxxXxxx', tip: '오른손을 16분음표 다운·업으로 끊임없이 움직이는 기본 모션.' },
    { name: '2·4 백비트 액센트', p: 'xxxxXxxxxxxxXxxx', tip: '스네어 위치(2, 4박)만 강하게. 나머지는 가볍게.' },
    { name: 'CCM 업템포 워십 (1 & a e &)', p: 'X.xx.xx.X.xx.xx.', tip: '워십 업템포 곡의 대표 스트로크. 빈 칸은 헛스트로크로 손은 계속 움직이기.' },
    { name: 'CCM 발라드 16비트', p: 'X..x..x.X.xx.x.x', tip: '발라드에서 자주 쓰는 16비트 당김 패턴.' },
    { name: '갤럽 (1 & a)', p: 'X.xxX.xxX.xxX.xx', tip: '"따 다다" – 박 뒤쪽 두 개를 또렷하게 분리.' },
    { name: '역갤럽 (1 e &)', p: 'Xxx.Xxx.Xxx.Xxx.', tip: '"다다 따" – a 자리에서 손은 업 헛스트로크.' },
    { name: '싱코페이션 (1 . . a)', p: 'X..xX..xX..xX..x', tip: 'a(마지막 16분)를 업으로 정확히 당겨 치기.' },
    { name: '업비트만 (e · a)', p: '.x.x.x.x.x.x.x.x', tip: '다운은 전부 헛스트로크, 업에서만 소리. 업 피킹 분리 훈련.' },
    { name: '오프비트 (& 만)', p: '..x...x...x...x.', tip: '레게/스카 느낌. & 자리 다운만.' },
    { name: '펑크 커팅 (고스트 노트)', p: 'XgggggXgXggxgXgg', tip: '× = 왼손 뮤트 고스트. 액센트만 코드 소리가 나도록 왼손 압력 조절.' },
    { name: '펑크 리듬 2', p: 'X.gx.gX.gxgxXg.x', tip: '고스트와 실음을 섞은 16비트 펑크.' },
    { name: '디스코 16비트', p: 'gxgxXxgxgxgxXxgx', tip: '업에 소리, 다운은 고스트. 2·4박에 액센트.' },
    { name: '16분 당김 (e 시작)', p: '.x..x.x..x..x.x.', tip: '박이 아닌 e에서 시작하는 패턴 – 카운트 놓치지 않기.' }
  ];

  const CELLS = [
    'x...', 'x.x.', 'xxxx', 'xxx.', 'x.xx', 'xx.x', 'xx..', 'x..x',
    '.x..', '..x.', '...x', '.xxx', '.xx.', '.x.x', '..xx'
  ];
  const cellName = (c) => c.split('').map((ch, i) => (ch !== '.' ? SUB[i] : null)).filter(Boolean).join(' ');

  const st = {
    pattern: PRESETS[0].p.split(''),
    sound: 'chk', metro: true, subClick: false, patSound: true, swing: 0,
    drill: null // { kind, list:[patterns], names:[], idx, loopsPer, loopCount }
  };
  let seq = null;
  let tp = null;
  let gridEl = null, drillStatus = null, patNameEl = null;
  const listeners = [];

  function setPattern(p, name) {
    st.pattern = (Array.isArray(p) ? p : p.split('')).slice(0, 16);
    if (patNameEl) patNameEl.textContent = name || '사용자 패턴';
    renderGrid();
    listeners.forEach((fn) => fn());
  }

  function renderGrid(current) {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    for (let b = 0; b < 4; b++) {
      const beat = h('div', { class: 'beat' });
      for (let i = 0; i < 4; i++) {
        const k = b * 4 + i;
        const v = st.pattern[k];
        const down = k % 2 === 0;
        const cell = h('button', {
          type: 'button',
          class: 'step s-' + (v === '.' ? 'rest' : v === 'X' ? 'accent' : v === 'g' ? 'ghost' : 'hit') + (current === k ? ' now' : ''),
          title: '클릭해서 변경: 쉼 → 치기 → 액센트 → 고스트',
          onclick: () => { st.pattern[k] = NEXT[st.pattern[k]]; if (patNameEl) patNameEl.textContent = '사용자 패턴'; renderGrid(); listeners.forEach((fn) => fn()); }
        },
        h('span', { class: 'stroke' + (v === '.' ? ' air' : '') }, down ? '↓' : '↑'),
        h('span', { class: 'mark' }, v === 'X' ? '>' : v === 'x' ? '●' : v === 'g' ? '×' : '·'),
        h('span', { class: 'count' }, COUNTS[k]));
        beat.appendChild(cell);
      }
      gridEl.appendChild(beat);
    }
  }

  function highlight(step) {
    if (!gridEl) return;
    gridEl.querySelectorAll('.step').forEach((el, i) => el.classList.toggle('now', i === step));
  }

  let chordMidis = null;
  function hitSound(kind, up, t) {
    if (st.sound === 'chord' && kind !== 'ghost') {
      if (!chordMidis) chordMidis = GL.tension.realize(GL.tension.VOICINGS.find((v) => v.id === 'maj9_5'), 'C').midis;
      A.strum(chordMidis, t, { up, gap: 0.012, vol: kind === 'accent' ? 0.42 : 0.22, dur: 0.22 });
    } else {
      A.chk(t, kind, up);
    }
  }

  function play() {
    U.claimPlayback(stop);
    tp.setPlaying(true);
    seq = new A.Sequencer({
      getBpm: () => tp.bpm,
      stepsPerBeat: () => 4,
      getLength: () => 16,
      countIn: () => tp.countIn,
      onStep: (s, t) => {
        const dur = 60 / tp.bpm / 4;
        const tt = s % 2 === 1 ? t + dur * st.swing : t;
        if (st.metro && s % 4 === 0) A.click(t, s === 0 ? 2 : 1);
        else if (st.subClick) A.click(tt, 0);
        const v = st.pattern[s];
        if (st.patSound && v !== '.') hitSound(v === 'X' ? 'accent' : v === 'x' ? 'hit' : 'ghost', s % 2 === 1, tt);
      },
      onVisual: (s) => highlight(s),
      onLoop: (n) => {
        tp.onLoop(n);
        advanceDrill();
      }
    });
    seq.start();
  }

  function stop() {
    if (seq) seq.stop();
    seq = null;
    if (tp) tp.setPlaying(false);
    U.releasePlayback(stop);
  }

  /* ---------- 분리 드릴 ---------- */
  function startDrill(kind, list, names, loopsPer) {
    st.drill = { kind, list, names, idx: 0, loopsPer, loopCount: 0 };
    setPattern(list[0], names[0]);
    renderDrillStatus();
  }
  function advanceDrill() {
    const d = st.drill;
    if (!d) return;
    d.loopCount++;
    if (d.loopCount >= d.loopsPer) {
      d.loopCount = 0;
      d.idx = (d.idx + 1) % d.list.length;
      setPattern(d.list[d.idx], d.names[d.idx]);
    }
    renderDrillStatus();
  }
  function stopDrill() { st.drill = null; renderDrillStatus(); }
  function renderDrillStatus() {
    if (!drillStatus) return;
    const d = st.drill;
    drillStatus.innerHTML = '';
    if (!d) { drillStatus.classList.add('hidden'); return; }
    drillStatus.classList.remove('hidden');
    drillStatus.append(
      h('span', {}, `자동 진행: ${d.idx + 1} / ${d.list.length} — `, h('b', {}, d.names[d.idx]), `  (이 패턴 ${d.loopCount + 1}/${d.loopsPer}회째)`),
      h('button', { type: 'button', class: 'btn btn-sm', onclick: stopDrill }, '자동 진행 끄기')
    );
  }

  function generate({ density, ghost, sync }) {
    const p = [];
    for (let k = 0; k < 16; k++) {
      const pos = k % 4;
      let prob = pos === 0 ? 0.85 : pos === 2 ? 0.6 : 0.45;
      prob = prob * (density / 0.6);
      if (sync && pos === 0 && k !== 0) prob *= 0.5;
      if (sync && pos !== 0) prob *= 1.15;
      if (Math.random() < Math.min(0.95, prob)) p.push(pos === 0 && Math.random() < 0.6 ? 'X' : 'x');
      else p.push(ghost && Math.random() < 0.5 ? 'g' : '.');
    }
    p[0] = 'X';
    return p;
  }

  /* ---------- 마운트 ---------- */
  function mountPlayer(root) {
    root.innerHTML = '';
    tp = U.transport({ bpm: 70, onToggle: (p) => (p ? play() : stop()) });
    gridEl = h('div', { class: 'rhythm-grid' });
    patNameEl = h('span', { class: 'pat-name' }, PRESETS[0].name);
    drillStatus = h('div', { class: 'drill-status hidden' });
    const chk = (label, key) => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st[key] || null, onchange: (e) => { st[key] = e.target.checked; } }), ' ' + label);
    root.append(
      h('div', { class: 'card player' },
        h('div', { class: 'card-head' }, h('h3', {}, '16비트 리듬 플레이어'), patNameEl),
        gridEl,
        h('div', { class: 'legend small' },
          h('span', {}, '↓ 다운 / ↑ 업 (16분 얼터네이트 고정)'), h('span', {}, '> 액센트'), h('span', {}, '● 치기'),
          h('span', {}, '× 고스트(뮤트)'), h('span', {}, '· 쉼 = 헛스트로크')),
        drillStatus,
        tp.el,
        h('div', { class: 'opts' },
          chk('메트로놈(4분)', 'metro'), chk('16분 클릭', 'subClick'), chk('패턴 소리 (끄면 직접 연주)', 'patSound'),
          U.field('사운드', U.segmented([{ value: 'chk', label: '뮤트 스트럼' }, { value: 'chord', label: '코드 (Cmaj9)' }], st.sound, (v) => { st.sound = v; })),
          U.field('스윙(셔플 16비트)', U.segmented([{ value: 0, label: '스트레이트' }, { value: 0.17, label: '약하게' }, { value: 0.33, label: '셔플' }], st.swing, (v) => { st.swing = v; })))
      )
    );
    renderGrid();
  }

  function mountLibrary(root) {
    root.innerHTML = '';
    const gen = { density: 0.6, ghost: false, sync: true };
    root.append(
      h('div', { class: 'card' },
        h('h3', {}, '16비트 패턴 라이브러리'),
        h('div', { class: 'preset-grid' }, PRESETS.map((pr) =>
          h('button', { type: 'button', class: 'preset', onclick: () => { stopDrill(); setPattern(pr.p, pr.name); } },
            h('div', { class: 'preset-name' }, pr.name),
            miniPattern(pr.p),
            h('div', { class: 'preset-tip' }, pr.tip))))),
      h('div', { class: 'card' },
        h('h3', {}, '랜덤 16비트 생성기'),
        h('div', { class: 'row-fields' },
          U.field('밀도', U.segmented([{ value: 0.4, label: '적게' }, { value: 0.6, label: '보통' }, { value: 0.85, label: '많이' }], gen.density, (v) => { gen.density = v; })),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e) => { gen.ghost = e.target.checked; } }), ' 고스트 노트 포함'),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: true, onchange: (e) => { gen.sync = e.target.checked; } }), ' 당김음(싱코페이션) 강조'),
          h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { stopDrill(); setPattern(generate(gen), '랜덤 패턴'); } }, '🎲 새 패턴 생성'),
          h('button', { type: 'button', class: 'btn', onclick: () => { stopDrill(); setPattern('................', '빈 패턴'); } }, '비우기')
        ),
        h('p', { class: 'muted small' }, '그리드의 칸을 직접 클릭해 패턴을 만들 수도 있습니다. 만든 패턴은 싱글노트(양손) 섹션의 "16비트 리듬 적용"에서 그대로 쓸 수 있어요.'))
    );
  }

  function miniPattern(p) {
    return h('div', { class: 'mini-pat' }, p.split('').map((c, i) =>
      h('span', { class: 'mp ' + (c === '.' ? 'rest' : c === 'X' ? 'accent' : c === 'g' ? 'ghost' : 'hit') + (i % 4 === 0 ? ' beat' : '') })));
  }

  function mountSeparation(root) {
    root.innerHTML = '';
    const opt = { loops: 2 };
    const loopsSel = U.select([1, 2, 4, 8].map((n) => ({ value: String(n), label: n + '회' })), '2', (v) => { opt.loops = +v; });

    const POS = [
      { label: '1 (다운)', p: 'X...X...X...X...' },
      { label: 'e (업)', p: '.X...X...X...X..' },
      { label: '& (다운)', p: '..X...X...X...X.' },
      { label: 'a (업)', p: '...X...X...X...X' }
    ];
    const ACC = [
      { label: '1', p: 'x...x...x...x...' },
      { label: '1 e', p: 'xx..xx..xx..xx..' },
      { label: '1 e &', p: 'xxx.xxx.xxx.xxx.' },
      { label: '1 e & a', p: 'xxxxxxxxxxxxxxxx' }
    ];
    const ACCENT_MOVE = [
      { label: '액센트 1', p: 'XxxxXxxxXxxxXxxx' },
      { label: '액센트 e', p: 'xXxxxXxxxXxxxXxx' },
      { label: '액센트 &', p: 'xxXxxxXxxxXxxxXx' },
      { label: '액센트 a', p: 'xxxXxxxXxxxXxxxX' }
    ];

    const drillRow = (title, desc, items) => h('div', { class: 'drill' },
      h('div', { class: 'drill-head' }, h('h4', {}, title),
        h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => { startDrill(title, items.map((i) => i.p), items.map((i) => i.label), opt.loops); } }, '▶ 순서대로 자동 진행')),
      h('p', { class: 'muted small' }, desc),
      h('div', { class: 'drill-items' }, items.map((it) =>
        h('button', { type: 'button', class: 'preset small', onclick: () => { stopDrill(); setPattern(it.p, it.label); } },
          h('div', { class: 'preset-name' }, it.label), miniPattern(it.p)))));

    root.append(
      h('div', { class: 'card' },
        h('h3', {}, '음표 하나하나 분리 연습'),
        h('p', { class: 'muted' }, '16분음표 네 자리(1 · e · & · a)를 하나씩 떼어 정확한 타이밍으로 치는 훈련입니다. 오른손은 항상 ↓↑↓↑로 움직이고, 소리 낼 자리에서만 줄을 칩니다.'),
        h('div', { class: 'row-fields' }, U.field('자동 진행 시 패턴당 반복', loopsSel)),
        drillRow('① 위치 분리 – 한 자리만 치기', '1 · e · & · a 중 한 자리만 소리 내기. e와 a는 업 피킹으로만 친다는 것을 몸으로 익힙니다.', POS),
        drillRow('② 누적 – 한 음씩 더하기', '1 → 1 e → 1 e & → 1 e & a. 음이 늘어나도 각 음의 간격이 균등한지 집중.', ACC),
        drillRow('③ 액센트 이동', '16분 연속 중 액센트를 1 → e → & → a로 옮기기. 각 음을 독립적으로 컨트롤하는 핵심 훈련.', ACCENT_MOVE)
      ),
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('h3', {}, '④ 16분음표 15가지 셀'),
          h('div', { class: 'btn-row' },
            h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: () => startDrill('15셀', CELLS.map((c) => c.repeat(4)), CELLS.map((c) => '셀: ' + cellName(c)), opt.loops) }, '▶ 15셀 자동 진행'),
            h('button', { type: 'button', class: 'btn btn-sm', onclick: () => { stopDrill(); const cs = [0, 1, 2, 3].map(() => M.pick(CELLS)); setPattern(cs.join(''), '셀 조합: ' + cs.map(cellName).join(' | ')); } }, '🎲 셀 4개 랜덤 조합'))),
        h('p', { class: 'muted small' }, '한 박을 16분음표 4칸으로 나눴을 때 나올 수 있는 모든 리듬(15가지). 셀을 누르면 4박 모두 그 셀로 채워집니다.'),
        h('div', { class: 'cell-grid' }, CELLS.map((c, i) =>
          h('button', { type: 'button', class: 'cell-card', onclick: () => { stopDrill(); setPattern(c.repeat(4), '셀: ' + cellName(c)); } },
            h('div', { class: 'cell-no' }, '#' + (i + 1)),
            h('div', { class: 'cell-boxes' }, c.split('').map((ch, j) => h('span', { class: 'cb' + (ch !== '.' ? ' on' : '') }, h('i', {}, j % 2 ? '↑' : '↓'), SUB[j]))),
            h('div', { class: 'cell-name' }, cellName(c)))))
      )
    );
  }

  return {
    mountPlayer, mountLibrary, mountSeparation, PRESETS, COUNTS,
    getPattern: () => st.pattern.slice(),
    onChange: (fn) => listeners.push(fn),
    stop
  };
})();
