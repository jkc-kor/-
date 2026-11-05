/* 왼손: 9 · 11 · 13 텐션 익히기 (지판 / 보이싱 & 진행 / 퀴즈) */
window.GL = window.GL || {};

GL.tension = (function () {
  const M = GL.music, U = GL.ui, A = GL.audio;
  const { h } = U;

  /* 보이싱: off = [6번줄 ... 1번줄] 근음 프렛 기준 상대값, rs = 근음 줄 */
  const VOICINGS = [
    // maj7
    { id: 'maj7', type: 'maj7', tens: [], rs: 5, off: [null, 0, 2, 1, 2, null] },
    { id: 'maj9_5', type: 'maj7', tens: ['9'], rs: 5, off: [null, 0, -1, 1, 0, null] },
    { id: 'maj9_6', type: 'maj7', tens: ['9'], rs: 6, off: [0, null, 1, 1, 0, 2] },
    { id: 'maj13_6', type: 'maj7', tens: ['13'], rs: 6, off: [0, null, 1, 1, 2, null] },
    { id: 'maj9_13_5', type: 'maj7', tens: ['9', '13'], rs: 5, off: [null, 0, -1, 1, 0, 2] },
    { id: 'maj7s11_6', type: 'maj7', tens: ['#11'], rs: 6, off: [0, null, 1, 1, -1, null] },
    { id: 'maj9s11_5', type: 'maj7', tens: ['9', '#11'], rs: 5, off: [null, 0, -1, 1, 0, -1] },
    // m7
    { id: 'm7', type: 'm7', tens: [], rs: 5, off: [null, 0, 2, 0, 1, null] },
    { id: 'm9_5', type: 'm7', tens: ['9'], rs: 5, off: [null, 0, -2, 0, 0, null] },
    { id: 'm9_6', type: 'm7', tens: ['9'], rs: 6, off: [0, null, 0, 0, 0, 2] },
    { id: 'm11_6', type: 'm7', tens: ['11'], rs: 6, off: [0, null, 0, 0, -2, null] },
    { id: 'm9_11_5', type: 'm7', tens: ['9', '11'], rs: 5, off: [null, 0, -2, 0, 0, -2] },
    { id: 'm13_6', type: 'm7', tens: ['13'], rs: 6, off: [0, null, 0, 0, 2, null] },
    { id: 'm9_13_5', type: 'm7', tens: ['9', '13'], rs: 5, off: [null, 0, -2, 0, 0, 2] },
    // dom7
    { id: '7', type: 'dom7', tens: [], rs: 5, off: [null, 0, 2, 0, 2, null] },
    { id: '9_5', type: 'dom7', tens: ['9'], rs: 5, off: [null, 0, -1, 0, 0, 0] },
    { id: '13_6', type: 'dom7', tens: ['13'], rs: 6, off: [0, null, 0, 1, 2, null] },
    { id: '9_13_5', type: 'dom7', tens: ['9', '13'], rs: 5, off: [null, 0, -1, 0, 0, 2] },
    { id: '7b9_5', type: 'dom7', tens: ['b9'], rs: 5, off: [null, 0, -1, 0, -1, null] },
    { id: '7s9_5', type: 'dom7', tens: ['#9'], rs: 5, off: [null, 0, -1, 0, 1, null] },
    { id: '7s11_6', type: 'dom7', tens: ['#11'], rs: 6, off: [0, null, 0, 1, -1, null] },
    { id: '9s11_5', type: 'dom7', tens: ['9', '#11'], rs: 5, off: [null, 0, -1, 0, 0, -1] },
    { id: '7b13_6', type: 'dom7', tens: ['b13'], rs: 6, off: [0, null, 0, 1, 1, null] },
    { id: '7b9b13_6', type: 'dom7', tens: ['b9', 'b13'], rs: 6, off: [0, null, 0, 1, 1, 1] },
    { id: '7s9b13_6', type: 'dom7', tens: ['#9', 'b13'], rs: 6, off: [0, null, 0, 1, 1, 3] },
    { id: '9sus4_5', type: 'dom7', tens: ['9', '11'], rs: 5, off: [null, 0, 0, 0, 0, 0], note: '3음 생략 → 9sus4 (CCM에서 매우 자주 쓰임)' },
    // m7b5
    { id: 'm7b5', type: 'm7b5', tens: [], rs: 5, off: [null, 0, 1, 0, 1, null] },
    { id: 'm7b5_11_5', type: 'm7b5', tens: ['11'], rs: 5, off: [null, 0, 1, 0, 1, -2] },
    { id: 'm7b5_9_6', type: 'm7b5', tens: ['9'], rs: 6, off: [0, null, 0, 0, -1, 2] },
    { id: 'm7b5_b13_5', type: 'm7b5', tens: ['b13'], rs: 5, off: [null, 0, 1, 0, 1, 1] }
  ];
  const VBYID = Object.fromEntries(VOICINGS.map((v) => [v.id, v]));
  const STR_ORDER = [6, 5, 4, 3, 2, 1];

  /** 보이싱을 실제 프렛으로. near: 이 프렛 근처를 선호(진행용) */
  function realize(v, rootName, near) {
    const rootPc = M.pcOf(rootName);
    const base = (rootPc - (M.OPEN[v.rs] % 12) + 120) % 12;
    const minOff = Math.min(...v.off.filter((o) => o != null));
    const candidates = [base, base + 12].filter((b) => b + minOff >= 0 && b + Math.max(...v.off.filter((o) => o != null)) <= 17);
    const offs = v.off.filter((o) => o != null);
    const avgOff = offs.reduce((a, b) => a + b, 0) / offs.length;
    let r = candidates[0];
    if (near != null && candidates.length > 1) {
      r = candidates.reduce((a, b) => (Math.abs(b + avgOff - near) < Math.abs(a + avgOff - near) ? b : a));
    }
    const frets = v.off.map((o) => (o == null ? null : r + o));
    const lm = M.labelMap(v.type);
    const labels = frets.map((f, i) => {
      if (f == null) return '';
      const pc = (M.OPEN[STR_ORDER[i]] + f - rootPc + 120) % 12;
      return lm[pc] || '?';
    });
    const midis = frets.map((f, i) => (f == null ? null : M.OPEN[STR_ORDER[i]] + f)).filter((m) => m != null);
    return { frets, labels, midis, rootFret: r, center: r + avgOff };
  }

  function roleOf(iv, type) {
    if (iv === 'R') return 'r-root';
    const c = M.CHORDS[type];
    if (c.tones.includes(iv)) {
      if (iv.includes('3')) return 'r-third';
      if (iv.includes('7')) return 'r-seventh';
      return 'r-fifth';
    }
    return 'r-tension';
  }

  function chordName(root, type, tens) {
    const t = M.TENSION_ORDER.filter((x) => tens.includes(x));
    return root + M.CHORDS[type].sym + (t.length ? '(' + t.join(', ') + ')' : '');
  }

  /* ================= 텐션 지판 ================= */
  const st = { root: 'C', type: 'maj7', tens: ['9'], show: 'all', label: 'iv' };

  function mountExplorer(root) {
    root.innerHTML = '';
    const controls = h('div', { class: 'card controls' });
    const info = h('div', { class: 'card info-card' });
    const fbWrap = h('div', { class: 'card' });
    const fbEl = h('div', { class: 'fb-scroll' });
    const voicingWrap = h('div', { class: 'card' });

    function render() {
      controls.innerHTML = '';
      const c = M.CHORDS[st.type];
      st.tens = st.tens.filter((t) => c.tensions.includes(t));

      controls.append(
        U.field('근음 (Root)', U.segmented(M.ROOTS, st.root, (v) => { st.root = v; render(); }, 'wrap')),
        U.field('코드 타입', U.segmented(Object.entries(M.CHORDS).map(([k, v]) => ({ value: k, label: v.sym, title: v.name })), st.type, (v) => { st.type = v; render(); })),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, '텐션 선택 (여러 개 가능)'),
          h('div', { class: 'tension-groups' }, M.TENSION_GROUPS.map((g) =>
            h('div', { class: 'tgroup' }, h('div', { class: 'tgroup-title' }, g.title),
              h('div', { class: 'tgroup-btns' }, g.items.map((t) => {
                const avail = c.tensions.includes(t);
                const on = st.tens.includes(t);
                const avoid = c.avoid[t];
                return h('button', {
                  type: 'button',
                  class: 'tbtn' + (on ? ' active' : '') + (avoid ? ' avoid' : ''),
                  disabled: !avail,
                  title: avail ? (avoid || M.TENSION_INFO[t]) : '이 코드에서는 사용하지 않는 텐션',
                  onclick: () => {
                    st.tens = on ? st.tens.filter((x) => x !== t) : st.tens.concat(t);
                    render();
                  }
                }, t);
              }))))
          )),
        h('div', { class: 'row-fields' },
          U.field('지판 표시', U.segmented([
            { value: 'all', label: '코드톤 + 텐션' },
            { value: 'tension', label: '텐션만 (+근음)' },
            { value: 'shell', label: '3·7음 + 텐션' }
          ], st.show, (v) => { st.show = v; renderBoard(); })),
          U.field('라벨', U.segmented([{ value: 'iv', label: '음정' }, { value: 'name', label: '음이름' }], st.label, (v) => { st.label = v; renderBoard(); }))
        )
      );
      renderInfo();
      renderBoard();
      renderVoicings();
    }

    function renderInfo() {
      const c = M.CHORDS[st.type];
      info.innerHTML = '';
      const name = chordName(st.root, st.type, st.tens);
      const tones = c.tones.map((iv) => h('span', { class: 'chip ' + roleOf(iv, st.type) }, h('b', {}, iv), ' ', M.spell(st.root, iv)));
      const tens = M.TENSION_ORDER.filter((t) => st.tens.includes(t)).map((t) => h('span', { class: 'chip r-tension' }, h('b', {}, t), ' ', M.spell(st.root, t)));
      info.append(
        h('div', { class: 'chord-title' },
          h('h3', {}, name),
          h('button', { type: 'button', class: 'btn btn-sm', onclick: playChord }, '♪ 들어보기')),
        h('div', { class: 'chips' }, tones, tens),
        h('ul', { class: 'tension-notes' },
          st.tens.length ? M.TENSION_ORDER.filter((t) => st.tens.includes(t)).map((t) =>
            h('li', {}, h('b', {}, t + ' = ' + M.spell(st.root, t) + ' : '), M.TENSION_INFO[t],
              c.avoid[t] ? h('span', { class: 'warn' }, ' ⚠ ' + c.avoid[t]) : null))
            : h('li', {}, '텐션 버튼을 눌러 9 · 11 · 13을 추가해 보세요. 코드톤 위(옥타브 위)에 쌓이는 음이 텐션입니다.')
        )
      );
    }

    function playChord() {
      const best = matchingVoicings()[0] || VOICINGS.find((v) => v.type === st.type && !v.tens.length);
      const r = realize(best, st.root);
      A.strum(r.midis, A.now() + 0.02);
    }

    function renderBoard() {
      const c = M.CHORDS[st.type];
      const rootPc = M.pcOf(st.root);
      let ivs;
      if (st.show === 'all') ivs = [...c.tones, ...st.tens];
      else if (st.show === 'tension') ivs = ['R', ...st.tens];
      else ivs = c.tones.filter((t) => t !== '5' && t !== 'b5').concat(st.tens);
      const bySemi = {};
      ivs.forEach((iv) => { bySemi[M.INTERVALS[iv].s] = iv; });
      const markers = [];
      for (let str = 1; str <= 6; str++) {
        for (let f = 0; f <= 15; f++) {
          const semi = (M.OPEN[str] + f - rootPc + 120) % 12;
          const iv = bySemi[semi];
          if (iv) {
            const name = M.spell(st.root, iv);
            markers.push({ string: str, fret: f, label: st.label === 'iv' ? iv : name, cls: roleOf(iv, st.type), title: `${iv} (${name})` });
          }
        }
      }
      U.fretboard(fbEl, { frets: 15, markers, onClick: (s, f) => A.pluck(M.OPEN[s] + f) });
    }

    function matchingVoicings() {
      return VOICINGS.filter((v) => v.type === st.type && st.tens.every((t) => v.tens.includes(t)))
        .sort((a, b) => (a.tens.length - st.tens.length) - (b.tens.length - st.tens.length));
    }

    function renderVoicings() {
      voicingWrap.innerHTML = '';
      voicingWrap.appendChild(h('h3', {}, '실전 보이싱 (' + chordName(st.root, st.type, st.tens) + ' 포함)'));
      const list = matchingVoicings();
      if (!list.length) {
        voicingWrap.appendChild(h('p', { class: 'muted' }, '이 텐션 조합의 기본 보이싱이 아직 없습니다. 위 지판에서 3·7음 + 텐션 모드로 직접 찾아보세요!'));
        return;
      }
      voicingWrap.appendChild(voicingGrid(list.map((v) => ({ v, root: st.root }))));
    }

    fbWrap.append(h('div', { class: 'card-head' }, h('h3', {}, '지판 위 텐션 위치'),
      h('div', { class: 'legend' },
        h('span', { class: 'lg r-root' }, 'R'), h('span', { class: 'lg r-third' }, '3음'),
        h('span', { class: 'lg r-fifth' }, '5음'), h('span', { class: 'lg r-seventh' }, '7음'),
        h('span', { class: 'lg r-tension' }, '텐션'))),
      fbEl, h('p', { class: 'muted small' }, '점을 클릭하면 소리가 납니다. 텐션 = 코드톤 위에 쌓는 음 (9 = 2도, 11 = 4도, 13 = 6도의 옥타브 위).'));

    root.append(h('div', { class: 'grid-2' }, controls, info), fbWrap, voicingWrap);
    render();
  }

  function voicingGrid(items) {
    return h('div', { class: 'voicing-grid' }, items.map(({ v, root, near, title }) => {
      const r = realize(v, root, near);
      const roles = r.labels.map((l) => (l ? roleOf(l, v.type) : ''));
      return h('div', { class: 'voicing' },
        h('div', { class: 'v-name' }, title || chordName(root, v.type, v.tens)),
        U.chordDiagram(r.frets, r.labels, roles),
        h('div', { class: 'v-tab' }, r.frets.map((f) => (f == null ? 'x' : f)).join(' ')),
        v.note ? h('div', { class: 'v-note' }, v.note) : null,
        h('button', { type: 'button', class: 'btn btn-sm', onclick: () => A.strum(r.midis, A.now() + 0.02) }, '♪ 재생'));
    }));
  }

  /* ================= 진행 속 텐션 ================= */
  const PROGRESSIONS = [
    {
      name: 'Ⅱ–Ⅴ–Ⅰ (기본 텐션)', desc: '재즈·CCM 모두의 기본. m9 → 13 → maj9로 텐션이 부드럽게 이어집니다.',
      chords: [{ deg: 2, v: 'm9_5' }, { deg: 7, v: '13_6' }, { deg: 0, v: 'maj9_5' }]
    },
    {
      name: 'Ⅱ–Ⅴ–Ⅰ (얼터드 텐션)', desc: 'Ⅴ7에 b9·b13을 넣어 긴장감을 키운 뒤 Ⅰ로 해결.',
      chords: [{ deg: 2, v: 'm11_6' }, { deg: 7, v: '7b9b13_6' }, { deg: 0, v: 'maj9_5' }]
    },
    {
      name: 'CCM Ⅳ–Ⅴsus–Ⅲm–Ⅵm', desc: '워십에서 아주 흔한 진행. Ⅴ를 9sus4로, 마이너는 m9·m11로 채색.',
      chords: [{ deg: 5, v: 'maj9_5' }, { deg: 7, v: '9sus4_5' }, { deg: 4, v: 'm11_6' }, { deg: 9, v: 'm9_5' }]
    },
    {
      name: 'Ⅰ–Ⅵm–Ⅱm–Ⅴ (턴어라운드)', desc: '실용음악 입시 단골 진행. 모든 코드에 9 또는 13을 얹어 연습.',
      chords: [{ deg: 0, v: 'maj13_6' }, { deg: 9, v: 'm9_5' }, { deg: 2, v: 'm9_6' }, { deg: 7, v: '9_13_5' }]
    },
    {
      name: 'Ⅳmaj7(#11) – Ⅰ', desc: '리디안 사운드로 몽환적인 엔딩. #11의 색을 귀로 익히기.',
      chords: [{ deg: 5, v: 'maj7s11_6' }, { deg: 0, v: 'maj9_13_5' }]
    },
    {
      name: 'Ⅱm7(b5) – Ⅴ7(#9) – Ⅰm9', desc: '마이너 키 Ⅱ–Ⅴ–Ⅰ. m7(b5)에 11, Ⅴ에 #9.',
      chords: [{ deg: 2, v: 'm7b5_11_5' }, { deg: 7, v: '7s9_5' }, { deg: 0, v: 'm9_5' }]
    }
  ];
  const pst = { key: 'C', idx: 0 };
  let progSeq = null;

  function mountProgression(root) {
    root.innerHTML = '';
    const head = h('div', { class: 'card controls' });
    const out = h('div', { class: 'card' });
    const tp = U.transport({ bpm: 70, onToggle: (p) => (p ? play() : stop()), trainer: false });

    function chordsFor() {
      const prog = PROGRESSIONS[pst.idx];
      const flat = M.prefersFlat(pst.key);
      let near = null;
      return prog.chords.map((c) => {
        const v = VBYID[c.v];
        const rootName = M.pcName(M.pcOf(pst.key) + c.deg, flat);
        const r = realize(v, rootName, near);
        const pos = { v, root: rootName, near: near == null ? null : near, r };
        near = r.center;
        return pos;
      });
    }

    function render() {
      head.innerHTML = '';
      head.append(
        U.field('키 (Key)', U.segmented(M.ROOTS, pst.key, (v) => { pst.key = v; renderOut(); }, 'wrap')),
        U.field('진행', U.select(PROGRESSIONS.map((p, i) => ({ value: String(i), label: p.name })), String(pst.idx), (v) => { pst.idx = +v; renderOut(); })),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, '진행 반복 재생 (코드당 1마디)'), tp.el)
      );
      renderOut();
    }

    function renderOut() {
      out.innerHTML = '';
      const prog = PROGRESSIONS[pst.idx];
      const items = chordsFor();
      out.append(h('h3', {}, prog.name + ' — Key of ' + pst.key), h('p', { class: 'muted' }, prog.desc));
      const grid = voicingGrid(items.map((it) => ({ v: it.v, root: it.root, near: it.near })));
      out.appendChild(grid);
      out.appendChild(h('p', { class: 'muted small' }, '연습 팁: 각 코드의 텐션 음(노란색)이 다음 코드의 어떤 음으로 움직이는지 따라가 보세요 (보이스 리딩).'));
    }

    function play() {
      U.claimPlayback(stop);
      tp.setPlaying(true);
      progSeq = new A.Sequencer({
        getBpm: () => tp.bpm,
        stepsPerBeat: () => 1,
        getLength: () => PROGRESSIONS[pst.idx].chords.length * 4,
        countIn: () => tp.countIn,
        onStep: (s, t) => {
          A.click(t, s % 4 === 0 ? 2 : 1);
          if (s % 4 === 0) {
            const it = chordsFor()[s / 4];
            if (it) A.strum(it.r.midis, t, { dur: 60 / tp.bpm * 4 });
          }
        },
        onVisual: (s) => {
          out.querySelectorAll('.voicing').forEach((el, i) => el.classList.toggle('current', s != null && s >= 0 && Math.floor(s / 4) === i));
        }
      });
      progSeq.start();
    }
    function stop() {
      if (progSeq) progSeq.stop();
      progSeq = null;
      tp.setPlaying(false);
      U.releasePlayback(stop);
    }

    root.append(head, out);
    render();
  }

  /* ================= 텐션 퀴즈 ================= */
  const qst = { mode: 'name', types: ['maj7', 'm7', 'dom7'], score: 0, total: 0, q: null, answered: false };

  function mountQuiz(root) {
    root.innerHTML = '';
    const head = h('div', { class: 'card controls' });
    const body = h('div', { class: 'card quiz' });

    function newQ() {
      const type = M.pick(qst.types);
      const c = M.CHORDS[type];
      const t = M.pick(c.tensions.filter((x) => !c.avoid[x]));
      const rootName = M.pick(M.ROOTS);
      qst.q = { type, t, root: rootName, answer: M.spell(rootName, t) };
      qst.answered = false;
      renderQ();
    }

    function renderHead() {
      head.innerHTML = '';
      head.append(
        h('div', { class: 'row-fields' },
          U.field('퀴즈 방식', U.segmented([
            { value: 'name', label: '음이름 맞히기' },
            { value: 'board', label: '지판에서 찾기' }
          ], qst.mode, (v) => { qst.mode = v; newQ(); })),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, '출제 코드'),
            h('div', { class: 'checks' }, Object.entries(M.CHORDS).map(([k, v]) =>
              h('label', { class: 'check' }, h('input', {
                type: 'checkbox', checked: qst.types.includes(k) || null,
                onchange: (e) => {
                  qst.types = e.target.checked ? qst.types.concat(k) : qst.types.filter((x) => x !== k);
                  if (!qst.types.length) qst.types = ['maj7'];
                }
              }), ' ' + v.sym))))
        ));
    }

    function renderQ() {
      body.innerHTML = '';
      const { q } = qst;
      const fb = h('div', { class: 'quiz-feedback' });
      body.append(
        h('div', { class: 'quiz-score' }, `점수 ${qst.score} / ${qst.total}`),
        h('div', { class: 'quiz-q' }, h('span', { class: 'big' }, q.root + M.CHORDS[q.type].sym), ' 의 ', h('span', { class: 'big accent' }, q.t), qst.mode === 'name' ? ' 는?' : ' 을 지판에서 찾아 클릭!')
      );
      if (qst.mode === 'name') {
        const flat = M.prefersFlat(q.root);
        const pcs = new Set([M.pcOf(q.answer)]);
        const opts = [q.answer];
        const pool = M.shuffle([...Array(12).keys()]);
        for (const pc of pool) {
          if (opts.length >= 4) break;
          if (!pcs.has(pc)) { pcs.add(pc); opts.push(M.pcName(pc, flat)); }
        }
        body.appendChild(h('div', { class: 'quiz-opts' }, M.shuffle(opts).map((o) =>
          h('button', {
            type: 'button', class: 'btn quiz-opt',
            onclick: (e) => answer(M.pcOf(o) === M.pcOf(q.answer), e.target, fb)
          }, o))));
      } else {
        const fbEl = h('div', { class: 'fb-scroll' });
        const rootPc = M.pcOf(q.root);
        const marks = [];
        const draw = (extra) => U.fretboard(fbEl, {
          frets: 15, markers: marks.concat(extra || []),
          onClick: (s, f) => {
            if (qst.answered) return;
            A.pluck(M.OPEN[s] + f);
            const ok = (M.OPEN[s] + f) % 12 === M.pcOf(q.answer);
            marks.push({ string: s, fret: f, label: ok ? '✓' : '✗', cls: ok ? 'r-ok' : 'r-bad' });
            answer(ok, null, fb, () => {
              const all = [];
              for (let st2 = 1; st2 <= 6; st2++) for (let f2 = 0; f2 <= 15; f2++) {
                const semi = (M.OPEN[st2] + f2 - rootPc + 120) % 12;
                if (semi === 0) all.push({ string: st2, fret: f2, label: 'R', cls: 'r-root' });
                if ((M.OPEN[st2] + f2) % 12 === M.pcOf(q.answer)) all.push({ string: st2, fret: f2, label: q.t, cls: 'r-tension' });
              }
              draw(all);
            });
          }
        });
        draw();
        body.appendChild(fbEl);
      }
      body.append(fb, h('button', { type: 'button', class: 'btn btn-primary', onclick: newQ }, '다음 문제 →'));
    }

    function answer(ok, btn, fb, after) {
      if (qst.answered) return;
      qst.answered = true;
      qst.total++;
      if (ok) qst.score++;
      const { q } = qst;
      if (btn) btn.classList.add(ok ? 'ok' : 'bad');
      body.querySelectorAll('.quiz-opt').forEach((b) => { if (M.pcOf(b.textContent) === M.pcOf(q.answer)) b.classList.add('ok'); });
      fb.className = 'quiz-feedback ' + (ok ? 'ok' : 'bad');
      fb.textContent = (ok ? '정답! ' : '아쉬워요. ') + `${q.root}${M.CHORDS[q.type].sym}의 ${q.t} = ${q.answer}`;
      body.querySelector('.quiz-score').textContent = `점수 ${qst.score} / ${qst.total}`;
      if (after) after();
      // 정답 음과 코드를 함께 들려줌
      const v = VOICINGS.find((x) => x.type === q.type && x.tens.includes(q.t)) || VOICINGS.find((x) => x.type === q.type);
      const r = realize(v, q.root);
      A.strum(r.midis, A.now() + 0.05);
    }

    root.append(head, body);
    renderHead();
    newQ();
  }

  return { mountExplorer, mountProgression, mountQuiz, VOICINGS, realize, chordName };
})();
